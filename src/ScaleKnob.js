import React, {PropTypes} from 'react';
import Draggable from './Draggable';

export default class ScaleKnob extends React.Component {

  static propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    onChange: PropTypes.func,
    onDone: PropTypes.func,
    dir: PropTypes.string
  };

  static defaultProps = {
    x: 0,
    y: 0
  };

  static contextTypes = {
    zoom: PropTypes.number,
    matrix: PropTypes.object
  };

  handleStartDrag = (e) => {
    e.nativeEvent.stopPropagation();
    document.activeElement.blur();
  };

  handleDrag = (e) => {
    this.props.onChange && this.props.onChange(this, this.props.dir, e.relativePoint);
  };

  handleDragEnd = (e) => {
    e.nativeEvent.stopPropagation();
    this.props.onDone && this.props.onDone();
  };

  renderInner() {
    const {matrix} = this.context;
    const f = Math.sqrt((matrix.a ** 2) + (matrix.b ** 2));
    return <g ref={this.handleRef}>
      <circle
        r={8 / f} fill="transparent"
      />
      <circle
        r={6 / f} fill="white"
      />
      <circle
        r={4 / f} fill="#3a7ed2"
      />
    </g>;
  }

  handleRef = (ref) => {
    this.node = ref;
  };

  render() {
    return (<g transform={`translate(${this.props.x}, ${this.props.y})`}>
      <Draggable
        onDragStart={this.handleStartDrag}
        onDrag={this.handleDrag}
        onDragEnd={this.handleDragEnd}
        freezeCursor
      >
        <g>
          {this.renderInner()}
        </g>
      </Draggable></g>);
  }
}
