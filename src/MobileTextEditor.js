import React, {PropTypes} from 'react';
import TextEditor from './TextEditor';
import tinycolor from 'tinycolor2';

const sidePadding = 15;

export default class MobileTextEditor extends TextEditor {

  renderEditable() {
    if (!this.node) {
      return;
    }

    if (!this._target) {
      const textColor = tinycolor(this.props.fill);
      const isDark = !textColor || textColor.isDark();
      this._wrapper = document.createElement('div');
      const wrapperStyle = this._wrapper.style;
      wrapperStyle.position = 'absolute';
      wrapperStyle.top = '0';
      wrapperStyle.left = '0';
      wrapperStyle.right = '0';
      wrapperStyle.bottom = '0';
      wrapperStyle.background = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)';
      wrapperStyle.padding = `60px ${sidePadding}px 0`;
      wrapperStyle.zIndex = '9999';

      this._target = document.createElement('div');
      const style = this._target.style;

      style.background = 'transparent';
      style.zIndex = '1000';
      style.outline = 'none';
      style.whiteSpace = !this.props.width && !this.props.maxWidth ? 'nowrap' : 'pre-wrap';
      style.border = 'none';
      style.fontSize = `${this.props.fontSize}px`;
      style.overflow = style.whiteSpace === 'nowrap' ? 'hidden' : 'inherit';
      style.wordBreak = 'break-word';
      style.wordWrap = 'break-word'; // for FF
      style.padding = '0';
      style.transformOrigin = '0 0';
      style.textRendering = 'geometricPrecision';
      style.color = this.props.fill;
      this._target.setAttribute('contenteditable', 'true');

      this._okButton = document.createElement('div');
      this._okButton.className = `element-text-button-ok ${isDark ? '' : 'dark'}`;

      this._okButton.onclick = function() {
          document.activeElement.blur();
      };

      this._wrapper.appendChild(this._okButton);
      this._wrapper.appendChild(this._target);

      document.body.appendChild(this._wrapper);
    }

    const target = this._target;

    this.applyEventListeners(target);
    this.applyWrapProperties(target);
    this.setInnerText(target, this.props.text);
    this.positionEditable(target);
    this.focusEditable(target);
  }

  positionEditable(editable) {
    if (editable) {
      if(this.props.width || this.props.maxWidth) {
        const rect = this._wrapper.getBoundingClientRect() - 2 * sidePadding;
        const scale = rect.width / ((this.props.maxWidth || this.props.width) / this.props.scaleFactor);
        editable.style.transform = `scale(${scale})`;
      } else {
        editable.style.fontSize = '32px';
      }
    }
  }

  removeEditable() {
    if (this._wrapper && this._wrapper.parentNode) {
      this._wrapper.parentNode.removeChild(this._wrapper);
      this._wrapper = null;
      this._target = null;
    }
  }
}
