import React, {PropTypes} from "react";
import Element from "./Element";
import TextEditor from "./TextEditor";
import "./css/common.css";

const textStyle = {whiteSpace: 'pre', textRendering: 'optimizeSpeed'};
const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width', 'padding'];
export default class Text extends Element {

  type = 'text';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    text: '',
    fontSize: 12,
    fontFamily: 'Leckerli One',
    verticalAlign: 'top',
    lineHeight: 2,
    textAlign: 'left',
    fill: 'black',
    padding: 2,
    editable: true
  });

  static propTypes = {
    text: PropTypes.string,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom']),
    textAlign: PropTypes.oneOf(['left', 'center', 'right']),
    lineHeight: PropTypes.number
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      measurement: measureText(Object.assign({}, props, {width: (props.width || 10) - (props.padding * 2)})),
      editing: false
    };
  }

  getKnobs() {
    if (this.state.editing) {
      return [];
    } else {
      return super.getKnobs();
    }
  }

  calcBBox() {
    const bbox = super.calcBBox();
    return bbox ? Object.assign({}, bbox, {
      x: bbox.x - this.props.padding,
      y: bbox.y - this.props.padding,
      width: bbox.width + (this.props.padding * 2),
      height: bbox.height + (this.props.padding * 2)
    }) : null;
  }

  processChange(key, value, trigger = true) {
    if (key === 'text' && !this.props.height) {
      const height = measureNewHeight(Object.assign({}, this.props, { text: value, width: (this.props.width || 10) - (this.props.padding * 2) }));
      const oldHeight = this.state.measurement.height;
      if (height - oldHeight !== 0) {
        const np = this.calcNewPosition(0, 0, 0, height - oldHeight);
        this.processChange('x', np.x, false);
        this.processChange('y', np.y, false);
      }
    }
    super.processChange(key, value, trigger);
  }

  componentWillReceiveProps(nextProps) {
    for (let i = 0; i < wrapProperties.length; i += 1) {
      let key = wrapProperties[i];
      if (nextProps[key] !== this.props[key]) {
        this.setState({
          measurement: measureText(Object.assign({}, nextProps, {width: (nextProps.width || 10) - (this.props.padding * 2) }))
        });
        break;
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    super.componentDidUpdate(prevProps, prevState);

    if (this.state.editing !== prevState.editing) {
      this.context.api.selectionChanged();
      if (!this.state.editing) {
        this.textEditor && this.textEditor.deactivate();
      } else {
        this.textEditor && this.textEditor.activate();
      }
    }

    if (this.state.bboxX !== prevState.bboxX || this.state.bboxY !== prevState.bboxY) {
      setTimeout(() => {
        this.textEditor && this.textEditor.repositionTextArea();
      }, 1);
    }
  }

  handeTextEditor = (ref) => {
    this.textEditor = ref;
  };

  handleTextChange = (e) => {
    this.processChange('text', e.target.innerText, true);
  };

  handleTextBlur = () => {
    this.setState({editing: false});
  };

  createEditor() {
    if (this.props.editable) {
      const props = {};
      wrapProperties.forEach((key) => {
        props[key] = this.props[key];
      });

      return <TextEditor
        {...props}
        key={this.id}
        ref={this.handeTextEditor}
        x={this.props.padding} y={this.props.padding - this.state.measurement.firstLineOffset}
        onTextChange={this.handleTextChange}
        onBlur={this.handleTextBlur}
        width={(this.props.width || this.state.width || 0) - (this.props.padding * 2)}
        height={(this.state.height || 0) - (this.props.padding * 2)}
        text={this.props.text} fill="blue"
      />;
    } else {
      return null;
    }
  }

  handleTextDown = () => {
    if (this.props.editable && this.context.api.isNodeSelected(this)) {
      this.textDownTime = new Date().getTime();
    }
  };

  handleTextUp = () => {
    if (this.props.editable && this.context.api.isNodeSelected(this)) {
      if (((new Date().getTime()) - this.textDownTime) < 200) {
        this.setState({editing: true});
      }
    }
  };

  getForm() {
    return [{
      type: 'text',
      key: 'text',
      title: 'Text'
    }, {
      type: 'number',
      key: 'fontSize',
      title: 'Font Size'
    }, {
      type: 'number',
      key: 'lineHeight',
      title: 'Line Height'
    }];
  }

  renderChildren() {
    // wrap lines
    const lines = this.state.measurement.lines;
    if (lines.length === 0) {
      return null;
    }
    let y = 2;
    const dy = 0;
    switch (this.props.verticalAlign) {
      case 'top':
        break;
      case 'bottom':
        y = -this.state.measurement.height;
        if (this.props.height) {
          y += this.props.height;
        }
        break;
      case 'middle':
        y = -this.state.measurement.height * 0.5;
        if (this.props.height) {
          y += this.props.height * 0.5;
        }
        break;
      default:
            break;
    }
    return (<g
      transform={`translate(${this.props.padding}, ${y})`}
      onTouchStart={this.handleTextDown}
      onMouseDown={this.handleTextDown}
      onMouseUp={this.handleTextUp}
      onTouchEnd={this.handleTextUp}
    >
      <rect width={this.props.width} height={this.state.measurement.height} fill="transparent" />
      {lines.map((line, i) => {
        return <text
          key={i} xmlSpace="preserve" dominantBaseline="text-before-edge" className="no-select" style={textStyle} fontFamily={this.props.fontFamily} fontSize={this.props.fontSize}
          dy={dy} x={line.xs.join(' ')} y={line.ys[0] - this.state.measurement.firstLineOffset} fill={this.state.editing ? 'transparent' : this.props.fill}
        >{line.text || ' '}</text>;
      })}
    </g>);
  }

}


var divWrapper;
function createDivWrapper() {
  const ret = document.createElement('div');
  ret.style.position = 'absolute';
  ret.style.zIndex = '-1';
  ret.style.whiteSpace = 'pre-wrap';
  const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  ret.style.wordBreak = isFirefox ? 'break-all' : 'break-word'; // FF can't do 'break-word'
  document.body.appendChild(ret);

  return ret;
}

function prepareDivWrapper(options) {
  const { text, fontSize, fontFamily, width, textAlign, lineHeight } = options;

  divWrapper = divWrapper || createDivWrapper();
  divWrapper.innerHTML = '';
  divWrapper.style.fontFamily = fontFamily;
  divWrapper.style.lineHeight = lineHeight;
  divWrapper.style.fontSize = `${fontSize}px`;
  divWrapper.style.width = `${width}px`;
  divWrapper.style.color = 'transparent';
  divWrapper.style.textAlign = textAlign;
  divWrapper.innerHTML = `<span>${text.split('').join('</span><span>').replace(/^\s/gi, '&nbsp;').replace(/\n/gi, '<br/>')}</span>`;

  return divWrapper;
}

function measureText(options) {
  var x, y, height, rect;

  divWrapper = prepareDivWrapper(options);

  const lines = [];
  let lastY;
  let currentLine;
  let firstLineOffset;

  [].forEach.call(divWrapper.childNodes, function (el) {
    rect = el.getBoundingClientRect();
    x = rect.left;
    y = el.offsetTop;
    height = el.offsetHeight;
    if (lastY === null || lastY !== y) {
      currentLine = {
        text: '',
        xs: [],
        ys: []
      };
      lines.push(currentLine);
    }

    if (firstLineOffset == null) {
      firstLineOffset = y;
    }

    currentLine.text += el.textContent;
    currentLine.xs.push(x);
    currentLine.ys.push(y);
    currentLine.height = height;
    lastY = y;
  });

  firstLineOffset = firstLineOffset || 0;

  return {
    firstLineHeight: lines.length > 0 ? lines[0].height : 0,
    firstLineOffset: firstLineOffset,
    height: divWrapper.offsetHeight - (2 * firstLineOffset),
    lines
  };
}

function measureNewHeight(options) {
  divWrapper = prepareDivWrapper(options);
  const firstLineOffset = divWrapper.firstChild.offsetTop;
  return divWrapper.offsetHeight - (2 * firstLineOffset);
}
