import React, {PropTypes} from "react";
import Selection from "./Selection";

export default class Slide extends React.Component {

  state = {
    selectedNode: null
  };

  static propTypes = {
    api: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
    children: PropTypes.node,
    onSelect: PropTypes.func
  };

  static defaultProps = {
    width: 800,
    height: 600
  };

  static childContextTypes = {
    slide: PropTypes.object,
    api: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);

    this.api = props.api;
    this.api.on('selectionChanged', this.handleSelectionChange);
  }

  getChildContext() {
    return {
      slide: this,
      api: this.props.api
    };
  }

  componentWillUnmount() {
    this.api.unbind('selectionChanged', this.handleSelectionChange);
  }

  handleSelectionChange = () => {
    this.setState({
      selection: this.api.selectedNode ? this.api.selectedNode.getSelection() : null
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

  triggerSelection(selection) {
    // todo: implement multiple selections
    this.props.api.selectNode(null);
  }

  handleSelectionRefs = (ref) => {
    this.selections = ref;
  };

  handleRootRef = (ref) => {
    this.svgRoot = ref;
  };



  render() {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg" version="1.1"
        width="100%" height="100%" viewBox={`0 0 ${this.props.width} ${this.props.height}`}
        ref={this.handleRootRef}
        shapeRendering="geometricPrecision"
        onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp}
      >
        <g ref={this.handleRef}>
          <g className="slide-elements">
            {this.props.children}
          </g>
          <g ref={this.handleSelectionRefs}className="slide-selections">
            {this.state.selection ? <Selection selection={this.state.selection}/> : null}
          </g>
        </g>
      </svg>);
  }

}
