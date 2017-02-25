import React from "react";
import Element from "./Element";

export default class Table extends Element {
  type = 'table';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: false,
    rowPadding: 0
  });

  constructor(props, context) {
    super(props, context);
  }

  childSizeChanged() {
    const heights = {};
    let lastPos = 0;
    let height = 0;
    this.rowContainer.childNodes.forEach((row, i) => {
      if (row) {
        height = row.getBBox().height;
        heights[`rowY${i}`] = lastPos;
        lastPos += height + this.props.rowPadding;
      }
    });
    this.setState(heights);
    super.childSizeChanged();
  }

  handleRowContainer = (ref) => {
    this.rowContainer = ref;
  };

  renderChildren() {
    let children = this.props.children;
    if (!(children instanceof Array)) {
      children = [children];
    }
    return <g ref={this.handleRowContainer}>
      {children.map((child, i) => (
        <g
          key={child.id || i}
          transform={`translate(0, ${this.state[`rowY${i}`] || 0})`}
        >{child}</g>)
      )}
    </g>
  }

}
