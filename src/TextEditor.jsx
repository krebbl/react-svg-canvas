import React, {PropTypes} from "react";

const wrapProperties = ['text', 'fontSize', 'fontFamily', 'verticalAlign', 'lineHeight', 'textAlign', 'width'];
const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

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
    height: 100
  };

  static propTypes = {
    text: PropTypes.string,
    verticalAlign: PropTypes.oneOf(['top', 'middle', 'bottom']),
    textAlign: PropTypes.oneOf(['left', 'center', 'right']),
    lineHeight: PropTypes.number
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
      document.body.appendChild(this._target);
      this._target.style.position = 'absolute';
      this._target.style.top = `${document.body.scrollTop}px`;
      this._target.style.left = '0';
      this._target.style.background = 'transparent';
      // this._target.style.overflow = 'hidden';
      this._target.style.zIndex = '1000';
      this._target.style.outline = 'none';
      this._target.style.whiteSpace = 'pre-wrap';
      this._target.style.border = 'none';
      this._target.style.wordBreak = isFirefox ? 'break-all' : 'break-word'; // FF can't do 'break-word'
      this._target.style.padding = 'none';
      this._target.style.transformOrigin = '0 0';
      this._target.setAttribute('contenteditable', 'true');
      this._target.onkeyup = (e) => {
        this.props.onTextChange && this.props.onTextChange(e);
      };

      this._target.onblur = () => {
        // this.props.onBlur && this.props.onBlur();
      };
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

    // target.style.height = `${this.props.height}px`;
    if (this.props.text !== target.textContent) {
      target.textContent = this.props.text;
    }
    const val = this.node.getScreenCTM();

    const topTranslate = this.props.fontSize / 12 * (isFirefox ? 2 : 1);

    target.style.transform = `matrix(${[val.a, val.b, val.c, val.d, val.e, val.f].join(',')}) translate(0,${topTranslate}px)`;
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
    if(this._target) {
      const val = this.node.getScreenCTM();

      const topTranslate = this.props.fontSize / 12;

      this._target.style.transform = `matrix(${[val.a, val.b, val.c, val.d, val.e, val.f].join(',')}) translate(0,${topTranslate}px)`;
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
      <rect ref={this.handleRef} style={{pointerEvent: 'none'}} fill="transparent" width={this.props.width} height={this.props.height}/> : null}
    </g>;
  }
}
