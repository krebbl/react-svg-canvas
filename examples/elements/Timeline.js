import React from 'react';
import Element from 'react-svg-canvas/Element';
import Text from 'react-svg-canvas/Text';
import Table from 'react-svg-canvas/Table';
import Milestone from './Milestone';

export default class Timeline extends Element {
  type = 'timeline';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: true,
    milestones: [],
    resizable: false,
    movable: false
  });

  static childrenTypes = {
    milestones: Milestone
  };

  static defaultDataProps = {};

  processChange(key, value, trigger) {
    super.processChange(key, value, trigger);
  }

  getForm() {
    return [];
  }

  renderChildren() {
    const milestones = [].concat(this.props.milestones).sort(function(a, b){
      if(a.x === b.x) {
        return 0;
      }
      if(a.x > b.x) {
        return -1;
      }
      return 1;
    });
    return (<g ref={this.handleBBoxRef}>
      <line x1={0} x2={this.props.width} y1={0} y2={0} stroke="gray" strokeWidth="2"/>
      {milestones.map(m => <Milestone key={m._id} {...m} y={0} />)}
    </g>);
  }
}
