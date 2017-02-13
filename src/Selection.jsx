import React, {PropTypes} from "react";
import Draggable from "./Draggable";

const innerSelectionStyle = {pointerEvents: 'none'};

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

const knobs = [
  {
    type: 'right',
    direction: {x: 1, y: 0},
    pos: {x: 1, y: 0.5}
  },
  {
    type: 'left',
    direction: {x: -1, y: 0},
    pos: {x: 0, y: 0.5}
  },
  {
    type: 'top',
    direction: {x: 0, y: -1},
    pos: {x: 0.5, y: 0}
  },
  {
    type: 'bottom',
    direction: {x: 0, y: 1},
    pos: {x: 0.5, y: 1}
  }
];

export default class Selection extends React.Component {

  static propTypes = {
    selection: PropTypes.object
  };

  static defaultProps = {
    selection: null
  };

  static contextTypes = {
    zoom: PropTypes.number,
    slide: PropTypes.object,
    api: PropTypes.object
  };

  handleStartDrag = (e) => {
    this.activeKnob = e.target.props.knob;
    this.lastPoint = e.startPoint;
    this.knobPoint = this.context.slide.svgRoot.createSVGPoint();
    this.rootPoint = this.context.slide.svgRoot.createSVGPoint();
    this.scalePoint = this.context.slide.svgRoot.createSVGPoint();
    e.nativeEvent.stopPropagation();
  };

  handleDrag = (e) => {
    const activeKnob = this.activeKnob;
    this.knobPoint.x = activeKnob.direction.x * 100;
    this.knobPoint.y = activeKnob.direction.y * 100;
    this.rootPoint.x = 0;
    this.rootPoint.y = 0;
    const tp = this.knobPoint.matrixTransform(this.props.selection.matrix);
    const rp = this.rootPoint.matrixTransform(this.props.selection.matrix);
    this.scalePoint.x = e.point.x - this.lastPoint.x;
    this.scalePoint.y = e.point.y - this.lastPoint.y;
    tp.x -= rp.x;
    tp.y -= rp.y;
    // console.log(tp.x, tp.y);
    const proj = mult(dot(tp, this.scalePoint) / (value(tp) ** 2), tp);
    const res = proj.matrixTransform(this.props.selection.matrix.inverse());
    const r = this.rootPoint.matrixTransform(this.props.selection.matrix.inverse());
    res.x = res.x - r.x;
    res.y = res.y - r.y;
    // console.log(res.x - r.x, res.y - r.y);
    this.context.api.selectedNode.processKnobChange(activeKnob.type, res);
    this.lastPoint = e.point;
  };

  handleDragEnd = (e) => {
    e.nativeEvent.stopPropagation();
  };

  render() {
    const {selection} = this.props;
    if (!selection || !selection.show) return null;
    return (<g transform={selection.transform}>
      <g style={innerSelectionStyle}>
        <rect
          width={selection.width}
          height={selection.height}
          fill="transparent"
        />
      </g>
      {selection.editor}
      <g style={innerSelectionStyle}>
        <rect
          width={selection.width} height={selection.height} fill="transparent"
          vectorEffect="non-scaling-stroke"
          stroke="blue" strokeWidth="0.5"
        />
      </g>
      <g>
        {knobs.filter(k => selection.knobs.indexOf(k.type) > -1).map((knob) => {
          return (<Draggable
            key={knob.type}
            onDragStart={this.handleStartDrag}
            onDrag={this.handleDrag}
            onDragEnd={this.handleDragEnd}
            knob={knob}
          >
            <g>
              <circle
                cx={selection.width * knob.pos.x}
                cy={selection.height * knob.pos.y}
                r={10} fill="transparent"
              />
              <circle
                cx={selection.width * knob.pos.x}
                cy={selection.height * knob.pos.y}
                r={8} fill="white"
              />
              <circle
                cx={selection.width * knob.pos.x}
                cy={selection.height * knob.pos.y}
                r={6} fill="blue"
              />
            </g>
          </Draggable>);
        })}
      </g>
    </g>);
  }
}
