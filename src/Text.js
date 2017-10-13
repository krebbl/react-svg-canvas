import React, {PropTypes} from 'react';
import bowser from 'bowser';
import shallowequal from 'shallowequal';
import Element from './Element';
import TextEditor from './TextEditor';
import EventListener from 'react-event-listener';
import MobileTextEditor from './MobileTextEditor';
import escapeHtml from 'html-escape';

const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'maxLines', 'textAnchor', 'width', 'padding', 'maxWidth', 'maxHeight', 'height', 'selected', 'bending'];
const compareProps = wrapProperties.concat(['padding', 'placeholder', 'placeholderFill', 'fill', 'background']);
const isFirefox = bowser.firefox;
const isMSIEdge = bowser.msie || bowser.msedge;
const isChrome = bowser.chrome;
const textStyle = {whiteSpace: isMSIEdge ? 'pre-wrap' : '', textRendering: 'geometricPrecision', userSelect: 'none', cursor: 'default', pointerEvents: 'none'};
const isDebug = process.env.NODE_ENV !== 'production' && process.env.DEBUG;
const textAlignMap = {
  start: 'left',
  middle: 'center',
  end: 'right'
};
const UNBREAKABLE_WS = String.fromCharCode(160);
const WRAPPER_FONT_SIZE = 16;

function positionTextNode(textNode, rect, textAnchor, innerWidth, measurement, scaleFactor) {
  let x = rect.left;
  let y = rect.top - Math.round(textNode.getBBox().y) + scaleFactor * measurement.firstLineHeight - textNode.getBBox().height;

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
  textNode.setAttributeNS(null, 'x', `${x}`);
  textNode.setAttributeNS(null, 'y', `${y}`);
}

function createBendingPath(innerWidth, radius, lineHeight, lineIndex, totalLines, y) {
  let d = "";
  const dr = radius > 0 ? totalLines - 1 - lineIndex : -lineIndex;
  radius += lineHeight * dr;
  if (radius > 0) {
    d = `M ${innerWidth * 0.5}, ${radius + y + WRAPPER_FONT_SIZE}
        m 0, ${radius}
        a ${radius},${radius} 0 1,1 0,-${radius * 2}
        a ${radius},${radius} 0 1,1 0,${radius * 2}`;
  } else {
    d = `M ${innerWidth * 0.5}, ${radius + y}
        m 0, ${radius}
        a ${Math.abs(radius)},${Math.abs(radius)} 0 1,0 0,${-radius * 2}
        a ${Math.abs(radius)},${Math.abs(radius)} 0 1,0 0,${radius * 2}`;
  }
  return d;
}

function isNumber(e) {
  return typeof e === 'number';
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
    removeEmpty: false,
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
    removeEmpty: PropTypes.bool,
    textAnchor: PropTypes.oneOf(['start', 'middle', 'end']),
    maxWidth: PropTypes.number,
    lineHeight: PropTypes.number,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom']),
    bending: PropTypes.number
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
    const realSidePadding = props.padding * 2;
    const isEditing = this.state && this.state.editing;
    const options = Object.assign({}, props, {
      text: this.cleanText(props.text || (!isEditing ? props.placeholder : ' ')),
      width: (isNumber(props.width) ? props.width - realSidePadding : null),
      maxWidth: (isNumber(props.maxWidth) ? props.maxWidth - realSidePadding : null),
      maxHeight: props.maxHeight,
      height: null
    });
    const measurement = measureText(options, withoutRects);
    let bendingRadius = 0;
    if (measurement.rects.length && Math.abs(props.bending) > 1) {
      const rect = measurement.rects[props.bending > 0 ? measurement.rects.length - 1 : 0];
      bendingRadius = 360 / props.bending * rect.width / (Math.PI * 2);
    }
    return {
      bendingRadius,
      measurement
    };
  }

  cleanText(text) {
    let textContent = text;
    textContent = textContent == null ? '' : textContent + '';
    if (this.props.singleLine) {
      return textContent.replace(/\n/g, ' ');
    }
    textContent = textContent.replace(/(\n|\r)\u0020/g, "$1" + UNBREAKABLE_WS).replace(/\s(?=\s)/g, UNBREAKABLE_WS).replace(/^\s|\s$/g, UNBREAKABLE_WS);
    return textContent || '';
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
    if (!nextProps.selected) {
      this.setState({editing: false});
    }
  }

  componentDidMount() {
    this.wrapText();
    if (this.node) {
      this.node.addEventListener('touchstart', this.handleTextDown);
      this.node.addEventListener('mousedown', this.handleTextDown);
      this.node.addEventListener('mouseup', this.handleTextUp);
      this.node.addEventListener('touchend', this.handleTextUp);
    }
  }

  componentWillUnmount() {
    if (this.node) {
      this.node.removeEventListener('touchstart', this.handleTextDown);
      this.node.removeEventListener('mousedown', this.handleTextDown);
      this.node.removeEventListener('mouseup', this.handleTextUp);
      this.node.removeEventListener('touchend', this.handleTextUp);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    this.wrapText();

    if (this.state.editing !== prevState.editing) {
      this.context.api.updateSelection(this.props.id);
      if (!this.state.editing) {
        if (this.props.removeEmpty && !this.props.text) {
          this.context.api.removeElement(this.props.id);
        }
        this.context.api.finishChange();
        this.textEditor && this.textEditor.deactivate();
      } else {
        this.context.api.startChange();
        this.textEditor && this.textEditor.activate();
      }
    }

    this.textEditor && this.textEditor.repositionTextArea();
  }

  getBBoxNode() {
    return this.textBBoxNode || this.node;
  }

  svgRoot() {
    return this.node.viewportElement;
  }

  wrapText() {
    const {text, placeholder, width, fontSize, textAnchor, lineHeight} = this.props;
    const {bendingRadius, measurement} = this.state;
    const rects = measurement.rects;
    const baseline = measurement.baseline;
    let textContent = this.cleanText(text || placeholder);
    const svgRoot = this.svgRoot();
    const p = svgRoot.createSVGPoint();
    const scaleFactor = (WRAPPER_FONT_SIZE / fontSize);
    const innerWidth = (width ? width : 0) * scaleFactor;

    if (rects) {
      const measureThreshold = 0.7;
      const hardLines = textContent.split('\n');
      const hardLineIndex = 0;
      let rect;
      let textNode;
      let num;
      let lastTop = rects[0].top;
      let currentLine = hardLines[hardLineIndex];
      let lastTextContent = '';
      let rectIndex = 0;
      const textLines = [];
      hardLines.forEach((hardLine) => {
        currentLine = hardLine;
        if (rectIndex < rects.length) {
          if (!currentLine) {
            rect = rects[rectIndex];
            textNode = this.textWrapperNode.childNodes[rectIndex];
            textNode.textContent = ' ';
            textNode.setAttributeNS(null, "dy", '1em');
            textLines.push(textNode);
            positionTextNode(textNode, rect, textAnchor, innerWidth, measurement, scaleFactor);
            rectIndex++;
          } else {
            while (currentLine.length > 0 && rectIndex < rects.length) {
              // prepare text node for measuring
              rect = rects[rectIndex];
              textNode = this.textWrapperNode.childNodes[rectIndex];
              textNode.setAttributeNS(null, "dy", '1em');
              textNode.removeAttributeNS(null, 'x');
              textNode.removeAttributeNS(null, 'y');
              textNode.removeAttributeNS(null, 'text-anchor');

              // if there is a soft break and the hardline is already broken
              // trim all leading white spaces from the current line
              if (lastTop !== rect.top && currentLine !== hardLine && ((isChrome) && textAnchor === 'left' || !(isChrome))) {
                if (/\s/.test(lastTextContent.substr(-1)) || isFirefox || isMSIEdge) {
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
              positionTextNode(textNode, rect, textAnchor, innerWidth, measurement, scaleFactor);

              // save last rect top
              lastTop = rect.top;
              lastTextContent = textNode.textContent;

              // move to next measure rect
              rectIndex++;

              if (textNode.textContent) {
                textLines.push(textNode)
              }

              let nextRect = rects[rectIndex];
              // if the current line is empty
              // and the next rect is on the same line
              // jump over it
              // we don't need to handle it
              if (!currentLine && nextRect && nextRect.top === lastTop) {
                textNode = this.textWrapperNode.childNodes[rectIndex];
                textNode.textContent = '';
                rectIndex++;
              }
            }
          }
        }
      });

      if (bendingRadius && textLines.length) {
        const defNode = this.defNode;
        const numHardlines = textLines.length;
        defNode.innerHTML = "";
        textLines.forEach((textNode, i) => {
          if (!textNode.textContent) {
            return;
          }
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const y = parseFloat(textNode.getAttributeNS(null, 'y'));
          path.setAttributeNS(null, "d", createBendingPath(innerWidth, bendingRadius, WRAPPER_FONT_SIZE * lineHeight, i, numHardlines, y));
          const id = "v_tbPath_" + this.props.id + '_' + i;
          path.setAttributeNS(null, "id", id);
          const textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
          textPath.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + id);
          textNode.setAttributeNS(null, "x", 0);
          textNode.setAttributeNS(null, "y", 0);
          textNode.removeAttributeNS(null, "dy");
          textNode.setAttributeNS(null, "dy", bendingRadius > 0 ? '0' : '1em');

          textNode.setAttributeNS(null, "text-anchor", "middle");

          textPath.setAttributeNS(null, "startOffset", "50%");
          defNode.appendChild(path);
          textPath.textContent = textNode.textContent;
          textNode.replaceChild(textPath, textNode.firstChild);
        });
      }

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

      if (this.props.useMobileEditor) {
        return <MobileTextEditor {...props}
                                 key={this.props.id}
                                 ref={this.handeTextEditor}
                                 maxWidth={"100%"}
                                 width={width}
                                 onTextChange={this.handleTextChange}
                                 onBlur={this.handleTextBlur}
        />
      }

      if (this.props.bending) {
        return null;
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
    if (this.props.selected) {

      if (this.state.editing) {
        e.stopPropagation();
      }

      if (this.props.editable && this.props.selected) {
        this.textDownTime = e.timeStamp;
      } else {
        this.textDownTime = 0;
      }
    }

  };

  handleTextUp = (e) => {
    if (!this.state.moving && this.props.editable && this.props.selected && !this.props.bending) {
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

  handleTextBBox = (ref) => {
    this.textBBoxNode = ref;
  };

  handleDefs = (ref) => {
    this.defNode = ref;
  };

  render() {
    let {bending, height, width, background, fontFamily, fill, maxWidth, padding, textAnchor, verticalAlign, fontSize} = this.props;
    const {bendingRadius} = this.state;
    const measurement = this.state.measurement;
    const rects = measurement.rects;
    const calculatedBoxHeight = measurement.height;
    height = Math.max(height || 0, 0);
    width = Math.max(width || 0, 0);

    if (rects.length === 0) {
      return null;
    }
    let y = 0;
    let x = 0;
    switch (verticalAlign) {
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
    switch (textAnchor) {
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

    const bboxHeight = isNumber(this.props.height) ? this.props.height : calculatedBoxHeight;
    const bboxWidth = isNumber(this.props.width) ? this.props.width : calculatedBoxWidth;
    const scaleFactor = fontSize / WRAPPER_FONT_SIZE;

    return (<g
      ref={this.handleNode}
      transform={`translate(0, ${y})`}
    >
      <EventListener target="window" onKeyPress={this.handleKeyPress}/>
      <g>
        {!bendingRadius && <rect
          ref={this.handleTextBBox}
          x={x}
          y={isNumber(this.props.height) ? 0 : y}
          width={bboxWidth}
          height={bboxHeight}
          fill={background}
        />}
      </g>
      <defs ref={this.handleDefs}/>
      <g transform={`translate(${tx}, 0)`}>
        {isDebug ? <g transform={`scale(${scaleFactor})`}>
          {rects.map((line, i) => {
            return <rect
              key={`${i}'_'${line.left}`}
              width={line.width} height={line.height}
              x={line.left}
              y={line.top}
              fill="green"
            />;
          })}
        </g> : null}
        <g ref={this.handleTextWrapperRef} transform={`scale(${scaleFactor})`}>
          {rects.map((line, i) => {
            return <text
              key={`${i}'_'${line.left}`} xmlSpace="preserve" style={textStyle} fontFamily={fontFamily} fontSize={WRAPPER_FONT_SIZE}
              dy="1em" fill={this.state.editing ? 'transparent' : fill}
            />;
          })}
        </g>
      </g>
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

function prepareOptions(options) {
  const ret = Object.assign({
    lineHeight: 1.3
  }, options);
  if (isNumber(ret.maxLines)) {
    ret.maxHeight = ret.lineHeight * ret.fontSize * (ret.maxLines + 0.5);
  }

  return ret;
}

function prepareDivWrapper(options) {
  const scaleFactor = WRAPPER_FONT_SIZE / options.fontSize;
  let {text, fontFamily, maxWidth, maxHeight, width, textAnchor, lineHeight} = options;
  divWrapper = divWrapper || createDivWrapper();
  divWrapper.innerHTML = '';
  divWrapper.style.fontFamily = fontFamily;
  divWrapper.style.whiteSpace = !width && !maxWidth ? 'nowrap' : 'normal';
  divWrapper.style.lineHeight = lineHeight || 1.3;
  divWrapper.style.fontSize = `${WRAPPER_FONT_SIZE}px`;
  divWrapper.style.width = isNumber(width) ? `${width * scaleFactor}px` : 'auto';
  divWrapper.style.maxWidth = isNumber(maxWidth) ? `${Math.max(maxWidth, 0) * scaleFactor}px` : 'none';
  divWrapper.style.maxHeight = isNumber(maxHeight) ? `${Math.max(maxHeight, 0) * scaleFactor}px` : 'none';
  divWrapper.style.textAlign = textAlignMap[textAnchor];
  if (/^\n+$/.test(text)) {
    text = ' ' + text;
  }
  let innerText = escapeHtml(text == null ? '' : text + '').replace(/\n$/, isMSIEdge ? '\n&nbsp;' : '\n\n').replace(/\r?\n/gi, '<br/>');
  innerText = innerText.replace(/\s(?=\s)/g, '&nbsp;').replace(/^\s|\s$/g, '&nbsp;');
  divWrapper.innerHTML = `<span>${innerText}</span>`;

  return divWrapper;
}

function measureText(options, withoutRects) {
  const preparedOptions = prepareOptions(options);
  divWrapper = prepareDivWrapper(preparedOptions);
  const scaleFactor = WRAPPER_FONT_SIZE / preparedOptions.fontSize;
  let rects = divWrapper.firstChild.getClientRects();
  const topRect = divWrapper.getBoundingClientRect();
  const firstLineOffset = (rects.length ? rects[0].top - topRect.top : 0);
  const baseline = (rects.length ? rects[0].bottom - topRect.top : 0);
  let width = topRect.width;
  const maxWidth = options.maxWidth ? options.maxWidth * scaleFactor : 0;
  Array.prototype.forEach.call(rects, (rect) => {
    width = Math.max(rect.width, width);
  });
  if (maxWidth && maxWidth < width) {
    const index = Array.prototype.findIndex.call(rects, (rect) => {
      return rect.width > maxWidth;
    });
    if (index > -1) {
      rects = Array.prototype.slice.call(rects, 0, index);
    }
  }

  let retRects = Array.prototype.map.call(rects, (rect) => {
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
  let outerHeight = height;

  const optionHeight = preparedOptions.maxHeight || preparedOptions.height;
  let hasOverflow = false;
  if (optionHeight) {
    outerHeight = retRects.length ? retRects[retRects.length - 1].top + retRects[retRects.length - 1].height : 0;
    const maxHeight = Math.round((optionHeight * scaleFactor) * 100) / 100;
    retRects = retRects.filter(rect => {
      const fitsIn = rect.top + rect.height <= maxHeight;
      height = fitsIn ? rect.top + rect.height : height;
      hasOverflow = hasOverflow || !fitsIn;
      return fitsIn;
    });
  }
  let outerWidth = width;
  if (maxWidth) {
    let maxWidth = 0;
    retRects.forEach((rect) => {
      maxWidth = Math.max(rect.width, maxWidth);
    });
    width = maxWidth;
  }

  return {
    width: width / scaleFactor,
    height: height / scaleFactor,
    firstLineOffset: firstLineOffset,
    firstLineHeight: rects.length ? (rects[0].height) / scaleFactor : 0,
    baseline: baseline,
    rects: retRects,
    outerHeight: outerHeight / scaleFactor,
    outerWidth: outerWidth / scaleFactor,
    hasOverflow
  };
}
