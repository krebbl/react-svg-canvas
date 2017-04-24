import React, {PropTypes} from 'react';
import EventListener from 'react-event-listener';
import Api from './Api';

export default class Canvas extends React.Component {

  static propTypes = {
    api: PropTypes.instanceOf(Api),
    zoom: PropTypes.number,
    fixed: PropTypes.bool,
    onFirstRender: PropTypes.func,
    snapDistance: PropTypes.number
  };

  static defaultProps = {
    fixed: false,
    zoom: 1,
    snapDistance: 5
  };

  static childContextTypes = {
    canvas: PropTypes.object,
    api: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);

    this.api = props.api;
    this.api.on('selectionChange', this.handleSelectionChange);
    this.api.on('dataChange', this.handleDataChange);

    this.snaplines = {};
    this.nodes = {};

    this.state = {
      readyForRender: false,
      width: 0,
      height: 0,
      selection: this.api.selection,
      slide: this.api.slide,
      slideLeft: 0,
      slideTop: 0
    };


  }

  getChildContext() {
    return {
      canvas: this,
      api: this.props.api
    };
  }

  componentWillUnmount() {
    this.api.unbind('selectionChange', this.handleSelectionChange);
    this.api.unbind('dataChange', this.handleDataChange);
  }

  componentDidMount() {
    this.checkIfReadyForRender();
  }

  checkIfReadyForRender() {
    if (!this.state.readyForRender) {
      // check if DOM is ready to render
      const readyForRender = this.loadingNode && this.loadingNode.offsetHeight > 0;
      if (readyForRender) {
        this.setState({
          readyForRender: true
        });
      } else {
        setTimeout(() => {
          this.checkIfReadyForRender();
        }, 50);
      }
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.api !== this.props.api && nextProps.api) {
      this.props.api.unbind('selectionChange', this.handleSelectionChange);
      this.props.api.unbind('dataChange', this.handleDataChange);

      nextProps.api.bind('selectionChange', this.handleSelectionChange);
      nextProps.api.bind('dataChange', this.handleDataChange);

      this.handleDataChange();
      this.handleSelectionChange();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.readyForRender && this.state.readyForRender) {
      this.positionSlide();
      this.props.onFirstRender && this.props.onFirstRender(this);
    } else if (this.state.readyForRender && (prevProps.zoom !== this.props.zoom || this.state.slide !== prevState.slide)) {
      this.positionSlide();
    }

    if (prevState.slideLeft !== this.state.slideLeft
      || prevState.slideTop !== this.state.slideTop
      || prevState.width !== this.state.width
      || prevState.height !== this.state.height) {
      this.props.api.triggerSelectionChange();
      this.centerContent();
    }
  }

  centerContent() {
    if (this.props.fixed) {
      const bbox = this.svgRoot.parentNode.getBoundingClientRect();
      this.wrapperNode.scrollLeft = (this.state.width - bbox.width) * 0.5;
      this.wrapperNode.scrollTop = (this.state.height - bbox.height) * 0.5;
    }
  }

  positionSlide() {
    if (this.svgRoot) {
      const bbox = this.svgRoot.parentNode.getBoundingClientRect();
      const slide = this.state.slide;
      const zoom = this.props.zoom;
      const slideWidth = slide.width * zoom;
      const slideHeight = slide.height * zoom;
      const width = Math.max(slideWidth, bbox.width - 20);
      const height = Math.max(slideHeight, bbox.height - 20);

      const slideLeft = ((width || bbox.width) - slideWidth) * 0.5;
      const slideTop = ((height || bbox.height) - slideHeight) * 0.5;
      if (this.state.width !== width || this.state.height !== height || this.state.slideLeft !== slideLeft || this.state.slideTop !== slideTop) {
        this.setState({
          slideLeft,
          slideTop,
          width,
          height
        });
      }
    }
  }

  findSnaplines(node, snaplines) {
    if (!this.possibleSnaplines) {
      return {x: 0, y: 0};
    }
    const matchingSnaplines = [];
    const matchedSnapline = {};
    const diffs = {x: 0, y: 0};
    // (this.state.snaplines || []).forEach(s => s.ref.highlight(false));
    const maxDiff = {x: 3 * this.props.zoom, y: 3 * this.props.zoom};
    (snaplines || []).forEach((tmpSnapline) => {
      tmpSnapline = matchedSnapline[tmpSnapline.mode] || tmpSnapline;
      this.possibleSnaplines.forEach((snapline) => {
        const diff = tmpSnapline.pos - snapline.pos;
        if (tmpSnapline.mode === snapline.mode && Math.abs(diff) <= maxDiff[tmpSnapline.mode]) {
          maxDiff[tmpSnapline.mode] = 0;
          matchingSnaplines.push(snapline);
          matchedSnapline[tmpSnapline.mode] = matchedSnapline[tmpSnapline.mode] || snapline;
          diffs[tmpSnapline.mode] = diffs[tmpSnapline.mode] || diff;
        }
      });
    });

    this.possibleSnaplines.map(snapline => snapline.ref).filter((elem, pos, self) => self.indexOf(elem) === pos).forEach((element) => {
      element.highlight(matchingSnaplines.find(s => s.ref === element));
    });

    this.setState({
      snaplines: matchingSnaplines
    });
    return diffs;
  }

  registerNode(node) {
    if (node.props.id) {
      this.nodes[node.props.id] = node;
    }
  }

  unregisterNode(node) {
    if (node.props.id) {
      delete this.nodes[node.props.id];
    }
  }

  clearSnaplines() {
    this.state.snaplines && this.state.snaplines.forEach(s => s.ref.highlight(false));
    this.setState({
      snaplines: null
    });
  }

  prepareSnaplines(node) {
    let possibleSnaplines = [];
    Object.keys(this.nodes).forEach((nodeId) => {
      const oNode = this.nodes[nodeId];
      if (nodeId !== node.props.id && !node.contains(oNode)) {
        possibleSnaplines = possibleSnaplines.concat(oNode.getCurrentSnaplines());
      }
    });

    this.possibleSnaplines = possibleSnaplines;
  }

  focus() {
    this.wrapperNode && this.wrapperNode.focus();
  }

  handleResize = () => {
    this._resizeTimeout && clearTimeout(this._resizeTimeout);

    this._resizeTimeout = setTimeout(() => {
      this.positionSlide();
    }, 100);
  };

  handleKeyDown = (e) => {
    const api = this.props.api;
    if (!/input|textarea/gi.test(e.target.tagName) && !e.target.getAttribute('contenteditable')) {
      if (e.which === 8 || e.which === 46) {
        api.removeSelectedElements();
        api.triggerDataChange();
        api.triggerSelectionChange();
      } else if (e.which === 90 && e.metaKey) {
        e.preventDefault();
        if (!e.shiftKey) {
          api.undo();
        } else {
          api.redo();
        }
      }
    }
  };

  handleDataChange = () => {
    this.setState({
      slide: this.api.slide,
      selection: this.api.selection
    });
  };

  handleSelectionChange = () => {
    this.setState({
      selection: this.api.selection
    });
  };

  handleRef = (ref) => {
    this.firstNode = ref;
  };

  handleMouseDown = () => {
    this.mouseDown = true;
    this.triggerSelection(null);
  };

  handleMouseUp = () => {
    this.mouseDown = false;
  };

  triggerSelection() {
    // todo: implement multiple selections
    this.props.api.selectElement(null);
  }

  handleSelectionRefs = (ref) => {
    this.selections = ref;
  };

  handleRootRef = (ref) => {
    this.svgRoot = ref;
  };

  handleSlideRef = (ref) => {
    this.slideNode = ref;
  };

  handleLoadingRef = (ref) => {
    this.loadingNode = ref;
  };

  handleWrapperRef = (ref) => {
    this.wrapperNode = ref;
  };

  render() {
    if (!this.state.readyForRender) {
      // TODO: implement loader
      return <div ref={this.handleLoadingRef}>Loading ...</div>;
    }

    const wrapperStyle = {width: '100%', height: '100%', overflow: this.props.fixed ? 'hidden' : 'auto', position: 'absolute'};

    return (<div style={wrapperStyle} ref={this.handleWrapperRef} tabIndex="-1">
      <EventListener target="window" onResize={this.handleResize}/>
      <EventListener target="window" onKeyDown={this.handleKeyDown}/>
      <svg
        xmlns="http://www.w3.org/2000/svg" version="1.1"
        width={this.state.width || '100%'} height={this.state.height || '100%'}
        ref={this.handleRootRef}
        shapeRendering="geometricPrecision"
        onTouchStart={this.handleMouseDown}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onTouchEnd={this.handleMouseUp}
      >

        <g ref={this.handleRef}>
          <g ref={this.handleSlideRef} transform={`translate(${this.state.slideLeft}, ${this.state.slideTop}) scale(${this.props.zoom})`}>
            <rect
              width={this.state.slide.width}
              height={this.state.slide.height}
              fill={this.state.slide.background}
            />
            <g className="slide-elements">
              {this.state.slide.elements.map((el) => {
                const factory = this.props.api.resolveFactory(el.type);
                const {id, ...other} = el;
                return React.createElement(factory, {key: id, id, ...other});
              })}
            </g>
            <g className="snaplines">
              {(this.state.snaplines || []).map((snapline, i) => {
                if (snapline.mode === 'x') {
                  return <line key={i} vectorEffect="non-scaling-stroke" strokeDasharray="5 5" stroke="blue" strokeWidth="0.8" y1={0} y2={this.state.slide.height} x1={snapline.pos} x2={snapline.pos}/>
                } else {
                  return <line key={i} vectorEffect="non-scaling-stroke" strokeDasharray="5 5" stroke="blue" strokeWidth="0.8" x1={0} x2={this.state.slide.width} y1={snapline.pos} y2={snapline.pos}/>
                }
              })}
            </g>
          </g>
          <g ref={this.handleSelectionRefs} className="slide-selections">
            {Object.keys(this.state.selection).filter(id => !!this.nodes[id]).map(id => this.nodes[id].renderSelection())}
          </g>
        </g>
      </svg>
    </div>);
  }

}
