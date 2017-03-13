import React, {PropTypes} from 'react';

export default class Draggable extends React.Component {

  static propTypes = {
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onDragEnd: PropTypes.func,
    children: PropTypes.node,
    freezeCursor: PropTypes.bool
  };

  componentDidMount() {
    this.svgRoot = this.node.ownerSVGElement;
  }

  onTouchStart = (e) => {
    e.stopPropagation();
    const event = e.touches ? e.touches[0] : e;
    const pt = this.svgRoot.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    this.currentPoint = null;
    this.rootInverse = this.svgRoot.getScreenCTM().inverse();
    this.startPoint = pt.matrixTransform(this.rootInverse);
    this.relativeStartPoint = pt.matrixTransform(this.node.getScreenCTM().inverse());
    this.movePoint = this.svgRoot.createSVGPoint();
    this.props.onDragStart && this.props.onDragStart({
      target: this,
      startPoint: this.startPoint,
      relativeStartPoint: this.relativeStartPoint,
      nativeEvent: e.nativeEvent
    });

    window.addEventListener('mousemove', this.onTouchMove);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('mouseup', this.onTouchEnd);
    window.addEventListener('touchend', this.onTouchEnd);
  };

  onTouchMove = (e) => {
    if (this.props.onDrag) {
      if (this.props.freezeCursor && !this.cursorLayer) {
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
      this.moved = true;
      e.stopPropagation();
      e.preventDefault();

      const changedEvent = e.touches ? e.touches[0] : e;
      this.movePoint.x = changedEvent.clientX;
      this.movePoint.y = changedEvent.clientY;
      const p = this.movePoint.matrixTransform(this.rootInverse);
      this.currentPoint = p;
      this.props.onDrag({
        target: this,
        startPoint: this.startPoint,
        relativeStartPoint: this.relativeStartPoint,
        point: p,
        relativePoint: this.movePoint.matrixTransform(this.node.getScreenCTM().inverse()),
        nativeEvent: e
      });
    }
  };

  onTouchEnd = (e) => {
    this.moved = false;
    if (this.cursorLayer) {
      document.body.removeChild(this.cursorLayer);
      this.cursorLayer = null;
    }
    window.removeEventListener('mousemove', this.onTouchMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('mouseup', this.onTouchEnd);
    window.removeEventListener('touchend', this.onTouchEnd);

    if (this.props.onDragEnd) {
      this.props.onDragEnd({
        startPoint: this.startPoint,
        relativeStartPoint: this.relativeStartPoint,
        point: this.currentPoint,
        target: this,
        nativeEvent: e
      });
    }
  };

  handleRef = (ref) => {
    this.node = ref;
  };

  render() {
    const {onDrag} = this.props;
    return (<g
      ref={this.handleRef}
      onMouseDown={onDrag ? this.onTouchStart : null}
      onTouchStart={onDrag ? this.onTouchStart : null}
    >
      {this.props.children}
    </g>);
  }
}
