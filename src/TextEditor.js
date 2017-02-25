import React, {PropTypes} from 'react';
import bowser from 'bowser';

const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width'];

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
    width: 100,
    height: 100,
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
      style.whiteSpace = 'pre-wrap';
      style.border = 'none';
      style.wordBreak = 'break-word';
      style.wordWrap = 'break-word'; // for FF
      style.padding = '0';
      style.transformOrigin = '0 0';
      style.textRendering = 'geometricPrecision';
      style.color = this.props.fill;
      console.log(this.props.fill);
      this._target.setAttribute('contenteditable', 'true');


      this._target.onkeydown = (e) => {
        if (bowser.msie && e.which === 13) {
          e.preventDefault();
          // TODO: insert line break instead of paragraph
        }
      };
      this._target.onkeyup = (e) => {
        this.props.onTextChange && this.props.onTextChange(e);
      };
      this._target.onchange = (e) => {
        this.props.onTextChange && this.props.onTextChange(e);
      };

      this._target.onblur = () => {
        this.props.onBlur && this.props.onBlur();
      };

      this.context.canvas.wrapperNode.appendChild(this._target);
    }

    const target = this._target;
    wrapProperties.forEach((key) => {
      if (this.props[key] && key !== 'text') {
        if (/width|height|fontSize/.test(key)) {
          target.style[key] = `${this.props[key]}px`;
        } else {
          target.style[key] = `${this.props[key]}`;
        }
      }
    });

    if (this.props.text !== target.textContent) {
      target.innerHTML = `<span>${this.props.text.replace(/\r?\n/gi, '<br/>')}</span>`;
    }
    this.positionEditable(target);
    target.focus();
  }
  componentWillUnmount() {
    this.removeEditable();
  }

  removeEditable() {
    if (this._target && this._target.parentNode) {
      this._target.parentNode.removeChild(this._target);
      this._target = null;
      this.props.onBlur && this.props.onBlur();
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
    this.setState({ active: true });
  }

  deactivate() {
    this.setState({ active: false });
  }

  render() {
    return <g transform={`translate(${this.props.x || 0}, ${this.props.y || 0})`}>
      {this.state.active ?
        <rect
          ref={this.handleRef}
          style={{pointerEvent: 'none'}}
          fill="transparent"
          width={this.props.width}
          height={this.props.height}
        /> : null}
    </g>;
  }
}
