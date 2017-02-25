import React, {PropTypes} from 'react';
import Element from 'react-svg-canvas/Element';

const style = {cursor: 'default'};
export default class FontIcon extends Element {
  type = 'font-icon';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: true
  });

  static propTypes = {
    font: PropTypes.string,
    icon: PropTypes.string,
    size: PropTypes.number
  };

  renderChildren() {
    return <text fontFamily={this.props.font} key={this.props.size} style={style} dy="0.35em" fontSize={this.props.size} fill={this.props.fill} textAnchor="middle">{this.props.icon}</text>
  }

}
