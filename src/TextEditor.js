import React, {PropTypes} from 'react';
import bowser from 'bowser';
import EventListener, {withOptions} from 'react-event-listener';

const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width'];

function setInnerText(target, text) {
  if (text !== target.textContent) {
    target.innerHTML = `<span>${text.replace(/\r?\n/gi, '<br/>')}</span>`;
  }
}

function getInnerText(target) {
  if (!target) {
    return '';
  }
  return target.innerText.replace(/^\n$/, "");
}

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
      style.whiteSpace = this.props.width === 'auto' ? 'nobreak' : 'pre-wrap';
      style.border = 'none';
      style.wordBreak = 'break-word';
      style.wordWrap = 'break-word'; // for FF
      style.padding = '0';
      style.transformOrigin = '0 0';
      style.textRendering = 'geometricPrecision';
      style.color = this.props.fill;
      this._target.setAttribute('contenteditable', 'true');

      this._target.oninput = this.triggerChange;

      this._target.onpaste = this.triggerChange;

      this._target.onchange = this.triggerChange;

      this._target.onblur = () => {
        this.props.onBlur && this.props.onBlur();
      };

      this.context.canvas.wrapperNode.appendChild(this._target);
    }

    const target = this._target;
    wrapProperties.forEach((key) => {
      if (this.props[key] && key !== 'text') {
        if (/width|height|fontSize/.test(key) && typeof this.props[key] === 'number') {
          target.style[key] = `${this.props[key]}px`;
        } else {
          target.style[key] = `${this.props[key]}`;
        }
      }
    });

    setInnerText(target, this.props.text);

    if (bowser.msie) {
      this._textBeforeForIE = target.innerHTML;
      const checkForChange = () => {
        if (target.innerHTML !== this._textBeforeForIE) {
          this._textBeforeForIE = target.innerHTML;
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

      target.onkeyup = () => {
        stopChecking();
      };
      target.onkeydown = (e) => {
        if (e.which === 13 && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();

          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          const br = document.createElement('br');

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
      };
    }

    this.positionEditable(target);
    target.focus();
  }

  componentWillUnmount() {
    this.removeEditable();
  }

  triggerChange = () => {
    const target = this._target;
    if (!target) {
      return;
    }
    this.props.onTextChange && this.props.onTextChange(getInnerText(target));
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
      editable.style.transform = `matrix(${[val.a, val.b, val.c, val.d, val.e, val.f].join(',')})`;
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
