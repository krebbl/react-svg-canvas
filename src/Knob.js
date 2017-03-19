import React, {PropTypes} from 'react';
import Draggable from './Draggable';

export default class Knob extends React.Component {

  static propTypes = {
    onChange: PropTypes.func,
    onDone: PropTypes.func,
    onStart: PropTypes.func,
    inner: PropTypes.node
  };

  static defaultProps = {
    x: 0,
    y: 0
  };

  static contextTypes = {
    api: PropTypes.object,
    matrix: PropTypes.object
  };

  handleStartDrag = (e) => {
    document.activeElement.blur();
    e.nativeEvent.preventDefault();
    this.context.api.startChange();
    this.props.onStart && this.props.onStart();
  };

  handleDrag = (e) => {
    this.props.onChange && this.props.onChange(this, e.relativePoint);
  };

  handleDragEnd = (e) => {
    e.nativeEvent.stopPropagation();
    this.context.api.finishChange();
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
