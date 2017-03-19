import React, {PropTypes} from 'react';
import Knob from './Knob';

export default class ScaleKnob extends React.Component {

  static propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    onChange: PropTypes.func,
    dir: PropTypes.string
  };

  static defaultProps = {
    x: 0,
    y: 0
  };

  handleDrag = (knob, relativePoint) => {
    this.props.onChange && this.props.onChange(this, this.props.dir, relativePoint);
  };

  render() {
    return (<g transform={`translate(${this.props.x}, ${this.props.y})`}>
      <Knob onChange={this.handleDrag} />
    </g>);
  }
}
