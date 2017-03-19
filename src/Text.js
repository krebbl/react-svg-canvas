import React, {PropTypes} from 'react';
import bowser from 'bowser';
import Element from './Element';
import TextEditor from './TextEditor';
import EventListener from 'react-event-listener';
const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAnchor', 'width', 'padding', 'maxWidth'];
const isFirefox = bowser.firefox;
const isChrome = bowser.chrome;
const isSafari = bowser.safari || (bowser.ios && bowser.safari);
const isMSIEdge = bowser.msie || bowser.msedge;
const textStyle = {whiteSpace: isMSIEdge ? 'pre-wrap' : '', textRendering: 'geometricPrecision', pointerEvents: 'none'};
const isDebug = process.env.NODE_ENV !== 'production' && process.env.DEBUG;
const divFontSize = 20;
const textAlignMap = {
  start: 'left',
  middle: 'center',
  end: 'right'
};

const anchorMap = {
  start: -1,
  middle: 0,
  end: 1
};

const vAlignMap = {
  top: -1,
  middle: 0,
  end: 1
};

export default class Text extends Element {

  type = 'text';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    text: '',
    fontSize: 12,
    fontFamily: 'Verdana',
    verticalAlign: 'top',
    lineHeight: 1.3,
    textAnchor: 'start',
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
    textAnchor: PropTypes.oneOf(['start', 'middle', 'end']),
    maxWidth: PropTypes.number,
    lineHeight: PropTypes.number,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom'])
  });

  constructor(props, context) {
    super(props, context);
    this.state = Object.assign(this.state, this.measureText(props));
  }

  measureText(props, withoutRects) {
    const width = (props.width ? props.width - (props.padding * 2) : 0);
    const maxWidth = (props.maxWidth ? props.maxWidth - (props.padding * 2) : 0);
    const options = Object.assign({}, props, {
      text: props.text || (!this.state.editing ? props.placeholder : ' '),
      width: props.width ? props.width - (props.padding * 2) : 0,
      maxWidth: props.maxWidth ? props.maxWidth - (props.padding * 2) : 0,
      textAlign: textAlignMap[props.textAnchor]
    });
    const measurement = measureText(options, withoutRects);
    return {
      measurement
    };
  }

  measureTextHeight(props) {
    return this.measureText(props, true).measurement.height + (2 * props.padding);
  }

  renderKnobs() {
    if (this.state.editing) {
      return [];
    }
    return super.renderKnobs();
  }

  processKnobChange(knob, dir, diffVector) {
    // if (dir === 'l' || dir === 'r' && (!this.props.height)) {
    //   let np, newHeight, newWidth;
    //   switch (dir) {
    //     case 'l':
    //       newWidth = this.props.width - diffVector.x;
    //       newHeight = this.measureTextHeight(Object.assign({}, this.props, {width: newWidth}));
    //       np = this.calcNewPositionForSize(newWidth, newHeight, 1, -1);
    //       this.processChange('x', np.x, false);
    //       this.processChange('y', np.y, false);
    //       this.processChange('width', newWidth, true);
    //       break;
    //     case 'r':
    //       // console.log(diffVector2.x);
    //       newWidth = this.props.width + diffVector.x;
    //       newHeight = this.measureTextHeight(Object.assign({}, this.props, {width: newWidth}));
    //       np = this.calcNewPositionForSize(newWidth, 0, -1, -1);
    //       this.processChange('x', np.x, false);
    //       this.processChange('y', np.y, false);
    //       this.processChange('width', newWidth, true);
    //
    //       break;
    //     default:
    //       break;
    //   }
    // } else {
    super.processKnobChange(knob, dir, diffVector);
    // }
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

  componentWillUpdate(nextPRops, nextState) {
    if (!nextState.selected) {
      nextState.editing = false;
    } else {
      nextState.hovered = false;
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
        this.context.api.finishChange();
        this.textEditor && this.textEditor.deactivate();
      } else {
        this.context.api.startChange();
        this.textEditor && this.textEditor.activate();
      }
    }

    this.textEditor && this.textEditor.repositionTextArea();
  }

  wrapText() {
    const rects = this.state.measurement.rects;
    const baseline = this.state.measurement.baseline;
    let textContent = this.props.text || this.props.placeholder;
    const svgRoot = this.svgRoot();
    const p = svgRoot.createSVGPoint();
    const innerWidth = this.props.width ? this.props.width : 0;

    if (rects) {
      let rect;
      let textNode;
      const measureThreshold = isSafari ? this.props.fontSize / 300 : this.props.fontSize * 0.2;
      let num;
      let lastTop = rects[0].top;
      let hardLines = textContent.split('\n');
      let hardLineIndex = 0;
      let lastLineIndex = hardLineIndex;
      let currentLine = hardLines[hardLineIndex];
      let currentLineIndex = hardLineIndex;
      let lastTextContent = '';
      let rectIndex = 0;

      hardLines.forEach((hardLine) => {
        currentLine = hardLine;
        if (rectIndex < rects.length) {
          if (!currentLine) {
            rect = rects[rectIndex];
            textNode = this.textWrapperNode.childNodes[rectIndex];
            textNode.textContent = ' ';
            textNode.setAttributeNS(null, 'x', `${rect.left}`);
            textNode.setAttributeNS(null, 'y', rect.top - Math.round(Math.min(0, textNode.getBBox().y)));
            rectIndex++;
          }
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
            if (isFirefox || isChrome) {
              // for firefox and chrome make the point a lil bit smaller
              p.x = rect.width > measureThreshold ? rect.width - measureThreshold : rect.width;
            } else {
              // for safari we get an integer value
              p.x = rect.width;
            }

            // if the measure point is wider than the text node,
            // then use the full text content length
            if (p.x > textNode.getBBox().width) {
              num = textNode.textContent.length - 1;
            } else {
              // else get the char position of the measure point
              num = textNode.getCharNumAtPosition(p);
              // for safari we need a special handling
              // safari measures always the next char
              if (isSafari) {
                // if the num is smaller 0, we measured over the text content
                // so its the text content length - 1
                if (num < 0) {
                  num = textNode.textContent.length - 1;
                } else {
                  // else check if the endposition of the measured char
                  // is inside the measure point
                  // if not, move to prev char
                  const ep = textNode.getEndPositionOfChar(num);
                  if (ep.x > p.x && num > 0) {
                    num = num - 1;
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
            let x = rect.left;
            if (!isMSIEdge) {
              textNode.setAttributeNS(null, 'text-anchor', this.props.textAnchor);
              switch (this.props.textAnchor) {
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
            textNode.setAttributeNS(null, 'y', rect.top - Math.round(Math.min(0, textNode.getBBox().y)));

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
      });


      // for (let i = 0; i < rects.length; i++) {
      //   rect = rects[i];
      //   textNode = this.textWrapperNode.childNodes[i];
      //   textNode.removeAttributeNS(null, 'x');
      //   textNode.removeAttributeNS(null, 'y');
      //   textNode.removeAttributeNS(null, 'text-anchor');
      //   if (lastTop !== rect.top) {
      //     currentLineIndex++;
      //   }
      //   // if we have a softbreak delete all leading spaces
      //   if (lastLineIndex === hardLineIndex && lastTop !== rect.top && !isMSIEdge) {
      //     if (/\s/.test(lastTextContent.substr(-1)) || isFirefox) {
      //       currentLine = currentLine.replace(/^\s+/, '');
      //     }
      //   }
      //   textNode.textContent = currentLine;
      //   p.y = rect.height * 0.5;
      //   p.x = rect.width;
      //   lastLineIndex = hardLineIndex;
      //
      //   // TODO: trail ending spaces from right aligned text
      //   if (isFirefox || isChrome) {
      //     p.x = rect.width > measureThreshold ? rect.width - measureThreshold : rect.width;
      //   }
      //   if (p.x > textNode.getBBox().width) {
      //     num = textNode.textContent.length - 1;
      //   } else {
      //     num = textNode.getCharNumAtPosition(p);
      //     if (isSafari) {
      //       if (num < 0) {
      //         num = textNode.textContent.length - 1;
      //       } else {
      //         const ep = textNode.getEndPositionOfChar(num);
      //         if (ep.x > p.x && num > 0) {
      //           num = num - 1;
      //         }
      //       }
      //     }
      //   }
      //
      //   // console.log(p.x, textNode.getEndPositionOfChar(num + 1), textNode.textContent, num);
      //   if (num > -1) {
      //     textNode.textContent = currentLine.substr(0, num + 1);
      //     currentLine = currentLine.substr(num + 1).replace(/\r$/, '');
      //   }
      //   // console.log(textNode.textContent + "|");
      //
      //   let x = rect.left;
      //   if (!isMSIEdge) {
      //     textNode.setAttributeNS(null, 'text-anchor', this.props.textAnchor);
      //     switch (this.props.textAnchor) {
      //       case 'middle':
      //         x = innerWidth * 0.5;
      //         break;
      //       case 'end':
      //         x = innerWidth;
      //         break;
      //       default:
      //         break;
      //     }
      //   }
      //   textNode.setAttributeNS(null, 'x', `${x}`);
      //   textNode.setAttributeNS(null, 'y', rect.top - Math.round(Math.min(0, textNode.getBBox().y)));
      //
      //   if (num < 0 || ((isFirefox || isMSIEdge) && !currentLine)) {
      //     hardLineIndex += 1;
      //     currentLine = hardLines[hardLineIndex];
      //   }
      //
      //
      //   lastTop = rect.top;
      //   lastTextContent = textNode.textContent;
      //   if (!textNode.textContent) {
      //     textNode.textContent = ' ';
      //   }
      // }
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
  };

  renderEditor() {
    if (this.props.editable) {
      const props = {};
      wrapProperties.forEach((key) => {
        props[key] = this.props[key];
      });
      props.textAlign = textAlignMap[this.props.textAnchor];
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

      if (this.props.height) {
        const calculatedBoxHeight = this.state.measurement.height + (this.props.padding * 2);
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
        key={this.id}
        ref={this.handeTextEditor}
        x={this.props.padding} y={this.props.padding + dy}
        maxWidth={this.props.maxWidth ? this.props.maxWidth - (this.props.padding * 2) - 0.01 : null}
        width={this.props.width ? (this.props.width) - (this.props.padding * 2) - 0.01 : 'auto'}
        onTextChange={this.handleTextChange}
        onBlur={this.handleTextBlur}
        height={(this.state.height || 0) - (this.props.padding * 2)}
        text={this.props.text}
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

  renderChildren() {
    const measurement = this.state.measurement;
    const rects = measurement.rects;
    const calculatedBoxHeight = measurement.height + (this.props.padding * 2);
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

    let tx = this.props.padding;
    const calculatedBoxWidth = measurement.width + (this.props.padding * 2);
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
      transform={`translate(0, ${y})`}
      onTouchStart={this.handleTextDown}
      onMouseDown={this.handleTextDown}
      onMouseUp={this.handleTextUp}
      onTouchEnd={this.handleTextUp}
    >
      {this.state.selected && this.props.editable ? <EventListener target="window" onKeyPress={this.handleKeyPress}/> : null}
      {<g ref={this.handleTextBBox}>
        <rect
          transform={`translate(${x}, 0)`}
          width={this.props.width || (measurement.width + (2 * this.props.padding))}
          height={measurement.height + (2 * this.props.padding)}
          fill={this.props.background}
        />
      </g>}
      {<g transform={`translate(${tx}, ${this.props.padding})`}>
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
        <g ref={this.handleTextWrapperRef}>
          {rects.map((line, i) => {
            return <text
              key={`${i}'_'${line.left}`} xmlSpace="preserve" style={textStyle} fontFamily={this.props.fontFamily} fontSize={(Math.round(this.props.fontSize * 100) / 100) + ''}
              dy="1em" y={line.top} fill={this.state.editing ? 'transparent' : this.props.fill}
            />;
          })}
        </g>
      </g>}
    </g>);
  }

}


var divWrapper;
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
  const {text, fontSize, fontFamily, maxWidth, width, textAlign, lineHeight} = options;
  divWrapper = divWrapper || createDivWrapper();
  divWrapper.innerHTML = '';
  divWrapper.style.fontFamily = fontFamily;
  divWrapper.style.lineHeight = lineHeight;
  divWrapper.style.fontSize = `${fontSize}px`;
  divWrapper.style.width = width ? `${width}px` : 'auto';
  divWrapper.style.maxWidth = maxWidth ? `${maxWidth}px` : 'none';
  divWrapper.style.textAlign = textAlign;
  divWrapper.innerHTML = `<span>${text.replace(/\r?\n/gi, '<br/>')}</span>`;

  return divWrapper;
}

function measureText(options, withoutRects) {
  divWrapper = prepareDivWrapper(options);
  const rects = divWrapper.firstChild.getClientRects();
  const topRect = divWrapper.getBoundingClientRect();
  const firstLineOffset = (rects.length ? rects[0].top - topRect.top : 0);
  const baseline = (rects.length ? rects[0].bottom - topRect.top : 0);
  let width = topRect.width;
  [].forEach.call(rects, (rect) => {
    width = Math.max(rect.width, width);
  });

  return {
    width: (width),
    height: (divWrapper.offsetHeight - (2 * firstLineOffset)),
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
