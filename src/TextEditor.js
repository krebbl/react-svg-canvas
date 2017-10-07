import React, {PropTypes} from 'react';
import bowser from 'bowser';
import EventListener, {withOptions} from 'react-event-listener';

const wrapProperties = ['text', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width'];

export default class TextEditor extends React.Component {

  state = {
    active: false
  };

  static defaultProps = {
    text: '',
    fontSize: 12,
    fontFamily: 'sans-serif',
    verticalAlign: 'top',
    lineHeight: 1,
    textAlign: 'left',
    fill: 'black'
  };

  static propTypes = {
    text: PropTypes.string,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom']),
    textAlign: PropTypes.oneOf(['left', 'center', 'right']),
    lineHeight: PropTypes.number
  };

  static contextTypes = {
    canvas: PropTypes.object
  };

  componentDidMount() {
    if (this.state.active) {
      this.renderEditable();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.active && !prevState.active) {
      this.renderEditable();
    }
    if (!this.state.active) {
      this.removeEditable();
    } else {
      this.repositionTextArea();
    }
  }

  renderEditable() {
    if (!this.node) {
      return;
    }

    if (!this._target) {
      this._target = document.createElement('div');
      const style = this._target.style;
      style.position = 'absolute';
      style.top = '0';
      style.left = '0';
      style.background = 'transparent';
      style.zIndex = '1000';
      style.outline = 'none';
      style.whiteSpace = this.props.width === 'auto' && !this.props.maxWidth ? 'nowrap' : 'normal';
      style.border = 'none';
      style.wordBreak = 'break-word';
      style.wordWrap = 'break-word'; // for FF
      style.padding = '0';
      style.minWidth = '5px';
      style.fontSize = `${this.props.fontSize}px`;
      style.transformOrigin = '0 0';
      style.textRendering = 'geometricPrecision';
      style.color = this.props.fill;
      this._target.setAttribute('contenteditable', 'true');
      this._target.setAttribute('autocomplete', 'off');
      this._target.setAttribute('autocorrect', 'off');

      this.context.canvas.wrapperNode.appendChild(this._target);
    }

    const target = this._target;

    this.applyEventListeners(target);
    this.applyWrapProperties(target);
    this.setInnerText(target, this.props.text);
    this.positionEditable(target);
    this.focusEditable(target);
  }

  setInnerText (editable, text) {
    if (text !== editable.textContent) {
      editable.innerHTML = `<span>${text.replace(/\n$/, '\n\n').replace(/\r?\n/gi, '<br/>')}</span>`;
    }
  }

  getInnerText (editable) {
    if (!editable) {
      return '';
    }
    let innerText = editable.innerText.replace(/^\n$/, '');
    if (bowser.msie || bowser.msedge) {
      if (editable.lastChild && editable.lastChild.lastChild && editable.lastChild.lastChild.tagName === 'BR') {
        innerText += '\n';
      }
    } else {
      innerText = innerText.replace(/\n$/, '');
    }
    return innerText;
  }

  focusEditable(target) {
    if (bowser.ios) {
      target.focus();
    }

    if (document.createRange && target.lastChild) {
      const range = document.createRange();
      range.selectNode(target.lastChild.lastChild || target.lastChild);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }

  applyEventListeners(editable) {
    editable.oninput = this.triggerChange;

    editable.onpaste = (e) => {
      let content;
      e.preventDefault();

      if (e.clipboardData) {
        content = (e.originalEvent || e).clipboardData.getData('text/plain');
        document.execCommand('insertText', false, this.cleanText(content));
      }
      else if (window.clipboardData) {
        const selection = window.getSelection();
        content = window.clipboardData.getData('Text');
        if (selection.createRange) {
          selection.createRange().pasteHTML(this.cleanText(content));
        } else if (selection.getRangeAt && selection.rangeCount) {
          let range = selection.getRangeAt(0);
          range.deleteContents();

          // Range.createContextualFragment() would be useful here but is
          // only relatively recently standardized and is not supported in
          // some browsers (IE9, for one)
          const el = document.createElement("div");
          el.innerHTML = this.cleanText(content);
          let frag = document.createDocumentFragment(), node, lastNode;
          while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);

          // Preserve the selection
          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
      setTimeout(() => {
        this.triggerChange();
      }, 1);

      return false;
    };

    editable.onchange = this.triggerChange;

    editable.onblur = () => {
      this.props.onBlur && this.props.onBlur();
    };

    const stopPropagation = function (e) {
      e.stopPropagation();
    };

    this._target.onclick = stopPropagation;
    this._target.onmousedown = stopPropagation;
    this._target.ontouchstart = stopPropagation;

    if (bowser.msie || bowser.msedge) {
      this._textBeforeForIE = editable.innerHTML;
      const checkForChange = (e) => {
        if (editable.innerHTML !== this._textBeforeForIE) {
          this._textBeforeForIE = editable.innerHTML;
          this.triggerChange();
        }
      };

      this._checking = false;
      const startChecking = () => {
        checkForChange();
        this._checking && setTimeout(startChecking, 10);
      };

      const stopChecking = () => {
        this._checking = false;
      };

      editable.onkeyup = (e) => {
        stopChecking();
      };
      editable.onkeydown = (e) => {
        if (e.which === 27) {
          e.target.blur();
          e.stopPropagation();
        }
        if (e.which === 13 && this.props.singleLine) {
          e.preventDefault();
          e.stopPropagation();
          e.target.blur();
          return;
        }
        if (e.which === 13 && !e.shiftKey) {
          e.preventDefault();

          e.stopPropagation();

          var selection = window.getSelection(),
            range = selection.getRangeAt(0),
            br = document.createElement('br');

          range.deleteContents();

          range.insertNode(br);

          range.setStartAfter(br);

          range.setEndAfter(br);

          range.collapse(false);

          selection.removeAllRanges();

          selection.addRange(range);
        }
        setTimeout(() => {
          startChecking();
        }, 5);
      }
    } else {
      editable.onkeydown = (e) => {
        if (e.which === 27 || (this.props.singleLine && e.which === 13)) {
          e.preventDefault();
          e.stopPropagation();
          e.target.blur();
        }
      }
    }
  }

  applyWrapProperties(editable) {
    wrapProperties.forEach((key) => {
      if (this.props[key] && key !== 'text') {
        if (/maxWidth|width|height/.test(key) && typeof this.props[key] === 'number') {
          editable.style[key] = `${this.props[key] / this.props.scaleFactor}px`;
        } else {
          editable.style[key] = `${this.props[key]}`;
        }
      }
    });
  }

  componentWillUnmount() {
    this.removeEditable();
  }

  triggerChange = () => {
    const target = this._target;
    if (!target) {
      return;
    }

    this.props.onTextChange && this.props.onTextChange(this.getInnerText(target));
  };

  removeEditable() {
    if (this._target && this._target.parentNode) {
      this._target.parentNode.removeChild(this._target);
      this._target = null;
    }
  }

  handleRef = (ref) => {
    this.node = ref;
  };

  repositionTextArea() {
    this.positionEditable(this._target);
  }

  positionEditable(editable) {
    if (editable) {
      const val = this.node.getCTM();
      editable.style.transform = `matrix(${[val.a, val.b, val.c, val.d, val.e, val.f].join(',')}) scale(${this.props.scaleFactor})`;
    }
  }

  activate() {
    this.setState({active: true});
  }

  deactivate() {
    this.setState({active: false});
  }

  handleResize = () => {
    this.resizeTimeout && clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      this.repositionTextArea();
    }, 100);
  };

  render() {
    return <g transform={`translate(${this.props.x || 0}, ${this.props.y || 0})`}>
      <EventListener target="window" onResize={this.handleResize}/>
      {this.state.active ?
        <rect
          ref={this.handleRef}
          style={{pointerEvent: 'none'}}
          fill="transparent"
          width={10}
          height={10}
        /> : null}
    </g>;
  }
}
