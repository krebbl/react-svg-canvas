import React, {PropTypes} from 'react';
import Draggable from './Draggable';

function dot(p1, p2) {
  return (p1.x * p2.x) + (p1.y * p2.y);
}

function value(p) {
  return Math.sqrt((p.x ** 2) + (p.y ** 2));
}

function mult(val, p) {
  p.x *= val;
  p.y *= val;
  return p;
}

const DIRECTION_MAPPING = {
  t: [0, -1],
  b: [0, 1],
  r: [1, 0],
  l: [-1, 0]
};

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

  handleStartDrag = (e) => {
    this.lastPoint = e.startPoint;
    const svgRoot = this.node.ownerSVGElement;
    this.matrix = this.node.getCTM();
    this.knobPoint = svgRoot.createSVGPoint();
    this.rootPoint = svgRoot.createSVGPoint();
    this.scalePoint = svgRoot.createSVGPoint();
    e.nativeEvent.stopPropagation();
  };

  handleDrag = (e) => {
    const dir = DIRECTION_MAPPING[this.props.dir];
    this.knobPoint.x = dir[0] * 100;
    this.knobPoint.y = dir[1] * 100;
    this.rootPoint.x = 0;
    this.rootPoint.y = 0;
    const tp = this.knobPoint.matrixTransform(this.matrix);
    const rp = this.rootPoint.matrixTransform(this.matrix);
    this.scalePoint.x = e.point.x - this.lastPoint.x;
    this.scalePoint.y = e.point.y - this.lastPoint.y;
    tp.x -= rp.x;
    tp.y -= rp.y;
    // console.log(tp.x, tp.y);
    const proj = mult(dot(tp, this.scalePoint) / (value(tp) ** 2), tp);
    const res = proj.matrixTransform(this.matrix.inverse());
    const r = this.rootPoint.matrixTransform(this.matrix.inverse());
    res.x = res.x - r.x;
    res.y = res.y - r.y;
    // console.log(res.x - r.x, res.y - r.y);
    this.props.onChange && this.props.onChange(this, this.props.dir, res);
    this.lastPoint = e.point;
  };

  handleDragEnd = (e) => {
    e.nativeEvent.stopPropagation();
  };

  renderInner() {
    return <g>
      <circle
        r={10} fill="transparent"
      />
      <circle
        r={8} fill="white"
      />
      <circle
        r={6} fill="blue"
      />
    </g>;
  }

  handleRef = (ref) => {
    this.node = ref;
  }

  render() {
    return (<Draggable
      onDragStart={this.handleStartDrag}
      onDrag={this.handleDrag}
      onDragEnd={this.handleDragEnd}
    >
      <g ref={this.handleRef} transform={`translate(${this.props.x}, ${this.props.y})`}>
        {this.renderInner()}
      </g>
    </Draggable>);
  }
}
