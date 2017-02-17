import React, {PropTypes} from 'react';
import objectDiff from 'object-diff';
import shallowequal from 'shallowequal';
import Api from './Api';
import Selection from './Selection';
import ScaleKnob from'./ScaleKnob';

export default class Element extends React.Component {

  state = {
    bboxX: 0,
    bboxY: 0,
    moving: false
  };

  static propTypes = {
    _id: PropTypes.string,
    x: PropTypes.number,
    y: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    rotate: PropTypes.number,
    children: PropTypes.node,
    movable: PropTypes.bool,
    moveDelegate: PropTypes.instanceOf(Element),
    selectable: PropTypes.bool,
    scalable: PropTypes.bool
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
    api: PropTypes.instanceOf(Api),
    canvas: PropTypes.object,
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

  createKnobs() {
    const knobs = [];
    if (this.props.scalable) {
      if (this.props.width != null) {
        knobs.push(<ScaleKnob key="l" dir="l" y={this.actualHeight() * 0.5} onChange={this.handleKnobChange}/>);
        knobs.push(<ScaleKnob key="r" dir="r" x={this.actualWidth()} y={this.actualHeight() * 0.5} onChange={this.handleKnobChange}/>);
      }
      if (this.props.height != null) {
        knobs.push(<ScaleKnob key="t" dir="t" x={this.actualWidth() * 0.5} onChange={this.handleKnobChange}/>);
        knobs.push(<ScaleKnob key="b" dir="b" x={this.actualWidth() * 0.5} y={this.actualHeight()} onChange={this.handleKnobChange}/>);
      }
    }
    // if (this.props.rotatable) {
    //
    // }
    return knobs;
  }

  handleKnobChange = (knob, dir, diffVector) => {
    this.processKnobChange(knob, dir, diffVector);
  };

  actualWidth() {
    return this.props.width || this.state.width || 0;
  }

  actualHeight() {
    return this.props.height || this.state.height || 0;
  }

  createSelection() {
    const selectionContainer = this.context.canvas.selections;
    if (!selectionContainer || this.state.moving) {
      return null;
    }
    const svgRoot = selectionContainer;
    const node = this.bboxNode;
    const matrix = svgRoot.getCTM().inverse().multiply(node.getCTM());

    const props = {
      x: this.state.bboxX,
      y: this.state.bboxY,
      width: Math.ceil(this.actualWidth()),
      height: Math.ceil(this.actualHeight()),
      matrix: matrix,
      transform: `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].join(',')})`,
      type: this.type,
      editor: this.createEditor(),
      form: this.getForm(),
      onKnobChange: this.handleKnobChange
    };
    return <Selection key={this.id} element={this} {...props}>
      {this.createKnobs(props.width, props.height)}
    </Selection>;
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
        this.applyTransformation(prevProps.rotate !== this.props.rotate
          || prevProps.x !== this.props.x || prevProps.y !== this.props.y);
      }
    } else {
      const sizeChanged = this.state.width !== prevState.width
        || this.state.height !== prevState.height
        || this.state.bboxX !== prevState.bboxX
        || this.state.bboxY !== prevState.bboxY;
      if (sizeChanged) {
        this.notifySizeChanged();
      }
    }
    if (prevState.moving !== this.state.moving) {
      this.context.api.updateSelection(this);
    }
  }

  componentDidMount() {
    this.applyTransformation(true);
    this.context.api.updateSelection(this);
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
      this.notifySizeChanged();
    }
  }

  applyTransformation(positionChanged) {
    this.applyBBox(positionChanged);
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
    return this.node.viewportElement;
  }

  calcNewPositionForSize(newWidth, newHeight, anchorX, anchorY) {
    const width = this.actualWidth();
    const height = this.actualHeight();
    const p = {x: this.props.x, y: this.props.y};
    const c = {x: width * 0.5, y: height * 0.5};
    const cn = {x: newWidth * 0.5, y: newHeight * 0.5};

    const transform = this.svgRoot().createSVGTransform();
    transform.setRotate(this.props.rotate, 0, 0);

    let a = this.svgRoot().createSVGPoint();
    a.x = width * anchorX * 0.5;
    a.y = height * anchorY * 0.5;
    a = a.matrixTransform(transform.matrix);

    let an = this.svgRoot().createSVGPoint();
    an.x = newWidth * anchorX * 0.5;
    an.y = newHeight * anchorY * 0.5;
    an = an.matrixTransform(transform.matrix);

    return {
      x: p.x + (c.x - cn.x) + (a.x - an.x),
      y: p.y + (c.y - cn.y) + (a.y - an.y)
    };
  }

  processKnobChange(knob, dir, diffVector) {
    var np, newHeight, newWidth;
    switch (dir) {
      case 'b':
        newHeight = this.props.height + diffVector.y;
        np = this.calcNewPositionForSize(this.actualWidth(), newHeight, -1, -1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', newHeight, true);
        break;
      case 't':
        newHeight = this.props.height - diffVector.y;
        np = this.calcNewPositionForSize(this.actualWidth(), newHeight, -1, 1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', newHeight, true);
        break;
      case 'l':
        newWidth = this.props.width - diffVector.x;
        np = this.calcNewPositionForSize(newWidth, this.actualHeight(), 1, 1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', newWidth, true);
        break;
      case 'r':
        newWidth = this.props.width + diffVector.x;
        np = this.calcNewPositionForSize(newWidth, this.actualHeight(), -1, -1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', newWidth, true);

        break;
      default:
        break;
    }
  }

  processChange(key, value, trigger = true) {
    if (this.id) {
      if (key === 'rotate') {
        this.context.api.updateElement(this.id, key, value % 360);
      } else {
        this.context.api.updateElement(this.id, key, value);
      }
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
      this.context.api.selectNode(this);
      if (this.props.movable) {
        this.handleDragStart(e);
      } else if (this.props.moveDelegate) {
        this.props.moveDelegate.handleDragStart(e);
      }
    }
  };
  handleDragStart = (e) => {
    e.preventDefault();
    const svgRoot = this.context.canvas.svgRoot;
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
      if (!this.isSelected()) {
        this.context.api.selectNode(this);
      }

      const changedEvent = e.touches ? e.touches[0] : e;
      this.movePoint.x = changedEvent.pageX;
      this.movePoint.y = changedEvent.pageY;
      const p = this.movePoint.matrixTransform(this.node.parentNode.getScreenCTM().inverse());

      this.setState({moving: true});
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

  notifySizeChanged() {
    this.context.api.updateSelection(this);
    this.context.parentElement && this.context.parentElement.childSizeChanged();
  }

  handleBBoxRef = (ref) => {
    this.bboxNode = ref;
  };

  render() {
    const {selectable} = this.props;
    const transform = this.calcTransform(this.props.x, this.props.y,
      this.actualWidth(),
      this.actualHeight(),
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
