import React from "react";
import Slide from "../src/Slide";
import Milestone from "../src/Milestone";
import Api from "../src/Api";

const api = Api.create([
  {
    factory: Milestone,
    x: 100,
    rotate: 0,
    width: 300,
    height: 300,
    labelProps: {
      text: '#1 Milestone',
      width: 100,
      fontSize: 30
    },
    milestones: [
      {
        text: 'My Milestone'
      },
      {
        text: 'Second Milestone'
      },
      {
        text: 'Third Milestone'
      }
    ]
  }
]);

export default class Examples extends React.Component {

  constructor(props, context) {
    super(props, context);

    api.on('dataChanged', this.handleDataChanged);

    api.on('selectionChanged', this.handleSelectionChanged);
  }

  state = {
    elements: api.elements
  };


  handleDataChanged = () => {
    this.setState({ elements: api.elements });
  };

  handleSelectionChanged = () => {
    this.setState({ selectedNode: api.selectedNode });
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
    api.unbind('dataChanged', this.handleDataChanged);
    api.unbind('selectionChanged', this.handleSelectionChanged);
  }

  render() {
    const elements = this.state.elements;
    const selectedNode = this.state.selectedNode;
    const form = selectedNode ? selectedNode.getForm() : null;
    return (<div style={{ padding: 50, position: 'relative'}}>
      <div style={{height: 544, width: 777}}>
        <Slide api={api}>
          {elements.map((el) => {
            const {_factory, _id, ...other} = el;
            return React.createElement(_factory, {key: _id, _id: _id, ...other});
          })}
        </Slide>
      </div>
      <div style={{position: 'absolute', right: 0, top: 0}}>
      {form ? <div>
        <h3>Form</h3>
        <div>{form.map(el => <div key={el.key}>{el.key} : <input type={el.type} name={el.key} value={api.getValue(this.state.selectedNode.id, [el.key])} onChange={this.handleChange} /></div>)}</div>
      </div> : null}
      </div>
    </div>);
  }
}
