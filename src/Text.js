import React, {PropTypes} from 'react';
import bowser from 'bowser';
import shallowequal from 'shallowequal';
import Element from './Element';
import TextEditor from './TextEditor';
import EventListener from 'react-event-listener';
import MobileTextEditor from './MobileTextEditor';

const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAnchor', 'width', 'padding', 'maxWidth', 'maxHeight', 'height'];
const compareProps = wrapProperties.concat(['bullets', 'padding', 'placeholder', 'placeholderFill', 'fill']);
const isFirefox = bowser.firefox;
const isMSIEdge = bowser.msie || bowser.msedge;
const textStyle = {whiteSpace: isMSIEdge ? 'pre-wrap' : '', textRendering: 'geometricPrecision', userSelect: 'none', pointerEvents: 'none'};
const isDebug = process.env.NODE_ENV !== 'production' && process.env.DEBUG;
const textAlignMap = {
  start: 'left',
  middle: 'center',
  end: 'right'
};

const WRAPPER_FONT_SIZE = 16;

function positionTextNode(textNode, rect, textAnchor, innerWidth) {
  let x = rect.left;
  const y = rect.top - Math.round(Math.min(0, textNode.getBBox().y));

  if (!isMSIEdge) {
    textNode.setAttributeNS(null, 'text-anchor', textAnchor);
    switch (textAnchor) {
      case 'middle':
        x = innerWidth * 0.5;
        break;
      case 'end':
        x = innerWidth;
        break;
      default:
        break;
    }
  }
  textNode.setAttributeNS(null, 'x', `${x}`);
  textNode.setAttributeNS(null, 'y', `${y}`);
}

export class TextRenderer extends React.Component {

  static type = 'text';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    text: '',
    fontSize: 12,
    fontFamily: 'Verdana',
    verticalAlign: 'top',
    lineHeight: 1.3,
    textAnchor: 'start',
    fill: 'black',
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
    textAnchor: PropTypes.oneOf(['start', 'middle', 'end']),
    maxWidth: PropTypes.number,
    lineHeight: PropTypes.number,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom'])
  });

  constructor(props, context) {
    super(props, context);
    this.state = this.measureText(props);
  }

  shouldComponentUpdate(nextProps, nextState, nextContext) {
    const k = compareProps.find((key) => this.props[key] !== nextProps[key]);
    return !shallowequal(this.state, nextState) || !shallowequal(this.context, nextContext) || !!k;
  }

  measureText(props, withoutRects) {
    const scaleFactor = WRAPPER_FONT_SIZE / props.fontSize;
    const options = Object.assign({}, props, {
      fontSize: WRAPPER_FONT_SIZE,
      text: props.text || (!this.state.editing ? props.placeholder : ' '),
      width: (props.width ? props.width : 0) * scaleFactor,
      maxWidth: (props.maxWidth ? props.maxWidth : 0) * scaleFactor,
      textAlign: textAlignMap[props.textAnchor]
    });
    const measurement = measureText(options, withoutRects);
    measurement.height /= scaleFactor;
    measurement.width /= scaleFactor;
    return {
      measurement
    };
  }

  measureTextHeight(props) {
    return this.measureText(props, true).measurement.height;
  }

  renderKnobs() {
    if (this.state.editing) {
      return [];
    }
    return null;
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

  componentWillUpdate(nextProps, nextState) {
    if (!nextProps.selected) {
      nextState.editing = false;
    }
  }

  componentDidMount() {
    this.wrapText();
  }

  componentDidUpdate(prevProps, prevState) {
    this.wrapText();

    if (!prevProps.selected && this.props.selected) {
      this.node.focus();
    }

    if (this.state.editing !== prevState.editing) {
      this.context.api.updateSelection(this);
      if (!this.state.editing) {
        this.context.api.finishChange();
        this.textEditor && this.textEditor.deactivate();
      } else {
        this.context.api.startChange();
        this.textEditor && this.textEditor.activate();
      }
    }

    this.textEditor && this.textEditor.repositionTextArea();
  }

  svgRoot() {
    return this.node.viewportElement;
  }

  wrapText() {
    const rects = this.state.measurement.rects;
    const baseline = this.state.measurement.baseline;
    let textContent = this.props.text || this.props.placeholder;
    const svgRoot = this.svgRoot();
    const p = svgRoot.createSVGPoint();
    const innerWidth = (this.props.width ? this.props.width : 0) * (WRAPPER_FONT_SIZE / this.props.fontSize);

    if (rects) {
      const measureThreshold = 0.7;
      const hardLines = textContent.split('\n');
      const hardLineIndex = 0;
      let rect;
      let textNode;
      let num;
      let lastTop = rects[0].top;
      let lastLineIndex = hardLineIndex;
      let currentLine = hardLines[hardLineIndex];
      let lastTextContent = '';
      let rectIndex = 0;
      hardLines.forEach((hardLine) => {
        currentLine = hardLine;
        if (rectIndex < rects.length) {
          if (!currentLine) {
            rect = rects[rectIndex];
            textNode = this.textWrapperNode.childNodes[rectIndex];
            textNode.textContent = ' ';
            positionTextNode(textNode, rect, this.props.textAnchor, innerWidth);
            rectIndex++;
          } else {
            while (currentLine.length > 0 && rectIndex < rects.length) {
              // prepare text node for measuring
              rect = rects[rectIndex];
              textNode = this.textWrapperNode.childNodes[rectIndex];
              textNode.removeAttributeNS(null, 'x');
              textNode.removeAttributeNS(null, 'y');
              textNode.removeAttributeNS(null, 'text-anchor');

              // if there is a soft break and the hardline is already broken
              // trim all leading white spaces from the current line
              if (lastTop !== rect.top && currentLine !== hardLine) {
                if (/\s/.test(lastTextContent.substr(-1)) || isFirefox) {
                  currentLine = currentLine.replace(/^\s+/, '');
                }
              }
              // set textContent for measuring
              textNode.textContent = currentLine;

              // configure measure point
              p.y = rect.height * 0.5;
              p.x = rect.width;

              // if the measure point is wider than the text node,
              // then use the full text content length
              if (p.x > textNode.getBBox().width) {
                num = textNode.textContent.length - 1;
              } else {
                // else get the char position of the measure point
                num = textNode.getCharNumAtPosition(p);
                // if the num is smaller 0, we measured over the text content
                // so its the text content length - 1
                if (num < 0) {
                  num = textNode.textContent.length - 1;
                } else {
                  // else check if the endposition of the measured char
                  // is inside the measure point
                  // if not, move to prev char
                  if (num > 0) {
                    while (textNode.getEndPositionOfChar(num).x - p.x > measureThreshold) {
                      num--;
                    }
                  }
                }
              }
              // cut the current line apart
              if (num > -1) {
                textNode.textContent = currentLine.substr(0, num + 1);
                currentLine = currentLine.substr(num + 1).replace(/\r$/, '');
              }
              // position text node by text anchor
              positionTextNode(textNode, rect, this.props.textAnchor, innerWidth);

              // save last rect top
              lastTop = rect.top;
              lastTextContent = textNode.textContent;

              // move to next measure rect
              rectIndex++;

              let nextRect = rects[rectIndex];
              // if the current line is empty
              // and the next rect is on the same line
              // jump over it
              // we don't need to handle it
              if (!currentLine && nextRect && nextRect.top === lastTop) {
                rectIndex++;
              }
            }
          }
        }
      });

    }
  }

  handeTextEditor = (ref) => {
    this.textEditor = ref;
  };

  handleTextChange = (val) => {
    this.props._wrapper.processChange('text', val, true);
  };

  handleTextBlur = () => {
    this.setState({editing: false});
  };

  renderEditor() {
    if (this.props.editable) {
      const props = {};
      wrapProperties.forEach((key) => {
        props[key] = this.props[key];
      });
      props.textAlign = textAlignMap[this.props.textAnchor];
      props.fill = this.props.fill;
      props.fontSize = WRAPPER_FONT_SIZE;
      props.scaleFactor = this.props.fontSize / WRAPPER_FONT_SIZE;

      const maxWidth = this.props.maxWidth ? this.props.maxWidth - 0.01 : null;
      const width = this.props.width ? (this.props.width) - 0.01 : null;

      if(this.props.useMobileEditor) {
        return <MobileTextEditor {...props}
                                 key={this.props.id}
                                 ref={this.handeTextEditor}
                                 maxWidth={maxWidth}
                                 width={width}
                                 onTextChange={this.handleTextChange}
                                 onBlur={this.handleTextBlur}
        />
      }

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

      if (this.props.height) {
        const calculatedBoxHeight = this.state.measurement.height;
        switch (this.props.verticalAlign) {
          case 'middle':
            dy += (this.props.height - calculatedBoxHeight) * 0.5;
            break;
          case 'bottom':
            dy += (this.props.height - calculatedBoxHeight);
            break;
        }
      }

      return <TextEditor
        {...props}
        key={this.props.id}
        ref={this.handeTextEditor}
        maxWidth={maxWidth}
        width={width}
        onTextChange={this.handleTextChange}
        onBlur={this.handleTextBlur}
        text={this.props.text}
        x={0} y={(dy * props.scaleFactor)}
        height={(this.state.height || 0)}
      />;
    } else {
      return null;
    }
  }

  handleTextDown = (e) => {
    if (!this.props.editable) {
      return;
    }
    if (this.state.editing) {
      e.stopPropagation();
    }
    if (this.props.editable && this.props.selected) {
      this.textDownTime = e.timeStamp;
    }
  };

  handleTextUp = (e) => {
    if (!this.state.moving && this.props.editable && this.props.selected) {
      if (e.timeStamp - this.textDownTime < 200) {
        this.setState({editing: true});
      }
    }
  };

  handleKeyPress = (e) => {
    if (this.props.selected && !e.defaultPrevented && e.target === this.context.canvas.wrapperNode && !(e.metaKey || e.ctrlKey) && !this.state.editing && e.charCode > 0) {
      e.preventDefault();
      this.processChange('text', String.fromCharCode(e.charCode), true);
      this.setState({editing: true});
    }
  };

  handleTextWrapperRef = (ref) => {
    this.textWrapperNode = ref;
  };

  handleNode = (ref) => {
    this.node = ref;
  };

  render() {
    const measurement = this.state.measurement;
    const rects = measurement.rects;
    const calculatedBoxHeight = measurement.height;
    const height = this.props.height || 0;
    const width = this.props.width || 0;

    if (rects.length === 0) {
      return null;
    }
    let y = 0;
    let x = 0;
    switch (this.props.verticalAlign) {
      case 'top':
        y = 0;
        break;
      case 'bottom':
        y = height - calculatedBoxHeight;
        break;
      case 'middle':
        y = (height - calculatedBoxHeight) * 0.5;
        break;
      default:
        break;
    }

    let tx = 0;
    const calculatedBoxWidth = measurement.width;
    switch (this.props.textAnchor) {
      case 'start':
        break;
      case 'middle':
        tx = 0;
        x = (width - calculatedBoxWidth) * 0.5;
        break;
      case 'end':
        x = (width - calculatedBoxWidth);
        tx = -tx;
        break;
      default:
        break;
    }

    return (<g
      ref={this.handleNode}
      transform={`translate(0, ${y})`}
      onTouchStart={this.handleTextDown}
      onMouseDown={this.handleTextDown}
      onMouseUp={this.handleTextUp}
      onTouchEnd={this.handleTextUp}
    >
      <EventListener target="window" onKeyPress={this.handleKeyPress}/>
      {<g ref={this.handleTextBBox}>
        <rect
          transform={`translate(${x}, 0)`}
          width={this.props.width || (measurement.width)}
          height={measurement.height}
          fill={this.props.background}
        />
      </g>}
      {<g transform={`translate(${tx}, 0)`}>
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
        <g ref={this.handleTextWrapperRef} transform={`scale(${this.props.fontSize / WRAPPER_FONT_SIZE})`}>
          {rects.map((line, i) => {
            return <text
              key={`${i}'_'${line.left}`} xmlSpace="preserve" style={textStyle} fontFamily={this.props.fontFamily} fontSize={WRAPPER_FONT_SIZE}
              dy="1em" fill={this.state.editing ? 'transparent' : this.props.fill}
            />;
          })}
        </g>
      </g>}
    </g>);
  }

}

export default Element.createClass(TextRenderer);


let divWrapper;
function createDivWrapper() {
  const outerOutsideWrapper = document.createElement('div');
  outerOutsideWrapper.style.position = 'absolute';
  outerOutsideWrapper.style.width = '100px';
  outerOutsideWrapper.style.height = '100px';
  outerOutsideWrapper.style.overflow = 'hidden';
  outerOutsideWrapper.style.zIndex = '-1';

  const outsideWrapper = document.createElement('div');
  outsideWrapper.style.position = 'absolute';
  outsideWrapper.style.width = '999999px';
  outsideWrapper.style.height = '999999px';
  outsideWrapper.style.overflow = 'hidden';


  const ret = document.createElement('div');
  ret.style.position = 'absolute';
  ret.style.zIndex = '-1';
  ret.style.whiteSpace = 'pre-wrap';
  ret.style.wordWrap = 'break-word';
  ret.style.wordBreak = 'break-word'; // for FF
  ret.style.color = 'transparent';
  ret.style.textRendering = 'geometricPrecision';
  ret.style.padding = '0';
  ret.setAttribute('contenteditable', 'true');

  outsideWrapper.appendChild(ret);
  outerOutsideWrapper.appendChild(outsideWrapper);

  document.body.appendChild(outerOutsideWrapper);

  return ret;
}

function prepareDivWrapper(options) {
  const scaleFactor = WRAPPER_FONT_SIZE / options.fontSize;
  const {text, fontFamily, maxWidth, width, maxHeight, textAnchor, lineHeight} = options;
  divWrapper = divWrapper || createDivWrapper();
  divWrapper.innerHTML = '';
  divWrapper.style.fontFamily = fontFamily;
  divWrapper.style.whiteSpace = !width && !maxWidth ? 'nowrap' : 'pre-wrap';
  divWrapper.style.lineHeight = lineHeight || 1.3;
  divWrapper.style.fontSize = `${WRAPPER_FONT_SIZE}px`;
  divWrapper.style.width = width ? `${width * scaleFactor}px` : 'auto';
  divWrapper.style.maxWidth = maxWidth ? `${maxWidth * scaleFactor}px` : 'none';
  divWrapper.style.maxHeight = maxHeight ? `${maxHeight * scaleFactor}px` : 'none';
  divWrapper.style.textAlign = textAlignMap[textAnchor];
  let innerText = (text == null ? '' : text + '').replace(/\n$/, isMSIEdge ? '\n&nbsp;' : '\n\n').replace(/\r?\n/gi, '<br/>');
  if (divWrapper.style.whiteSpace === 'nowrap') {
    innerText = innerText.replace(/\s/g, '&nbsp;');
  }
  divWrapper.innerHTML = `<span>${innerText}</span>`;

  return divWrapper;
}

function measureText(options, withoutRects) {
  const scaleFactor = WRAPPER_FONT_SIZE / options.fontSize;
  divWrapper = prepareDivWrapper(options);
  const rects = divWrapper.firstChild.getClientRects();
  const topRect = divWrapper.getBoundingClientRect();
  const firstLineOffset = (rects.length ? rects[0].top - topRect.top : 0);
  const baseline = (rects.length ? rects[0].bottom - topRect.top : 0);
  let width = topRect.width;
  [].forEach.call(rects, (rect) => {
    width = Math.max(rect.width, width);
  });

  let retRects = [].map.call(rects, (rect) => {
    return {
      left: (rect.left - topRect.left),
      top: (rect.top - topRect.top - firstLineOffset),
      bottom: (rect.bottom - topRect.top),
      absoluteBottom: topRect.bottom,
      width: rect.width,
      height: rect.height
    };
  });
  let height = (divWrapper.offsetHeight - (2 * firstLineOffset));
  const optionHeight = options.maxHeight || options.height;
  if (optionHeight) {
    const maxHeight = optionHeight * scaleFactor;
    retRects = retRects.filter(rect => {
      const fitsIn = rect.top + rect.height + 2 * firstLineOffset < maxHeight;
      height = fitsIn ? rect.top + rect.height : height;
      return fitsIn;
    });
  }

  return {
    width: width / scaleFactor,
    height: height / scaleFactor,
    firstLineOffset: firstLineOffset,
    firstLineHeight: (rects[0].height) / scaleFactor,
    baseline: baseline,
    rects: retRects
  };
}
