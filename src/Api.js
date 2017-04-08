import Immutable from 'seamless-immutable';
import EventDispatcher from 'eventdispatcher';
import Text from './Text';
import deepEqual from 'deep-equal';

function generateUIDNotMoreThan1million() {
  return ('0000' + (Math.random() * Math.pow(36, 6) << 0).toString(36)).slice(-6);
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
      background: 'pink',
      elements: Immutable([])
    });
    this.selection = Immutable({});
    this.elements = Immutable({});
    this.nodes = {};
    this.slides = [];
    this.history = Immutable([]);
    this.factories = {
      text: Text
    };
    this.assets = Immutable({});
    this.clipboard = [];
    this.pathCache = {};
    this.historyPointer = -1;
  }

  static create(slideOptions, elements, selectedElements) {
    const api = new Api();
    elements.forEach((element, i) => {
      api.addElement(element, i);
    });
    (selectedElements || []).forEach((id) => {
      api.selections = api.selections.set(id, true);
    });
    api.slide = api.slide.merge(slideOptions);
    window.api = api;
    return api;
  }

  selectSlide(index) {
    if (this.slides[index]) {
      this.slide = this.slides[index];
      this.dataChanged();
    }
  }

  resolveFactory(type) {
    return this.factories[type];
  }

  addElement(props, key, targetId, generateNewId) {
    const k = keyToArray(key);
    const path = this.getDataPath(targetId) || [];
    const kCopy = k.slice();
    let _key = kCopy.pop();
    if (typeof _key === 'number') {
      _key = kCopy.pop();
    }
    const newElement = Object.assign({}, props, {
      id: props.id && !generateNewId ? props.id : generateUIDNotMoreThan1million(),
      _key,
      _parentId: targetId
    });

    const elementsToAdd = [];
    Object.keys(newElement).forEach((pKey) => {
      const prop = newElement[pKey];
      if (prop instanceof Array) {
        prop.forEach((child, i) => {
          elementsToAdd.push({
            props: child,
            key: [pKey, i]
          });
        });
      } else if (prop != null && typeof (prop) === 'object') {
        elementsToAdd.push({
          props: prop,
          key: [pKey]
        });
      }
    });


    const targetPath = path.concat(k);
    this.slide = this.slide.setIn(['elements'].concat(targetPath), newElement);
    this.elements = this.elements.set(newElement.id, getInPath(this.slide.elements, targetPath));
    this.pathCache = {};
    elementsToAdd.forEach((el) => {
      this.addElement(el.props, el.key, newElement.id, generateNewId);
    });
    return newElement;
  }

  registerFactory(type, Factory) {
    this.factories[type] = Factory;
  }

  addAsset(type, id, data) {
    this.assets = this.assets.set(type, this.assets[type] || {});
    this.assets = this.assets.setIn([type, id], data);
  }

  getAsset(type, id) {
    return getInPath(this.assets, [type, id]);
  }

  removeAsset(type, id) {
    this.assets = this.assets.setIn([type, id], null);
  }

  moveElementToFront(id) {
    const path = this.getDataPath(id).slice();
    const index = path.pop();
    if (typeof index !== 'number') {
      return;
    }
    this.moveElementFromTo(path, index, getInPath(this.slide.elements, path).length - 1);
  }

  moveElementToBack(id) {
    const path = this.getDataPath(id).slice();
    const index = path.pop();
    if (typeof index !== 'number') {
      return;
    }
    this.moveElementFromTo(path, index, 0);
  }

  moveElementUp(id) {
    const path = this.getDataPath(id).slice();
    const index = path.pop();
    if (typeof index !== 'number') {
      return;
    }
    this.moveElementFromTo(path, index, index + 1);
  }

  moveElementDown(id) {
    const path = this.getDataPath(id).slice();
    const index = path.pop();
    if (typeof index !== 'number') {
      return;
    }
    this.moveElementFromTo(path, index, index - 1);
  }

  moveElementFromTo(path, fromIdx, toIdx) {
    const otherElement = getInPath(this.slide.elements, path.concat([toIdx]));
    const element = getInPath(this.slide.elements, path.concat([fromIdx]));
    if (otherElement && element) {
      this.slide = this.slide.setIn(['elements'].concat(path.concat([fromIdx])), otherElement).setIn(['elements'].concat(path.concat([toIdx])), element);
      this.pathCache = {};
    }
  }

  saveInHistory(state) {
    this.currentState = {cache: this.elements, slide: this.slide, selection: this.selection};
    this.history = Immutable(this.history.slice(0, this.historyPointer + 1).concat([state]));
    this.historyPointer = this.history.length;
    this.historyChanged();
  }

  undo() {
    if (this.historyPointer > 0) {
      this.historyPointer -= 1;
      const entry = this.history[this.historyPointer];
      this.slide = entry.slide;
      this.elements = entry.cache;
      this.selection = entry.selection;
      this.pathCache = {};
      this.dataChanged();
      this.selectionChanged();
    }
  }

  redo() {
    let entry;
    if (this.historyPointer < this.history.length - 1) {
      this.historyPointer += 1;
      entry = this.history[this.historyPointer];
    } else {
      this.historyPointer = this.history.length;
      entry = this.currentState;
    }

    if (entry) {
      this.slide = entry.slide;
      this.elements = entry.cache;
      this.selection = entry.selection;
      this.pathCache = {};
      this.dataChanged();
      this.selectionChanged();
    }
  }

  hasUndo() {
    return this.historyPointer > 0;
  }

  hasRedo() {
    return this.historyPointer > -1 && this.historyPointer < this.history.length;
  }

  updateSlide(key, value) {
    const k = keyToArray(key);
    this.slide = this.slide.setIn(k, value);
  }

  getChildren(id, deep) {
    const element = this.getElement(id);
    let children = [];
    Object.keys(element).forEach((key) => {
      if (typeof (element[key]) === 'object') {
        if (element[key].id) {
          children.push(element[key]);
        }
      }
    });

    if (deep) {
      children.forEach((child) => {
        children = children.concat(this.getChildren(child.id, true));
      });
    }

    return children;
  }

  removeElement(id) {
    const p = this.getDataPath(id).slice();
    const deleteKey = p.pop();

    if (deleteKey == null) {
      // element already deleted
      return;
    }

    let parent = getInPath(this.slide.elements, p);
    if (typeof (deleteKey) === 'number') {
      parent = parent.filter(el => el.id !== id);
    } else {
      parent = parent.without(deleteKey);
    }

    // TODO remove children
    this.getChildren(id).forEach((child) => {
      this.removeElement(child.id);
    });

    this.slide = this.slide.setIn(['elements'].concat(p), parent);
    this.elements = this.elements.without(id);
    this.selection = this.selection.without(id);
    // clear path cache
    this.pathCache = {};
  }

  updateElement(id, key, value) {
    const path = this.getDataPath(id);
    if (path) {
      this.slide = this.slide.setIn(['elements'].concat(path.concat([key])), value);
    } else {
      console.warn(`You tried to update a non existing element width id: ${id}`);
    }
  }

  processChange(id, key, value) {
    const node = this.getNode(id);
    if (node) {
      try {
        node.processChange(key, value);
      } catch (e) {
        console.warn(e);
      }
    } else {
      // TODO: think about this
      // if there is no node, that can handle the change, just update the element
      this.updateElement(id, key, value);
      this.dataChanged();
    }
  }

  startChange() {
    this._currentState = {cache: this.elements, slide: this.slide, selection: this.selection};
  }

  finishChange() {
    if (this._currentState) {
      if (!deepEqual(this._currentState.slide, this.slide)) {
        this.saveInHistory(this._currentState);
        this.dataChanged();
        this.selectionChanged();
      }
      this._currentState = null;
    }
  }

  cloneElement(id) {
    const path = this.getDataPath(id).slice();
    const element = getInPath(this.slide.elements, path);
    let key = path.pop();
    let arrayKey;
    if (typeof (key) === 'number') {
      arrayKey = path.pop();
    }
    const parent = getInPath(this.slide.elements, path);
    if (arrayKey) {
      key = [arrayKey, parent[arrayKey].length];
    } else {
      key = [parent.length];
    }
    const mutable = element.without('id').asMutable({deep: true});

    return this.addElement(mutable, key, parent.id, true);
  }

  // copySelectedElements() {
  //   this.clipboard = Object.keys(this.selection).map(id => this.getElement(id)).filter(el => !!el).map(el => el.asMutable());
  // }
  //
  // pasteElement() {
  //   this.clipboard.forEach((element) => {
  //     const {_factory,_key, _parentId, ...other} = this.clipboard;
  //     this.addElement(_factory, other, _key, _parentId, true);
  //   });
  // }

  cloneSelectedElements() {
    this.startChange();
    // find selection with shortest path
    let shortestPathLength = Infinity;
    let upperElementId = null;
    Object.keys(this.selection).forEach((id) => {
      const path = this.getDataPath(id);
      if (path.length < shortestPathLength) {
        upperElementId = id;
        shortestPathLength = path.length;
      }
    });
    this.cloneElement(upperElementId);
    this.selectElement(upperElementId);
    this.finishChange();
  }

  removeSelectedElements() {
    this.startChange();
    const ids = Object.keys(this.selection);
    ids.forEach((id) => {
      this.removeElement(id);
    });
    this.finishChange();

    this.selectionChanged();
    this.dataChanged();
  }

  getValue(id, key) {
    const path = this.getDataPath(id);
    if (!path) {
      return null;
    }
    return getInPath(this.slide.elements, path.concat(keyToArray(key)));
  }

  getElement(id) {
    const path = this.getDataPath(id);
    if (!path) {
      return null;
    }
    const ret = getInPath(this.slide.elements, path);
    return ret === this.slide.elements ? null : ret;
  }

  findElement(fnc) {
    return Object.keys(this.elements).map(id => this.elements[id]).find(fnc);
  }

  getDataPath(id) {
    if (this.pathCache[id]) {
      return this.pathCache[id];
    }
    const element = this.elements[id];
    if (!element) {
      return null;
    }
    if (!element._parentId) {
      return [this.slide.elements.findIndex(el => el.id === id)];
    }
    const parentPath = this.getDataPath(element._parentId);
    if (!parentPath) {
      return null;
    }
    const parent = getInPath(this.slide.elements, parentPath);
    let ret = null;
    if (parent[element._key] instanceof Array) {
      ret = parentPath.concat([element._key, parent[element._key].findIndex(el => el.id === id)]);
    } else {
      ret = parentPath.concat([element._key]);
    }
    this.pathCache[id] = ret;
    return ret;
  }

  selectElement(id, add) {
    if (!add) {
      this.selection = Immutable({});
    }
    if (id) {
      this.selection = this.selection.set(id, true);
    }
    this.selectionChanged();
  }

  deselectElement(id) {
    this.selection = this.selection.without(id);
    this.selectionChanged();
  }

  registerNode(node) {
    if (node.props.id) {
      this.nodes[node.props.id] = node;
    }
  }

  getNode(id) {
    return this.nodes[id];
  }

  isElementSelected(id) {
    return !!this.selection[id];
  }

  unregisterNode(node) {
    if (node.props.id) {
      delete this.nodes[node.props.id];
    }
  }

  updateSelection(node) {
    if (this.isNodeSelected(node)) {
      this.selection = this.selection.set(node.props.id, true);
      this.nodes[node.props.id] = node;
      this.selectionChanged();
    }
  }

  isNodeSelected(node) {
    return this.selection[node.props.id];
  }

  getSelectedElements() {
    return Object.keys(this.selection).map(id => this.getElement(id)).filter(el => !!el);
  }

  dataChanged() {
    this.emit('dataChanged');
  }

  selectionChanged() {
    this.emit('selectionChanged');
  }

  historyChanged() {
    this.emit('historyChanged');
  }
}
