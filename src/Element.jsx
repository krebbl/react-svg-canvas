import React, {PropTypes} from "react";
import objectDiff from "object-diff";
import shallowequal from "shallowequal";

export default class Element extends React.Component {

  state = {
    bboxX: 0,
    bboxY: 0,
    moving: false
  };

  static propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    rotate: PropTypes.number,
    children: PropTypes.node,
    movable: PropTypes.bool,
    selectable: PropTypes.bool,
    scalable: PropTypes.bool,
    bindProps: PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.array
    ]),
    onChange: PropTypes.func
  };

  static defaultProps = {
    x: 0,
    y: 0,
    rotate: 0,
    selectable: true,
    scalable: true,
    movable: true,
    onChange: null
  };

  type = 'core';

  static contextTypes = {
    api: PropTypes.object,
    slide: PropTypes.object,
    parentElement: PropTypes.object
  };

  static childContextTypes = {
    parentElement: PropTypes.object
  };

  getChildContext() {
    return {
      parentElement: this
    };
  }

  constructor(props, context) {
    super(props, context);
    this.firstRender = true;
    this.id = props._id;
  }

  updateProp(key, value) {
    this.context.api.updateElement(this.id, key, value);
  }

  dataChanged() {
    this.context.api.dataChanged();
  }

  getKnobs() {
    if (!this.props.scalable) {
      return [];
    }
    const knobs = [];
    if (this.props.width != null) {
      knobs.push('left', 'right');
    }
    if (this.props.height != null) {
      knobs.push('top', 'bottom');
    }
    return knobs;
  }

  getSelection() {
    const svgRoot = this.context.slide.selections;
    const node = this.bboxNode;
    const val = svgRoot.getCTM().inverse().multiply(node.getCTM());

    return {
      x: this.state.bboxX,
      y: this.state.bboxY,
      width: Math.ceil(this.props.width || this.state.width || 0),
      height: Math.ceil(this.props.height || this.state.height || 0),
      matrix: val,
      transform: `matrix(${[val.a, val.b, val.c, val.d, val.e, val.f].join(',')})`,
      type: this.type,
      id: this.id,
      editor: this.createEditor(),
      form: this.getForm(),
      knobs: this.getKnobs(),
      show: !this.state.moving
    };
  }

  createEditor() {
    return null;
  }

  getForm() {
    return [];
  }

  renderChildren() {
    return this.props.children;
  }

  componentDidUpdate(prevProps, prevState) {
    if (!shallowequal(prevProps, this.props)) {
      const diff = objectDiff(prevProps, this.props);
      const diffKeys = Object.keys(diff).join('');
      if (/^(x|y|xy|yx)$/.test(diffKeys)) {
        this.applyBBox(true);
      } else {
        this.applyTransformation(prevProps.rotate !== this.props.rotate || prevProps.x !== this.props.x || prevProps.y !== this.props.y);
      }
    } else {
      const sizeChanged = this.state.width !== prevState.width || this.state.height !== prevState.height
        || this.state.bboxX !== prevState.bboxX || this.state.bboxY !== prevState.bboxY;
      if (sizeChanged) {
        this.notifyParent();
      }
    }
    if (prevState.moving !== this.state.moving) {
      this.context.api.selectionChanged();
    }
  }

  componentDidMount() {
    this.applyTransformation(true);
  }

  applyBBox(positionChanged) {
    const bbox = this.calcBBox();
    if (!bbox) return;
    const width = this.props.width != null ? this.props.width : bbox.width;
    const height = this.props.height != null ? this.props.height : bbox.height;
    const x = this.props.width == null ? bbox.x : 0;
    const y = this.props.height == null ? bbox.y : 0;
    const sizeChanged = this.state.width !== width || this.state.height !== height
      || this.state.bboxX !== x || this.state.bboxY !== y;
    if (sizeChanged) {
      this.setState({
        bboxX: x,
        bboxY: y,
        width,
        height
      });
    } else if (positionChanged) {
      this.notifyParent();
    }
  }

  applyTransformation(positionChanged) {
    if (this.props.width == null || this.props.height == null) {
      setTimeout(() => {
        this.firstRender = false;
        this.applyBBox(positionChanged);
      }, this.firstRender ? 400 : 10);
    } else {
      this.applyBBox(positionChanged);
    }
  }

  calcBBox() {
    const node = this.contentNode;
    if (!node) return null;
    return node.getBBox();
  }

  calcTransform(x, y, width, height, rotate) {
    let transform = '';
    transform += `translate(${x}, ${y})`;
    if (this.props.rotate && height != null && width != null) {
      transform += ` rotate(${rotate}, ${width * 0.5}, ${height * 0.5})`;
    }
    return transform;
  }

  svgRoot() {
    return this.context.slide.svgRoot;
  }

  calcNewPosition(x = 0, y = 0, xDiff = 0, yDiff = 0) {
    const width = this.props.width || this.state.width || 0;
    const height = this.props.height || this.state.height || 0;
    const transform = this.svgRoot().createSVGTransform();
    transform.setRotate(this.props.rotate, 0, 0);
    let point = this.svgRoot().createSVGPoint();
    point.x = x - ((width + xDiff) * 0.5);
    point.y = y - ((height + yDiff) * 0.5);
    point = point.matrixTransform(transform.matrix);
    let oldPoint = this.svgRoot().createSVGPoint();
    oldPoint.x = x - (width * 0.5);
    oldPoint.y = y - (height * 0.5);
    let fx = oldPoint.x < 0 ? 1 : -1;
    let fy = oldPoint.y < 0 ? 1 : -1;
    oldPoint = oldPoint.matrixTransform(transform.matrix);

    return {
      x: this.props.x + ((fx * (oldPoint.x - point.x)) - (xDiff * 0.5)),
      y: this.props.y + ((fy * (oldPoint.y - point.y)) - (yDiff * 0.5))
    };
  }

  processKnobChange(knob, diffVector) {
    let np;
    switch (knob) {
      case 'bottom':
        np = this.calcNewPosition(0, 0, 0, diffVector.y);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', this.props.height + diffVector.y, true);
        break;
      case 'top':
        np = this.calcNewPosition(this.props.width, this.props.height, 0, -diffVector.y);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', this.props.height - diffVector.y, true);
        break;
      case 'left':
        np = this.calcNewPosition(this.props.width, this.props.height, -diffVector.x, 0);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', this.props.width - diffVector.x, true);
        break;
      case 'right':
        np = this.calcNewPosition(0, 0, diffVector.x, 0);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', this.props.width + diffVector.x, true);

        break;
      default:
        break;
    }
  }

  processChange(key, value, trigger = true) {
    if (this.id) {
      if (key === 'rotate') {
        value = value % 360;
      }
      this.context.api.updateElement(this.id, key, value);
      if (trigger) {
        this.context.api.dataChanged();
      }
    }
  }

  handleMouseDown = (e) => {
    this.mouseDown = true;
    this.mouseMoved = false;
    if (this.props.selectable) {
      e.stopPropagation();
      this.context.api.selectNode(this, e);
      if (this.props.movable) {
        this.handleDragStart(e);
      } else if (this.props.moveDelegate) {
        this.props.moveDelegate.handleDragStart(e);
      }
    }
  };
  handleDragStart = (e) => {
    e.preventDefault();
    const svgRoot = this.context.slide.svgRoot;
    const event = e.nativeEvent;
    const pt = svgRoot.createSVGPoint();
    pt.x = event.pageX;
    pt.y = event.pageY;
    this.startPoint = pt.matrixTransform(this.node.parentNode.getScreenCTM().inverse());
    pt.x = event.pageX;
    pt.y = event.pageY;
    this.currentPoint = this.startPoint;
    this.startX = this.props.x;
    this.startY = this.props.y;
    this.movePoint = svgRoot.createSVGPoint();
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('touchmove', this.onDrag);
    window.addEventListener('mouseup', this.onDragEnd);
    window.addEventListener('touchend', this.onDragEnd);
  };

  onDrag = (e) => {
    if (this.movePoint) {
      e.stopPropagation();
      if(!this.isSelected()) {
        this.context.api.selectNode(this, e);
      }

      const changedEvent = e.touches ? e.touches[0] : e;
      this.movePoint.x = changedEvent.pageX;
      this.movePoint.y = changedEvent.pageY;
      const p = this.movePoint.matrixTransform(this.node.parentNode.getScreenCTM().inverse());

      this.setState({ moving: true });
      this.processChange('x', this.startX + (p.x - this.startPoint.x), false);
      this.processChange('y', this.startY + (p.y - this.startPoint.y));
    }
  };

  onDragEnd = () => {
    this.setState({moving: false});
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('touchmove', this.onDrag);
    window.removeEventListener('mouseup', this.onDragEnd);
    window.removeEventListener('touchend', this.onDragEnd);
  };

  handleRef = (ref) => {
    this.node = ref;
  };

  handleContentRef = (ref) => {
    this.contentNode = ref;
  };

  childSizeChanged() {
    this.applyTransformation();
  }

  isSelected() {
    return this.context.api.isNodeSelected(this);
  }

  notifyParent() {
    if (this.isSelected()) {
      this.context.api.selectNode(this);
    }
    this.context.parentElement && this.context.parentElement.childSizeChanged();
  }

  handleBBoxRef = (ref) => {
    this.bboxNode = ref;
  };

  render() {
    const {selectable} = this.props;
    const transform = this.calcTransform(this.props.x, this.props.y,
      this.props.width || this.state.width,
      this.props.height || this.state.height,
      this.props.rotate);

    return (
      <g
        ref={this.handleRef}
        className={`element element-${this.type}`}
        transform={transform}
        onMouseDown={this.handleMouseDown}
        onTouchStart={this.handleMouseDown}
      >
        {selectable ? <g ref={this.handleBBoxRef} transform={`translate(${this.state.bboxX || 0}, ${this.state.bboxY || 0})`}>
          <rect
            width={this.state.width}
            height={this.state.height} fill="transparent"
          />
        </g> : null}
        <g ref={this.handleContentRef}>
          {this.renderChildren()}
        </g>
      </g>);
  }

}
