import React from 'react';
import Canvas from 'react-svg-canvas/Canvas';
import Text from 'react-svg-canvas/Text';
import Api from 'react-svg-canvas/Api';
import './css/font-awesome.css';
import Milestone from './elements/Milestone';
import Timeline from './elements/Timeline';

const api = Api.create([
  // {factory: Text, fontFamily: 'Arial', fontSize: 16, x: 20, y: 30, text: 'Should break between words', width: 70},
  // {factory: Text, fontFamily: 'Verdana', fontSize: 6, x: 20, y: 10, text: 'Should break', width: 30},
  // {factory: Text, fontFamily: 'Arial', lineHeight: 3, x: 140, y: 20, text: 'Should swallow            spaces at the end', width: 110},
  // {factory: Text, fontFamily: 'Times', rotate: 30, x: 140, fontSize: 17, y: 0, lineHeight: 2.0, text: 'Should use_the            spaces as empty line', width: 53},
  // {factory: Text, fontFamily: 'Arial', fontSize: 17, x: 260, y: 20, text: 'Should\n      break at NL and show spaces', width: 120},
  // {factory: Text, fontFamily: 'Verdana', fontSize: 6, x: 400, y: 20, text: '\n\n     \n     \n empty spaces with auto break', width: 120},
  // {factory: Text, fontFamily: 'Times New Roman', rotate: 20, x: 520, y: 20, text: 'Should\n\nbe just one empty line', width: 110},
  // {factory: Text, fontFamily: 'Verdana', width: 200, x: 700, y: 20, text: 'asdasdasdasd\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nempty spaces with auto break empty spaces with auto break'}
  {
    factory: Text, fontFamily: 'Verdana', fontSize: 30, x: 238, y: 100, text: 'Timeline example', width: 400, textAlign: 'center'
  },
  {
    factory: Timeline,
    x: 100,
    y: 700,
    width: 800,
    milestones: [
      {
        x: 100,
        rotate: 0,
        color: 'rgb(255,96,126)',
        labelProps: {
          text: '2009',
          width: 100,
          fontSize: 30
        },
        iconProps: {
          font: 'FontAwesome',
          icon: '\uf06d'
        }
      },
      {
        x: 300,
        rotate: 0,
        height: -500,
        color: 'rgb(84,198,225)',
        labelProps: {
          text: '2011',
          width: 100,
          fontSize: 30
        },
        iconProps: {
          font: 'FontAwesome',
          icon: '\uf0e7'
        }
      },
      {
        x: 500,
        rotate: 0,
        color: 'rgb(238, 194, 95)',
        labelProps: {
          text: '2011',
          width: 100,
          fontSize: 30
        },
        iconProps: {
          font: 'FontAwesome',
          icon: '\uf1d8'
        }
      }
    ]
  }
], []);

export default class Examples extends React.Component {

  constructor(props, context) {
    super(props, context);

    api.on('selectionChanged', this.handleSelectionChanged);
  }

  state = {
    elements: api.elements,
    zoom: 0.7
  };

  handleSelectionChanged = () => {
    this.setState({selectedNodes: api.getSelectedNodes()});
  };

  handleChange = (e) => {
    // var id = e.target.getAttribute('data-id');
    // console.log(id, e.target.value);
    let val = e.target.value;
    if (e.target.type === 'number') {
      val = Number(val);
    }
    this.state.selectedNodes[0].processChange(e.target.name, val);
  };

  componentWillUnmount() {
    api.unbind('selectionChanged', this.handleSelectionChanged);
  }

  decreaseZoom = () => {
    this.setState({zoom: this.state.zoom - 0.10});
  }

  increaseZoom = () => {
    this.setState({zoom: this.state.zoom + 0.10});
  }

  render() {
    const selection = this.state.selectedNodes && this.state.selectedNodes.length ? this.state.selectedNodes[this.state.selectedNodes.length-1] : null;
    const form = selection ? selection.getForm() : null;
    return (<div style={{position: 'relative'}}>
      <div>
        <div>
          <button onClick={this.decreaseZoom}>-</button>
          Zoom ({(this.state.zoom).toFixed(2)})
          <button onClick={this.increaseZoom}>+</button>
        </div>
      </div>
      <div style={{minHeight: 600, maxHeight: 700, marginRight: 200, position: 'relative'}}>
        <Canvas zoom={this.state.zoom} api={api} />
      </div>
      <div style={{position: 'absolute', right: 0, top: 0, width: 200}}>
        {form ? <div>
          <h3>Form</h3>
          <div>{selection.props._key}</div>
          <div>{form.map(el => <div key={el.key}>{el.key} : <Input type={el.type} name={el.key} value={api.getValue(selection.id, [el.key])} onChange={this.handleChange} /></div>)}</div>
        </div> : null}
      </div>
    </div>);
  }
}

const Input = (props) => {
  if (props.type === 'text') {
    return <textarea name={props.name} value={props.value} onChange={props.onChange} />;
  }
  return <input {...props} />;
}
