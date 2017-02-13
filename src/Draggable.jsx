import React, {PropTypes} from "react";

export default class Draggable extends React.Component {

  static propTypes = {
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onDragEnd: PropTypes.func,
    children: PropTypes.node
  };

  componentDidMount() {
    let element = this.node;
    while (element.localName !== 'svg') {
      element = element.parentNode;
    }
    this.svgRoot = element;
  }

  onTouchStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const event = e.nativeEvent;
    const pt = this.svgRoot.createSVGPoint();
    pt.x = event.pageX;
    pt.y = event.pageY;
    this.currentPoint = null;
    this.startPoint = pt.matrixTransform(this.svgRoot.getScreenCTM().inverse());
    const node = this.node;
    pt.x = event.pageX;
    pt.y = event.pageY;
    this.relativeStartPoint = pt.matrixTransform(node.getScreenCTM().inverse());

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
      e.stopPropagation();
      const changedEvent = e.touches ? e.touches[0] : e;
      this.movePoint.x = changedEvent.pageX;
      this.movePoint.y = changedEvent.pageY;
      const p = this.movePoint.matrixTransform(this.svgRoot.getScreenCTM().inverse());
      this.currentPoint = p;
      this.props.onDrag({
        target: this,
        startPoint: this.startPoint,
        relativeStartPoint: this.relativeStartPoint,
        point: p,
        nativeEvent: e
      });
    }
  };

  onTouchEnd = (e) => {
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
