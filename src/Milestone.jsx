import React from "react";
import Element from "./Element";
import Text from "./Text";
import Table from "./Table";

export default class MilestoneAsArrow extends Element {
  type = 'milestone';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: true,
    rotate: 0,
    milestones: []
  });

  static childrenTypes = {
    milestones: Text,
    labelProps: Text
  };

  static defaultDataProps = {
    milestones: [
      {
        text: 'foo'
      },
      {
        text: 'bar'
      }
    ],
    labelProps: {
      text: 'whatever',
      width: 200
    }
  };

  getForm() {
    return [{
      type: 'number',
      key: 'width',
      title: 'Width'
    }, {
      type: 'number',
      key: 'rotate',
      title: 'Rotation'
    }];
  }

  handleClick = () => {
    this.updateProp('labelProps', Object.assign({}, this.props.labelProps, { text: 'Hello World' }));
    this.dataChanged();
  };

  renderChildren() {
    const colWidth = this.props.width / this.props.milestones.length;
    return (<g>
      <Table>
        <Text
          {...this.props.labelProps}
          selectable
          movable={false}
          moveDelegate={this}
          textAlign="center"
        />
        <Text
          width={this.props.labelProps.width}
          text="Should move"
          selectable={false}
          movable={false}
          moveDelegate={this}
          scalable={false}
          textAlign="center"
        />
        <Text
          width={this.props.labelProps.width}
          fontSize={30}
          text="Should also move"
          selectable={false}
          movable={false}
          scalable={false}
          textAlign="center"
        />
      </Table>
      <rect></rect>
      <g onClick={this.handleClick}>
        <circle cx={100} cy={50} r={10} fill="red" />
      </g>
      {this.props.milestones.map((m, i) => <g key={m._id} transform={`translate(${colWidth * i}, 0)`}>
        <Text {...m} selectable scalable={false} movable={false} moveDelegate={this} width={colWidth} y={this.props.height * 0.5} verticalAlign="middle"/>
      </g>)}
    </g>);
  }
}
