import React, {PropTypes} from "react";
import Element from "./Element";
import shallowequal from 'shallowequal';

class TableRenderer extends React.Component {
  static type = "table";

  static propTypes = {
    rowPadding: PropTypes.number
  };

  static defaultProps = {
    rowPadding: 2
  };

  state = {
    rowHeights: Immutable({})
  };

  componentDidUpdate(prevProps, prevState) {
    if (!shallowequal(prevState.rowHeights, this.state.rowHeights) || prevState.totalHeight !== this.state.totalHeight) {
      this.props._wrapper.applyTransformation(false);
    } else {
      this.checkChildSizes();
    }
  }

  onChildSizeChanged() {
    this.checkChildSizes();
  }

  componentDidMount() {
    this.checkChildSizes();
  }

  checkChildSizes() {
    let heights = this.state.rowHeights || Immutable({});
    let lastPos = 0;
    let height = 0;
    let totalHeight = 0;
    this.rowContainer.childNodes.forEach((row, i) => {
      if (row) {
        let bbox;
        if (row.firstChild && row.firstChild.classList.contains('vizzlo-element')) {
          const bboxNode = row.firstChild.firstChild;
          bbox = bboxNode ? bboxNode.getBBox() : row.getBBox();
        } else {
          bbox = row.getBBox();
        }
        height = bbox.height;
        heights = heights.set(`rowY${i}`, lastPos);
        lastPos += height + this.props.rowPadding;
        totalHeight += height + (i > 0 ? this.props.rowPadding : 0);
      }
    });
    if (this.state.rowHeights !== heights || totalHeight !== this.state.totalHeight) {
      this.setState({rowHeights: heights, totalHeight});
    }
  }

  handleRowContainer = (ref) => {
    this.rowContainer = ref;
  };

  render() {
    let children = this.props.children;
    if (!(children instanceof Array)) {
      children = [children];
    }
    const heights = this.state.rowHeights || {};
    return <g ref={this.handleRowContainer}>
      {children.map((child, i) =>
        child ? <g key={child.props.id || child.props.childKey || i}
                   transform={`translate(0, ${heights[`rowY${i}`] || 0})`}
        >{child}</g> : null
      )}
    </g>
  }
}

class RowRenderer extends React.Component {
  state = {
    colWidths: Immutable({})
  };

  static type = "row";

  static propTypes = {
    colPadding: PropTypes.number
  };

  static defaultProps = {
    colPadding: 2
  };

  checkChildSizes() {
    let widths = this.state.colWidths || Immutable({});
    let lastPos = 0;
    let width = 0;
    this.rowContainer.childNodes.forEach((row, i) => {
      if (row) {
        let bbox;
        if (row.firstChild && row.firstChild.classList.contains('vizzlo-element')) {
          const bboxNode = row.firstChild.firstChild;
          bbox = bboxNode ? bboxNode.getBBox() : row.getBBox();
        } else {
          bbox = row.getBBox();
        }
        width = bbox.width;
        widths = widths.set(`colX${i}`, lastPos);
        lastPos += width + this.props.colPadding;
      }
    });
    if (this.state.colWidths !== widths) {
      this.setState({colWidths: widths});
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!shallowequal(prevState.colWidths, this.state.colWidths)) {
      this.props._wrapper.applyTransformation();
    } else {
      this.checkChildSizes();
    }
  }

  componentDidMount() {
    this.checkChildSizes();
  }

  onChildSizeChanged() {
    this.checkChildSizes();
  }

  handleRowContainer = (ref) => {
    this.rowContainer = ref;
  };

  render() {
    let children = this.props.children;
    if (!(children instanceof Array)) {
      children = [children];
    }
    const widths = this.state.colWidths || {};
    return <g ref={this.handleRowContainer}>
      {children.map((child, i) => (
        <g
          key={child.props.id || child.props.childKey || i}
          transform={`translate(${widths[`colX${i}`] || 0}, 0)`}
        >{child}</g>)
      )}
    </g>
  }
}
export default Element.createClass(TableRenderer, {selectable: false});
export const Row = Element.createClass(RowRenderer, {selectable: false});
