import React, {PropTypes} from 'react';
import Api from './Api';
import Selection from './Selection';
import './css/common.css';

const wrapperStyle = {width: '100%', height: '100%', overflow: 'auto', position: 'absolute'};

export default class Canvas extends React.Component {

  static propTypes = {
    api: PropTypes.instanceOf(Api),
    zoom: PropTypes.number,
    onFirstRender: PropTypes.func
  };

  static defaultProps = {
    zoom: 1
  };

  static childContextTypes = {
    canvas: PropTypes.object,
    api: PropTypes.object,
    zoom: PropTypes.number
  };

  constructor(props, context) {
    super(props, context);

    this.api = props.api;
    this.api.on('selectionChanged', this.handleSelectionChange);
    this.api.on('dataChanged', this.handleDataChange);

    this.state = {
      readyForRender: false,
      width: 0,
      height: 0,
      selections: null,
      slide: this.api.slide,
      slideLeft: 0,
      slideTop: 0
    };


  }

  getChildContext() {
    return {
      canvas: this,
      api: this.props.api,
      zoom: this.props.zoom
    };
  }

  componentWillUnmount() {
    this.api.unbind('selectionChanged', this.handleSelectionChange);
    this.api.unbind('dataChanged', this.handleDataChange);
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
      this.props.api.unbind('selectionChanged', this.handleSelectionChange);
      this.props.api.unbind('dataChanged', this.handleDataChange);

      nextProps.api.bind('selectionChanged', this.handleSelectionChange);
      nextProps.api.bind('dataChanged', this.handleDataChange);

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
      this.props.api.selectionChanged();
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

  handleDataChange = () => {
    this.setState({
      slide: this.api.slide
    });
  };

  handleSelectionChange = () => {
    this.setState({
      selections: this.api.getSelections()
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
    this.props.api.selectNode(null);
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

    return (<div style={wrapperStyle} ref={this.handleWrapperRef}>
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
              fill="white"
            />
            <g className="slide-elements">
              {this.state.slide.elements.map((el) => {
                const {_factory, _id, ...other} = el;
                return React.createElement(_factory, {key: _id, _id: _id, ...other});
              })}
            </g>
          </g>
          <g ref={this.handleSelectionRefs} className="slide-selections">
            {this.state.selections}
          </g>
        </g>
      </svg>
    </div>);
  }

}
