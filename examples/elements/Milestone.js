import React from 'react';
import Element from 'react-svg-canvas/Element';
import Text from 'react-svg-canvas/Text';
import Table from 'react-svg-canvas/Table';
import FontIcon from './FontIcon';

export default class Milestone extends Element {
  type = 'timeline-milestone';
  isGroup = true;

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: true,
    rotate: 0,
    milestones: [],
    hoverOnBBox: false
  });

  static childrenTypes = {
    milestones: Text,
    labelProps: Text,
    titleProps: Text,
    contentProps: Text,
    iconProps: FontIcon
  };

  static defaultDataProps = {
    height: -260,
    milestones: [
      {
        text: 'foo'
      },
      {
        text: 'bar'
      }
    ],
    iconProps: {
      font: 'FontAwesome',
      icon: '\uf135'
    },
    labelProps: {
      text: '2017',
      width: 100
    },
    titleProps: {
      text: 'My Title'
    },
    contentProps: {
      text: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dol'
    }
  };

  processChange(key, value, trigger) {
    super.processChange(key, value, trigger);
  }

  renderKnobs() {
    const ret = super.renderKnobs();
    ret.shift();

    return ret;
  }

  handleSizeChange = (ref) => {
    const textHeight = ref.actualHeight();
    if (this.state.textHeight !== textHeight) {
      this.setState({
        textHeight
      });
    }
  };

  handleClick = () => {
    this.updateProp('labelProps', Object.assign({}, this.props.labelProps, {text: 'Hello World'}));
    this.dataChanged();
  };

  renderChildren() {
    const bigCircleRadius = 24;
    const smallCircleColor = this.props.color;
    const clipId = `milestoneClip_${this.props._id}`;
    return (<g ref={this.handleBBoxRef}>
      <g transform={`translate(0,${this.props.height + 10})`}>
        <Text
          {...this.props.labelProps}
          movable={false}
          scalable={false}
          textAlign="center"
          fontSize={12}
          x={-50}
          fill={smallCircleColor}
          onSizeChange={this.handleSizeChange}
        />
        <g transform={`translate(0, ${this.state.textHeight || 12})`}>
          <line x1="0" x2="0" y1={10} y2={100 - bigCircleRadius + 10} stroke="gray" strokeWidth="1" />
          <circle r={bigCircleRadius} stroke="gray" strokeWidth="1" cy={100 + 10} fill="transparent" />
          <FontIcon {...this.props.iconProps} movable={false} y={100 + 10} size={26} fill={smallCircleColor} />

          <line
            x1="0" x2="0"
            y1={100 + bigCircleRadius + 10}
            y2={-this.props.height - (this.state.textHeight || 12)}
            stroke="gray" strokeWidth="1"
          />
          <circle r="4" fill="gray" cy={10} />
        </g>
      </g>
      <circle r="13" fill="white" stroke="gray" strokeWidth="1" />
      <circle fill={smallCircleColor} r="11" />
      <Table y={this.props.height + (12 * 4) + 10} x={40} rowPadding={5}>
        <Text
          {...this.props.titleProps}
          maxWidth={200}
          movable={false}
          scalable={false} textAlign="left"
          fontSize={14} background={this.context.slide.background}
        />
        <Text
          {...this.props.contentProps}
          maxWidth={200}
          movable={false}
          scalable={false} textAlign="left"
          fontSize={12} background={this.context.slide.background}
        />
      </Table>
    </g>);
  }
}
