import React, {PropTypes} from 'react';
import Draggable from './Draggable';

export default class Knob extends React.Component {

  static propTypes = {
    onChange: PropTypes.func,
    onDone: PropTypes.func,
    inner: PropTypes.node
  };

  static defaultProps = {
    x: 0,
    y: 0
  };

  static contextTypes = {
    matrix: PropTypes.object
  };

  handleStartDrag = () => {
    document.activeElement.blur();
  };

  handleDrag = (e) => {
    this.props.onChange && this.props.onChange(this, e.relativePoint);
  };

  handleDragEnd = (e) => {
    e.nativeEvent.stopPropagation();
    this.props.onDone && this.props.onDone();
  };

  render() {
    const {matrix} = this.context;
    const f = Math.sqrt((matrix.a ** 2) + (matrix.b ** 2));

    const knob = this.props.inner || (<g>
      <circle r={8} fill="transparent" />
      <circle r={6} fill="white" />
      <circle r={4} fill="#3a7ed2" />
    </g>);
    return (<Draggable
      onDragStart={this.handleStartDrag}
      onDrag={this.handleDrag}
      onDragEnd={this.handleDragEnd}
      freezeCursor
    >
      <g transform={`scale(${1 / f}, ${1 / f})`}>
        {knob}
      </g>
    </Draggable>);
  }
}
