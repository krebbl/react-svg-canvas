import React from "react";
import Element from "./Element";

export default class Table extends Element {
  type = 'table';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: false,
    rowPadding: 10
  });

  constructor(props, context) {
    super(props, context);

    this.rows = [];
  }

  childSizeChanged() {
    const heights = {};
    let lastPos = 0;
    let height = 0;
    this.rows.forEach((row, i) => {
      if (row) {
        height = row.getBBox().height;
        heights[`rowY${i}`] = lastPos;
        lastPos += height + this.props.rowPadding;
      }
    });
    this.setState(heights);
    super.childSizeChanged();
  }

  renderChildren() {
    let children = this.props.children;
    if (!(children instanceof Array)) {
      children = [children];
    }
    return children.map((child, i) => (
      <g
        key={i} ref={(ref) => { this.rows[i] = ref; }}
        transform={`translate(0, ${this.state[`rowY${i}`] || 0})`}
      >{child}</g>)
    );
  }

}
