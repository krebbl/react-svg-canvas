import Element from "./Element";

export default class Group extends Element {
  type = 'group';

  static defaultProps = Object.assign({}, Element.defaultProps, {
    selectable: false
  });

  renderChildren() {
    return this.props.children;
  }

}
