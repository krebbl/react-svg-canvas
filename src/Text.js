import React, {PropTypes} from 'react';
import bowser from 'bowser';
import Element from './Element';
import TextEditor from './TextEditor';
import EventListener from 'react-event-listener';
// whiteSpace: 'pre',
const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width', 'padding', 'maxWidth'];
const isFirefox = bowser.firefox;
const isChrome = bowser.chrome;
const isSafari = bowser.safari || (bowser.ios && bowser.safari);
const isMSIEdge = bowser.msie || bowser.msedge;
const textStyle = {whiteSpace: isMSIEdge ? 'pre-wrap' : '', textRendering: 'geometricPrecision'};
const isDebug = process.env.NODE_ENV !== 'production' && process.env.DEBUG;
const divFontSize = 20;

export default class Text extends Element {

  type = 'text';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    text: '',
    fontSize: 12,
    fontFamily: 'Verdana',
    verticalAlign: 'top',
    lineHeight: 1.5,
    textAlign: 'left',
    fill: 'black',
    padding: 2,
    editable: true,
    background: 'transparent',
    maxWidth: null,
    placeholder: 'Text',
    placeholderFill: 'lightgray'
  });

  static propTypes = Object.assign({}, Element.propTypes, {
    fill: PropTypes.string,
    fontFamily: PropTypes.string,
    fontSize: PropTypes.number,
    text: PropTypes.string,
    textAlign: PropTypes.oneOf(['left', 'center', 'right']),
    maxWidth: PropTypes.number,
    lineHeight: PropTypes.number,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom'])
  });

  constructor(props, context) {
    super(props, context);
    this.state = Object.assign({}, this.state, this.measureText(props));
  }

  measureText(props, withoutRects) {
    const width = (props.width ? props.width - (props.padding * 2) : 0);
    const maxWidth = (props.maxWidth ? props.maxWidth - (props.padding * 2) : 0);
    const options = Object.assign({}, props, {text: props.text || (!this.state.editing ? props.placeholder : ' '), width, maxWidth});
    const measurement = measureText(options, withoutRects);
    return {
      measurement: measurement,
      height: props.height || measurement.height + (2 * props.padding),
      width: props.width || measurement.width + (2 * props.padding)
    };
  }

  measureTextHeight(props) {
    return this.measureText(props, true).height;
  }

  renderKnobs() {
    if (this.state.editing) {
      return [];
    }
    return super.renderKnobs();
  }

  processChange(key, value, trigger = true) {
    if (key !== 'width' && wrapProperties.indexOf(key) > -1 && !this.props.height) {
      const change = {};
      change[key] = value;
      const measure = this.measureText(Object.assign({}, this.props, change), true);
      const anchorX = 0;
      const anchorY = 0;
      const np = this.calcNewPositionForSize(measure.width, measure.height, anchorX, anchorY);
      this.processChange('x', np.x, false);
      this.processChange('y', np.y, false);
    }
    super.processChange(key, value, trigger);
  }

  processKnobChange(knob, dir, diffVector) {
    if (dir === 'l' || dir === 'r') {
      let np, newHeight, newWidth;
      switch (dir) {
        case 'l':
          newWidth = this.props.width - diffVector.x;
          newHeight = this.measureTextHeight(Object.assign({}, this.props, {width: newWidth}));
          np = this.calcNewPositionForSize(newWidth, newHeight, 1, -1);
          this.processChange('x', np.x, false);
          this.processChange('y', np.y, false);
          this.processChange('width', newWidth, true);
          break;
        case 'r':
          // console.log(diffVector2.x);
          newWidth = this.props.width + diffVector.x;
          newHeight = this.measureTextHeight(Object.assign({}, this.props, {width: newWidth}));
          np = this.calcNewPositionForSize(newWidth, newHeight, -1, -1);
          this.processChange('x', np.x, false);
          this.processChange('y', np.y, false);
          this.processChange('width', newWidth, true);

          break;
        default:
          break;
      }
    } else {
      super.processChange(knob, dir, diffVector);
    }
  }

  componentWillReceiveProps(nextProps) {
    for (let i = 0; i < wrapProperties.length; i += 1) {
      let key = wrapProperties[i];
      if (nextProps[key] !== this.props[key]) {
        this.setState(this.measureText(nextProps));
        break;
      }
    }
  }

  componenWillUpdate(nextPRops, nextState) {
    if (!nextState.selected) {
      nextState.editing = false;
    }
  }

  componentDidMount() {
    this.wrapText();
    super.componentDidMount();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.measurement !== prevState.measurement) {
      this.wrapText();
    }

    super.componentDidUpdate(prevProps, prevState);

    if (this.state.editing !== prevState.editing) {
      this.context.api.selectionChanged();
      if (!this.state.editing) {
        this.textEditor && this.textEditor.deactivate();
      } else {
        this.textBefore = this.props.text;
        this.textEditor && this.textEditor.activate();
      }
    }
  }

  wrapText() {
    const rects = this.state.measurement.rects;
    const baseline = this.state.measurement.baseline;
    let textContent = this.props.text || this.props.placeholder;
    const svgRoot = this.svgRoot();
    const p = svgRoot.createSVGPoint();

    if (rects) {
      let rect;
      let textNode;
      const measureThreshold = this.props.fontSize * 0.2;
      let num;
      let lastTop = rects[0].top;
      let hardLines = textContent.split('\n');
      let hardLineIndex = 0;
      let lastLineIndex = hardLineIndex;
      let currentLine = hardLines[hardLineIndex];
      let currentLineIndex = hardLineIndex;
      let lastTextContent = '';
      for (let i = 0; i < rects.length; i++) {
        rect = rects[i];
        textNode = this.textWrapperNode.childNodes[i];
        textNode.removeAttributeNS(null, 'x');
        textNode.removeAttributeNS(null, 'y');
        if (lastTop !== rect.top) {
          currentLineIndex++;
        }
        // if we have a softbreak delete all leading spaces
        if (lastLineIndex === hardLineIndex && lastTop !== rect.top && !isMSIEdge) {
          if (/\s/.test(lastTextContent.substr(-1)) || isFirefox) {
            currentLine = currentLine.replace(/^\s+/, '');
          }
        }
        textNode.textContent = currentLine;

        p.y = rect.height * 0.5;
        p.x = rect.width > measureThreshold ? rect.width - measureThreshold : rect.width;
        lastLineIndex = hardLineIndex;

        num = textNode.getCharNumAtPosition(p);
        if (num > -1) {
          textNode.textContent = currentLine.substr(0, num + 1);
          currentLine = currentLine.substr(num + 1).replace(/\r$/, '');
        }

        textNode.setAttributeNS(null, 'x', rect.left);
        textNode.setAttributeNS(null, 'y', rect.top - Math.round(Math.min(0, textNode.getBBox().y)));

        if (num < 0 || ((isFirefox || isMSIEdge) && !currentLine)) {
          hardLineIndex += 1;
          currentLine = hardLines[hardLineIndex];
        }


        lastTop = rect.top;
        lastTextContent = textNode.textContent;
        if (!textNode.textContent) {
          textNode.textContent = ' ';
        }
      }
    }
  }

  handeTextEditor = (ref) => {
    this.textEditor = ref;
  };

  handleTextChange = (val) => {
    this.processChange('text', val, true);
  };

  handleTextBlur = () => {
    this.setState({editing: false});
    if (this.textBefore !== this.props.text) {
      this.context.api.saveInHistory();
    }
  };

  renderEditor() {
    if (this.props.editable) {
      const props = {};
      wrapProperties.forEach((key) => {
        props[key] = this.props[key];
      });
      props.fill = this.props.fill;

      const bbox = this.textWrapperNode.firstChild.getBBox();
      let textBaseline;
      if (isFirefox) {
        textBaseline = Math.ceil(bbox.y + bbox.height);
      } else if (isMSIEdge) {
        textBaseline = bbox.y + bbox.height;
      } else {
        textBaseline = Math.round(bbox.y + bbox.height);
      }
      let dy = textBaseline - this.state.measurement.baseline;
      if (!isMSIEdge) {
        dy = Math.round(dy);
      }
      return <TextEditor
        {...props}
        key={this.id}
        ref={this.handeTextEditor}
        x={this.props.padding} y={this.props.padding + dy}
        onTextChange={this.handleTextChange}
        onBlur={this.handleTextBlur}
        width={this.props.maxWidth || this.props.width ? (this.props.maxWidth || this.props.width) - (this.props.padding * 2) - 0.01 : 'auto'}
        height={(this.state.height || 0) - (this.props.padding * 2)}
        text={this.props.text}
      />;
    } else {
      return null;
    }
  }

  handleTextDown = (e) => {
    if (this.state.editable) {
      e.stopPropagation();
    }
    if (this.props.editable && this.state.selected) {
      this.textDownTime = e.timeStamp;
    }
  };

  handleTextUp = (e) => {
    if (!this.state.moving && this.props.editable && this.state.selected) {
      if (e.timeStamp - this.textDownTime < 200) {
        this.setState({editing: true});
      }
    }
  };

  handleKeyPress = (e) => {
    if (e.srcElement === document.body && !(e.metaKey || e.ctrlKey) && !this.state.editing) {
      this.processChange('text', '', true);
      this.setState({editing: true});
    }
  };

  handleTextWrapperRef = (ref) => {
    this.textWrapperNode = ref;
  };

  calcBBox() {
    return this.textBoxNode ? this.textBoxNode.getBBox() : null;
  }

  handleTextBBox = (ref) => {
    this.textBoxNode = ref;
  };

  renderChildren() {
    // wrap lines
    const rects = this.state.measurement.rects;
    if (rects.length === 0) {
      return null;
    }
    let y = 0;
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
      onTouchStart={this.handleTextDown}
      onMouseDown={this.handleTextDown}
      onMouseUp={this.handleTextUp}
      onTouchEnd={this.handleTextUp}
    >
      {this.state.selected ? <EventListener target="window" onKeyPress={this.handleKeyPress}/> : null}
      <rect
        ref={this.handleTextBBox}
        y={y}
        width={this.props.width || (this.state.width)}
        height={this.props.heigth || this.state.height}
        fill={this.props.background}
      />
      <g>
        {isDebug ? rects.map((line, i) => {
          return <rect
            key={`${i}'_'${line.left}`}
            width={line.width} height={line.height}
            x={line.left}
            y={line.top}
            fill="green"
          />;
        }) : null}
      </g>
      <g transform={`translate(${this.props.padding}, ${y + this.props.padding})`}>
        <g ref={this.handleTextWrapperRef}>
          {rects.map((line, i) => {
            return <text
              key={`${i}'_'${line.left}`} xmlSpace="preserve" className="no-select" style={textStyle} fontFamily={this.props.fontFamily} fontSize={Math.round(this.props.fontSize * 100) / 100}
              dy="1em" y={line.top} fill={this.state.editing ? 'transparent' : this.props.fill}
            />;
          })}
        </g>
      </g>
    </g>);
  }

}


var divWrapper;
function createDivWrapper() {
  const outsideWrapper = document.createElement('div');
  outsideWrapper.style.position = 'fixed';
  outsideWrapper.style.width = '99999px';
  outsideWrapper.style.height = '99999px';
  outsideWrapper.style.overflow = 'hidden';
  outsideWrapper.style.zIndex = '-1';


  const ret = document.createElement('div');
  ret.style.position = 'absolute';
  ret.style.zIndex = '-1';
  ret.style.whiteSpace = 'pre-wrap';
  ret.style.wordWrap = 'break-word';
  ret.style.wordBreak = 'break-word'; // for FF
  ret.style.color = 'transparent';
  ret.style.textRendering = 'geometricPrecision';
  ret.style.padding = '0';

  outsideWrapper.appendChild(ret);
  document.body.appendChild(outsideWrapper);

  return ret;
}
function prepareDivWrapper(options) {
  const {text, fontSize, fontFamily, maxWidth, width, textAlign, lineHeight} = options;
  const actualWidth = maxWidth || width;
  divWrapper = divWrapper || createDivWrapper();
  divWrapper.innerHTML = '';
  divWrapper.style.fontFamily = fontFamily;
  divWrapper.style.lineHeight = lineHeight;
  divWrapper.style.fontSize = `${Math.round(fontSize * 10) / 10}px`;
  divWrapper.style.width = actualWidth ? `${actualWidth}px` : 'auto';
  divWrapper.style.textAlign = textAlign;
  divWrapper.innerHTML = `<span>${text.replace(/\r?\n/gi, '<br/>')}</span>`;

  return divWrapper;
}

function measureText(options, withoutRects) {
  divWrapper = prepareDivWrapper(options);
  const rects = divWrapper.firstChild.getClientRects();
  const topRect = divWrapper.getBoundingClientRect();
  const firstLineOffset = rects.length ? rects[0].top - topRect.top : 0;
  const baseline = (rects.length ? rects[0].bottom - topRect.top : 0);
  let width = 0;
  [].forEach.call(rects, (rect) => {
    width = Math.max(rect.width, width);
  });
  return {
    width: width,
    height: divWrapper.offsetHeight - (2 * firstLineOffset),
    firstLineOffset: firstLineOffset,
    baseline: baseline,
    rects: !withoutRects ? [].map.call(rects, (rect) => {
      return {
        left: (rect.left - topRect.left),
        top: (rect.top - topRect.top - firstLineOffset),
        bottom: (rect.bottom - topRect.top),
        absoluteBottom: topRect.bottom,
        width: rect.width,
        height: rect.height
      };
    }) : []
  };
};
