import React from 'react';
import Canvas from '../src/Canvas';
import Text from '../src/Text';
import Milestone from '../src/Milestone';
import Api from '../src/Api';

const api = Api.create([
  {factory: Text, fontFamily: 'Verdana', x: 20, y: 20, text: 'Should break between words', width: 70},
  {factory: Text, fontFamily: 'Verdana', x: 140, y: 20, text: 'Should swallow            spaces at the end', width: 110},
  {factory: Text, fontFamily: 'Carter One', x: 260, y: 20, text: 'Should\n      break at NL and show spaces', width: 120},
  {factory: Text, fontFamily: 'Verdana', fontSize: 6, x: 400, y: 20, text: '\n\n     \n     \n empty spaces with auto break', width: 120},
  {factory: Text, fontFamily: 'Verdana', rotate: 20, x: 520, y: 20, text: 'Should\n\nbe just one empty line', width: 110},
  {factory: Text, fontFamily: 'Verdana', width: 200, x: 700, y: 20, text: 'asdasdasdasd\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nempty spaces with auto break empty spaces with auto break'}

  // {
  //   factory: Milestone,
  //   x: 100,
  //   rotate: 0,
  //   width: 300,
  //   height: 300,
  //   labelProps: {
  //     _id: 'fAsd',
  //     text: '#1 Milestone',
  //     width: 100,
  //     fontSize: 30
  //   },
  //   milestones: [
  //     {
  //       text: 'Second Milestone'
  //     },
  //     {
  //       text: 'Second Milestone'
  //     },
  //     {
  //       text: 'Second Milestone'
  //     }
  //   ]
  // }
], []);

export default class Examples extends React.Component {

  constructor(props, context) {
    super(props, context);

    api.on('selectionChanged', this.handleSelectionChanged);
  }

  state = {
    elements: api.elements
  };

  handleSelectionChanged = () => {
    this.setState({selections: api.getSelections()});
  };

  handleChange = (e) => {
    // var id = e.target.getAttribute('data-id');
    // console.log(id, e.target.value);
    let val = e.target.value;
    if (e.target.type === 'number') {
      val = Number(val);
    }
    this.state.selectedNode.processChange(e.target.name, val);
  };

  componentWillUnmount() {
    api.unbind('selectionChanged', this.handleSelectionChanged);
  }

  render() {
    const selection = this.state.selections && this.state.selections.length ? this.state.selections[0] : null;
    const form = selection ? selection.form : null;
    return (<div style={{position: 'relative'}}>
      <div style={{minHeight: 400, width: '100%'}}>
        <Canvas api={api}/>
      </div>
      <div style={{position: 'absolute', right: 0, top: 0}}>
        {form ? <div>
          <h3>Form</h3>
          <div>{form.map(el => <div key={el.key}>{el.key} : <input type={el.type} name={el.key} value={api.getValue(selection.id, [el.key])} onChange={this.handleChange}/></div>)}</div>
        </div> : null}
      </div>
    </div>);
  }
}
