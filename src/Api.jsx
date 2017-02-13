import Immutable from "seamless-immutable";
import EventDispatcher from "eventdispatcher";

function generateUIDNotMoreThan1million() {
  return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
}

function getInPath(obj, path) {
  if (!path.length) return obj;
  /*jshint eqnull:true */
  for (var i = 0, l = path.length; obj != null && i < l; i++) {
    obj = obj[path[i]];
  }
  return (i && i == l) ? obj : undefined;
}

function keyToArray(key) {
  if (key instanceof Array) {
    return key;
  }
  return key != null ? [key] : [];
}

export default class Api extends EventDispatcher {

  constructor() {
    super();
    this.elements = Immutable([]);
    this.paths = {};
  }

  static create(apiTree) {
    const api = new Api();
    apiTree.forEach((element, i) => {
      const { factory, ...other } = element;
      api.addElement(factory, other, i);
    });
    window.api = api;
    return api;
  }

  addElement(Factory, props, key, targetId) {
    const k = keyToArray(key);
    const path = this.getDataPath(targetId);

    const newElement = Object.assign({}, Factory.defaultDataProps, {
      _factory: Factory,
      _id: props._id || generateUIDNotMoreThan1million()
    }, props);

    const elementsToAdd = [];
    Object.keys(newElement).forEach((pKey) => {
      if (Factory.childrenTypes && Factory.childrenTypes[pKey]) {
        const prop = newElement[pKey];
        if(prop instanceof Array) {
          prop.forEach((child, i) => {
            elementsToAdd.push({
              factory: Factory.childrenTypes[pKey],
              props: child,
              key: [pKey, i]
            });
          });
        } else if (typeof (prop) === 'object') {
          elementsToAdd.push({
            factory: Factory.childrenTypes[pKey],
            props: prop,
            key: [pKey]
          });
        }
      }
    });

    const targetPath = path.concat(k);
    this.elements = this.elements.setIn(targetPath, newElement);
    this.addPath(newElement._id, targetPath);
    elementsToAdd.forEach((el) => {
      this.addElement(el.factory, el.props, el.key, newElement._id);
    });
  }

  addPath(id, path) {
    if (!id) {
      return;
    }
    this.paths[id] = path;
  }

  removeElement(id, key) {
    const k = keyToArray(key);
    const p = this.getDataPath(id).concat(k);
    const deleteKey = p.pop();
    if (k.length) {
      this.elements = Immutable.updateIn(this.elements, k, (val) => {
        if (val == null) {
          return val;
        }
        if (val.without) {
          return val.without(deleteKey);
        } else if (val instanceof Array) {
          const ret = val.asMutable();
          ret.splice(parseInt(deleteKey, 3), 1);
          return Immutable(ret);
        } else {
          return val;
        }
      });
    } else {
      this.elements = this.elements.without(deleteKey);
    }
  }

  updateElement(id, key, value) {
    const path = this.getDataPath(id);
    this.elements = this.elements.setIn(path.concat([key]), value);
  }

  getValue(id, key) {
    const path = this.getDataPath(id);
    return getInPath(this.elements, path.concat(keyToArray(key)));
  }

  getElement(id) {
    return getInPath(this.elements, this.getDataPath(id));
  }

  getDataPath(id) {
    if (!id) return [];
    return this.paths[id];
  }

  selectNode(node) {
    this.selectedNode = node;
    this.selectionChanged();
  }

  isNodeSelected(node) {
    return this.selectedNode === node;
  }

  dataChanged() {
    this.emit('dataChanged');
  }

  selectionChanged() {
    this.emit('selectionChanged');
  }
}
