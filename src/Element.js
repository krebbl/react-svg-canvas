import React, {PropTypes} from 'react';
import shallowequal from 'shallowequal';
import Api from './Api';
import Selection from './Selection';
import ScaleKnob from './ScaleKnob';

export default class Element extends React.Component {

  state = {
    bboxX: 0,
    bboxY: 0,

    moving: false,
    highlight: false
  };

  isGroup = false;

  static propTypes = {
    id: PropTypes.string,
    x: PropTypes.number,
    y: PropTypes.number,
    anchorX: PropTypes.number,
    anchorY: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    rotate: PropTypes.number,
    children: PropTypes.node,
    movable: PropTypes.bool,
    moveDelegate: PropTypes.instanceOf(Element),
    selectDelegate: PropTypes.instanceOf(Element),
    selectable: PropTypes.bool,
    scalable: PropTypes.bool,
    snapable: PropTypes.bool,
    hoverable: PropTypes.bool,
    hoverOnBBox: PropTypes.bool
  };

  static defaultProps = {
    x: 0,
    y: 0,
    anchorX: 0,
    anchorY: 0,
    rotate: 0,
    selectable: true,
    scalable: true,
    snapable: true,
    hoverable: true,
    movable: true,
    onChange: null,
    hoverOnBBox: true
  };

  type = 'core';

  static contextTypes = {
    api: PropTypes.instanceOf(Api),
    canvas: PropTypes.object,
    parentElement: PropTypes.object,
    group: PropTypes.object
  };

  static childContextTypes = {
    parentElement: PropTypes.object,
    group: PropTypes.object
  };

  getChildContext() {
    return {
      parentElement: this,
      group: this.isGroup ? this : this.context.group
    };
  }

  constructor(props, context) {
    super(props, context);
    this.firstRender = true;
    if (!context.api) {
      throw new Error('Api missing on context');
    }
    if (!context.canvas) {
      throw new Error('Canvas missing on context');
    }

    context.api.on('selectionChange', this.handleSelectionChange);

    this.state = {
      selected: !!context.api.isElementSelected(props.id)
    };
  }

  handleSelectionChange = () => {
    this.setState({
      selected: this.context.api.isElementSelected(this.props.id)
    });
  };

  shouldComponentUpdate(nextProps, nextState, nextContext) {
    return !shallowequal(this.props, nextProps) || !shallowequal(this.state, nextState) || !shallowequal(this.context, nextContext);
  }

  updateProp(key, value) {
    this.context.api.updateElement(this.props.id, key, value);
  }

  triggerDataChange() {
    this.context.api.triggerDataChange();
  }

  renderKnobs() {
    const knobs = [];
    if (this.props.scalable) {
      if (this.props.width != null) {
        knobs.push(<ScaleKnob
          key="l" dir="l"
          y={this.actualHeight() * 0.5}
          onChange={this.handleKnobChange}/>);
        knobs.push(<ScaleKnob key="r" dir="r" x={this.actualWidth()} y={this.actualHeight() * 0.5} onChange={this.handleKnobChange}/>);
      }
      if (this.props.height != null) {
        knobs.push(<ScaleKnob key="t" dir="t" x={this.actualWidth() * 0.5} onChange={this.handleKnobChange}/>);
        knobs.push(<ScaleKnob key="b" dir="b" x={this.actualWidth() * 0.5} y={this.actualHeight()} onChange={this.handleKnobChange}/>);
      }
    }
    return knobs;
  }

  handleKnobChange = (knob, dir, diffVector) => {
    this.processKnobChange(knob, dir, diffVector);
  };

  actualWidth() {
    return this.props.width || this.state.bboxWidth || 0;
  }

  actualHeight() {
    return this.props.height || this.state.bboxHeight || 0;
  }

  renderSelection() {
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
      width: this.actualWidth(),
      height: this.actualHeight(),
      matrix: matrix,
      type: this.type,
      editor: this.renderEditor(),
      onKnobChange: this.handleKnobChange
    };
    return <Selection key={this.props.id} element={this} {...props}>
      {this.renderKnobs(props.width, props.height)}
    </Selection>;
  }

  renderEditor() {
    return null;
  }

  renderChildren() {
    return this.props.children;
  }

  componentDidUpdate(prevProps, prevState) {
    const sizeChanged = this.state.bboxWidth !== prevState.bboxWidth
      || this.state.bboxHeight !== prevState.bboxHeight
      || this.state.bboxX !== prevState.bboxX
      || this.state.bboxY !== prevState.bboxY;
    if (sizeChanged) {
      this.notifySizeChanged();
    } else if (!shallowequal(prevProps, this.props)) {
      this.applyTransformation(prevProps.rotate !== this.props.rotate
        || prevProps.x !== this.props.x || prevProps.y !== this.props.y);
    }

    if (prevState.moving !== this.state.moving) {
      this.notifySizeChanged();
    }

    if (this.state.selected !== prevState.selected) {
      if (this.state.selected) {
        this.context.canvas.focus();
      }
    }
  }

  componentDidMount() {
    this.applyTransformation(true);
    this.context.api.registerNode(this);
    this.context.canvas.registerNode(this);

    if (this.state.selected) {
      this.context.canvas.focus();
    }
  }

  componentWillUnmount() {
    this.context.api.unregisterNode(this);
    this.context.api.off('selectionChange', this.handleSelectionChange);
    this.context.canvas.unregisterNode(this);
  }

  applyTransformation(positionChanged) {
    const bbox = this.calcBBox();
    if (!bbox) return;
    const bboxWidth = this.props.width != null ? this.props.width : bbox.width;
    const bboxHeight = this.props.height != null ? this.props.height : bbox.height;
    const x = this.props.width == null ? bbox.x : 0;
    const y = this.props.height == null ? bbox.y : 0;
    const sizeChanged = this.state.bboxWidth !== bboxWidth || this.state.bboxHeight !== bboxHeight
      || this.state.bboxX !== x || this.state.bboxY !== y;
    if (sizeChanged) {
      this.setState({
        bboxX: x,
        bboxY: y,
        bboxWidth,
        bboxHeight
      });
    } else if (positionChanged) {
      this.notifySizeChanged();
    }
  }

  calcBBox() {
    const node = this.contentNode;
    if (!node) return null;
    return node.getBBox();
  }

  calcTransform(x, y, width, height, anchorX, anchorY, currentWidth, currentHeight, rotate) {
    let transform = '';
    transform += `translate(${x - (anchorX * currentWidth)}, ${y - (anchorY * currentHeight)})`;
    if (this.props.rotate && height != null && width != null) {
      transform += ` rotate(${rotate}, ${width * 0.5}, ${height * 0.5})`;
    }
    return transform;
  }

  svgRoot() {
    return this.node.viewportElement;
  }

  calcNewPositionForSize(newWidth, newHeight, anchorX, anchorY) {
    const width = this.props.width || 0;
    const height = this.props.height || 0;
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

  processRotate(rotate) {
    const oldCenter = this.calcCenterPoint(this.state.bboxX, this.state.bboxY, this.state.bboxWidth, this.state.bboxHeight, this.props.rotate);
    const newCenter = this.calcCenterPoint(this.state.bboxX, this.state.bboxY, this.state.bboxWidth, this.state.bboxHeight, rotate);
    this.processChange('x', this.props.x + (oldCenter.x - newCenter.x), false);
    this.processChange('y', this.props.y + (oldCenter.y - newCenter.y), false);
    this.processChange('rotate', rotate);
  }

  calcCenterPoint(bboxX, bboxY, width, height, rotate) {
    const center = this.svgRoot().createSVGPoint();
    center.x = bboxX + (width * 0.5);
    center.y = bboxY + (height * 0.5);
    const transform = this.svgRoot().createSVGTransform();
    transform.setRotate(rotate, 0, 0);
    return center.matrixTransform(transform.matrix);
  }

  processKnobChange(knob, dir, diffVector) {
    let np;
    let newHeight;
    let newWidth;
    switch (dir) {
      case 'b':
        newHeight = this.props.height + diffVector.y;
        np = this.calcNewPositionForSize(this.props.width || 0, newHeight, -1, -1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', newHeight, true);
        break;
      case 't':
        newHeight = this.props.height - diffVector.y;
        np = this.calcNewPositionForSize(this.props.width || 0, newHeight, -1, 1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('height', newHeight, true);
        break;
      case 'l':
        newWidth = this.props.width - diffVector.x;
        np = this.calcNewPositionForSize(newWidth, this.props.height || 0, 1, 1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', newWidth, true);
        break;
      case 'r':
        newWidth = this.props.width + diffVector.x;
        np = this.calcNewPositionForSize(newWidth, this.props.height || 0, -1, -1);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
        this.processChange('width', newWidth, true);

        break;
      default:
        break;
    }
  }

  processChange(key, value, trigger = true) {
    if (this.props.id) {
      let val = value;
      if (typeof val === 'number') {
        // val = Math.round(val * 10) / 10;
      }
      if (key === 'rotate') {
        this.context.api.updateElement(this.props.id, key, val % 360);
      } else {
        this.context.api.updateElement(this.props.id, key, val);
      }
      if (trigger) {
        this.context.api.triggerDataChange();
        if (this.state.selected) {
          this.context.api.triggerSelectionChange();
        }
      }
    }
  }

  handleMouseDown = (e) => {
    this.mouseDown = true;
    this.mouseMoved = false;
    if (this.props.selectable) {
      e.stopPropagation();
      e.preventDefault();
      if (this.props.selectDelegate) {
        this.props.selectDelegate.handleMouseDown(e);
      } else if (this.context.group) {
        this.context.group.handleMouseDown(e);
      }
      if (this.state.selected && e.shiftKey) {
        this.context.api.deselectElement(this.props.id);
      } else {
        this.context.api.selectElement(this.props.id, this.props.selectDelegate || this.context.group || e.shiftKey);
      }
      this.forceUpdate();
      if (this.props.movable) {
        this.handleDragStart(e);
      } else if (this.props.moveDelegate) {
        this.props.moveDelegate.handleDragStart(e);
      } else if (this.context.group) {
        this.context.group.handleDragStart(e);
      }
    }
  };
  handleDragStart = (e) => {
    // e.preventDefault();
    e.stopPropagation();
    const svgRoot = this.svgRoot();
    let event = e.nativeEvent;
    event = event.touches ? event.touches[0] : event;
    const pt = svgRoot.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    this.startPoint = pt.matrixTransform(this.node.parentNode.getScreenCTM().inverse());
    this.currentPoint = this.startPoint;
    this.startX = this.props.x;
    this.startY = this.props.y;
    this.movePoint = svgRoot.createSVGPoint();
    this.moved = false;
    this.context.canvas.prepareSnaplines(this);
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('touchmove', this.onDrag);
    window.addEventListener('mouseup', this.onDragEnd);
    window.addEventListener('touchend', this.onDragEnd);
  };

  onDrag = (e) => {
    if (this.movePoint) {
      e.stopPropagation();
      // e.preventDefault();
      if (!this.moved) {
        this.context.api.startChange();
      }
      if (!this.state.selected) {
        this.context.api.selectElement(this.props.id);
      }
      if (!this.cursorLayer) {
        this.cursorLayer = document.createElement('div');
        this.cursorLayer.style.position = 'absolute';
        this.cursorLayer.style.top = '0';
        this.cursorLayer.style.left = '0';
        this.cursorLayer.style.right = '0';
        this.cursorLayer.style.bottom = '0';
        this.cursorLayer.style.cursor = this.node.style.cursor;
        this.cursorLayer.style.zIndex = '99999';

        document.body.appendChild(this.cursorLayer);
      }
      const changedEvent = e.touches ? e.touches[0] : e;
      this.movePoint.x = changedEvent.clientX;
      this.movePoint.y = changedEvent.clientY;
      const p = this.movePoint.matrixTransform(this.node.parentNode.getScreenCTM().inverse());
      this.moved = p.x !== this.startPoint.x || p.y !== this.startPoint.y;
      let newX = this.startX + (p.x - this.startPoint.x);
      let newY = this.startY + (p.y - this.startPoint.y);
      const diffs = this.context.canvas.findSnaplines(this, this.createSnaplines(newX + (this.state.bboxX || 0), newY + (this.state.bboxY || 0), this.actualWidth(), this.actualHeight(), this.props.rotate));
      if (diffs.x || diffs.y) {
        const inverseMatrix = this.context.canvas.slideNode.getCTM();
        const parentCtm = this.node.parentNode.getCTM().inverse();
        const multiplied = inverseMatrix.multiply(parentCtm);
        p.x = diffs.x;
        p.y = diffs.y;

        newX -= p.x * multiplied.a;
        newY -= p.y * multiplied.d;
      }
      this.setState({moving: true});
      this.processChange('x', newX, false);
      this.processChange('y', newY);
    }
  };

  onDragEnd = () => {
    if (this.cursorLayer) {
      document.body.removeChild(this.cursorLayer);
      this.cursorLayer = null;
    }
    this.setState({moving: false});
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('touchmove', this.onDrag);
    window.removeEventListener('mouseup', this.onDragEnd);
    window.removeEventListener('touchend', this.onDragEnd);

    if (this.moved) {
      this.context.api.finishChange();
    }
    this.context.canvas.clearSnaplines();
  };

  handleRef = (ref) => {
    this.node = ref;
  };

  handleContentRef = (ref) => {
    this.contentNode = ref;
  };

  handleMouseEnter = (e) => {
    e.stopPropagation();
    if (!this.state.hovered && this.props.hoverable) {
      this.setState({hovered: true});
    }
  };

  handleMouseOut = () => {
    if (this.state.hovered) {
      this.setState({hovered: false});
    }
  };

  highlight(highlight) {
    this.setState({highlight});
  }

  contains(element) {
    let parentElement = element.context.parentElement;
    while (parentElement) {
      if (parentElement === this) {
        return true;
      }
      parentElement = parentElement.context.parentElement;
    }
    return false;
  }

  createSnaplines(x, y, width, height, rotation) {
    const snaplines = [];
    if (!this.props.snapable) {
      return snaplines;
    }
    const svgRoot = this.svgRoot();
    let pt = svgRoot.createSVGPoint();
    let pw = svgRoot.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const inverseMatrix = this.context.canvas.slideNode.getCTM().inverse();
    const parentCtm = this.node.parentNode.getCTM();
    const multiplied = inverseMatrix.multiply(parentCtm);
    pt = pt.matrixTransform(multiplied);
    pw.x = x + width;
    pw.y = y + height;
    pw = pw.matrixTransform(multiplied);
    const w = pw.x - pt.x;
    const h = pw.y - pt.y;

    snaplines.push({
      pos: pt.x + (w * 0.5),
      mode: 'x',
      ref: this
    });
    if (!rotation) {
      snaplines.push({
        pos: pt.x,
        mode: 'x',
        ref: this
      });

      snaplines.push({
        pos: pt.x + w,
        mode: 'x',
        ref: this
      });
    }

    snaplines.push({
      pos: pt.y + (h * 0.5),
      mode: 'y',
      ref: this
    });

    if (!rotation) {
      snaplines.push({
        pos: pt.y,
        mode: 'y',
        ref: this
      });

      snaplines.push({
        pos: pt.y + h,
        mode: 'y',
        ref: this
      });
    }

    // TODO: add snaplines created by renderer

    return snaplines;
  }

  childSizeChanged() {
    this.applyTransformation();
  }

  getCurrentSnaplines() {
    return this.createSnaplines(this.props.x + (this.state.bboxX || 0), this.props.y + (this.state.bboxY || 0), this.actualWidth(), this.actualHeight());
  }

  notifySizeChanged() {
    this.context.api.updateSelection(this);
    this.props.onSizeChange && this.props.onSizeChange(this);
    this.context.group && this.context.group.childSizeChanged();
  }

  // For parent elements
  notifyPositionChanged() {
    this.context.api.updateSelection(this);
  }

  handleBBoxRef = (ref) => {
    this.bboxNode = ref;
  };

  render() {
    const {selectable} = this.props;
    const transform = this.calcTransform(this.props.x, this.props.y,
      (this.props.width || 0),
      (this.props.height || 0),
      this.state.anchorX || this.props.anchorX || 0,
      this.state.anchorY || this.props.anchorY || 0,
      this.state.bboxWidth || 0,
      this.state.bboxHeight || 0,
      this.props.rotate);
    return (
      <g
        ref={this.handleRef}
        className={`element element-${this.type}`}
        transform={transform}
        onMouseDown={this.handleMouseDown}
        onTouchStart={this.handleMouseDown}
        onMouseOver={this.handleMouseEnter}
        onMouseOut={this.handleMouseOut}
      >
        {selectable ? <g ref={this.handleBBoxRef} transform={`translate(${this.state.bboxX || 0}, ${this.state.bboxY || 0})`}>
          <rect
            style={this.props.hoverOnBBox ? null : {pointerEvents: 'none'}}
            x={this.state.bboxWidth < 0 ? this.state.bboxWidth : 0}
            y={this.state.bboxHeight < 0 ? this.state.bboxHeight : 0}
            width={Math.abs(this.state.bboxWidth || 0)}
            height={Math.abs(this.state.bboxHeight || 0)}
            stroke="gray"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="5 5"
            strokeWidth={(this.state.hovered && !this.state.selected) || this.state.moving || this.state.highlight ? 1 : 0}
            fill="transparent"
          />
        </g> : null}
        <g ref={this.handleContentRef}>
          {this.renderChildren()}
        </g>
      </g>);
  }

}

Element.createClass = function (RenderFactory, defaultElementProps) {
  const Base = Element;
  RenderFactory.contextTypes = Object.assign({}, Base.contextTypes, RenderFactory.contextTypes);
  RenderFactory.prototype.processChange = function (key, value, trigger) {
    this.props._wrapper.processChange(key, value, trigger);
  };

  class F extends Base {
    type = RenderFactory.type || Base.type;
    Renderer = RenderFactory;

    static defaultProps = Object.assign({}, Base.defaultProps, defaultElementProps);

    constructor(props, context) {
      super(props, context);
    }

    renderKnobs() {
      if (this.renderInst.renderKnobs) {
        const ret = this.renderInst.renderKnobs();
        if (ret) {
          return ret;
        }
      }
      return super.renderKnobs();
    }

    renderEditor() {
      if (this.renderInst.renderEditor) {
        const ret = this.renderInst.renderEditor();
        if (ret) {
          return ret;
        }
      }
      return super.renderEditor();
    }

    handleRenderer = (child) => {
      this.renderInst = child;
    };

    renderChildren() {
      const Renderer = this.Renderer;
      return <Renderer ref={this.handleRenderer} _wrapper={this} {...this.props} {...this.state} />;
    }
  }


  return F;
};
