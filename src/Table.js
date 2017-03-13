import React from "react";
import Element from "./Element";

export default class Table extends Element {
  type = 'table';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: false,
    rowPadding: 0
  });
  
  componentDidUpdate(prevProps, prevState) {
    if (prevState.rowHeights !== this.state.rowHeights) {
      this.applyTransformation();
    }

    super.componentDidUpdate(prevProps, prevState);
  }

  childSizeChanged() {
    let heights = this.state.rowHeights || Immutable({});
    let lastPos = 0;
    let height = 0;
    this.rowContainer.childNodes.forEach((row, i) => {
      if (row) {
        height = row.getBBox().height;
        heights = heights.set(`rowY${i}`, lastPos);
        lastPos += height + this.props.rowPadding;
      }
    });
    this.setState({rowHeights: heights});
  }

  handleRowContainer = (ref) => {
    this.rowContainer = ref;
  };

  renderChildren() {
    let children = this.props.children;
    if (!(children instanceof Array)) {
      children = [children];
    }
    const heights = this.state.rowHeights || {};
    return <g ref={this.handleRowContainer}>
      {children.map((child, i) => (
        <g
          key={child.id || i}
          transform={`translate(0, ${heights[`rowY${i}`] || 0})`}
        >{child}</g>)
      )}
    </g>
  }

}
