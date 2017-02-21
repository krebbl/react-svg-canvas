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
    this.slide = Immutable({
      width: 1024,
      height: 768,
      elements: Immutable([]),
      selections: Immutable({})
    });
    this.selectedNodes = {};
    this.paths = {};       
  }

  static create(apiTree, selectedElements) {
    const api = new Api();
    apiTree.forEach((element, i) => {
      const { factory, ...other } = element;
      api.addElement(factory, other, i);
    });
    (selectedElements || []).forEach((id) => {
      api.slide = api.slide.setIn(['selections', id], true);
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
    this.slide = this.slide.setIn(['elements'].concat(targetPath), newElement);
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
    var newElements;
    if (k.length) {
      newElements = Immutable.updateIn(this.slide.elements, k, (val) => {
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
      newElements = this.slide.elements.without(deleteKey);
    }
    this.slide = this.slide.set('elements', newElements);
  }

  updateElement(id, key, value) {
    const path = this.getDataPath(id);
    if(path) {
      this.slide = this.slide.setIn(['elements'].concat(path.concat([key])), value);
    } else {
      console.warn(`You tried to update a non existing element width id: ${id}`)
    }
  }

  getValue(id, key) {
    const path = this.getDataPath(id);
    return getInPath(this.slide.elements, path.concat(keyToArray(key)));
  }

  getElement(id) {
    return getInPath(this.slide.elements, this.getDataPath(id));
  }

  getDataPath(id) {
    if (!id) return [];
    return this.paths[id];
  }

  selectNode(node, add) {
    if (!add) {
      this.slide = this.slide.setIn(['selections'], {});
    }
    if (node) {
      this.slide = this.slide.setIn(['selections', node.id], true);
      this.selectedNodes[node.id] = node;
    }
    this.selectionChanged();
  }

  updateSelection(node) {
    if (this.isNodeSelected(node)) {
      this.slide = this.slide.setIn(['selections', node.id], true);
      this.selectedNodes[node.id] = node;
      this.selectionChanged();
    }
  }

  isNodeSelected(node) {
    return this.slide.selections[node.id];
  }

  getSelectedNode(id) {
    return this.selectedNodes[id];
  }

  getSelectedNodes() {
    return Object.keys(this.slide.selections).map(id => this.selectedNodes[id]);
  }

  getSelections() {
    return Object.keys(this.slide.selections).map(id => this.selectedNodes[id].createSelection());
  }

  dataChanged() {
    this.emit('dataChanged');
  }

  selectionChanged() {
    this.emit('selectionChanged');
  }
}
