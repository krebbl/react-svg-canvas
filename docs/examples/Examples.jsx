import React, {PropTypes} from 'react';
import {Canvas, Api} from 'react-svg-canvas';
import './css/font-awesome.css';
import Milestone from './elements/Milestone';
import Timeline from './elements/Timeline';

const api = Api.create({}, [
  {type: 'text', fontFamily: 'Arial', fontSize: 16, x: 20, y: 30, text: 'Should break between words', width: 70},
  {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 20, y: 10, text: 'Should break', textAnchor: 'middle'},
  {type: 'text', fontFamily: 'Arial', lineHeight: 3, x: 140, y: 20, text: 'Should swallow            spaces at the end', width: 110},
  {type: 'text', fontFamily: 'Times', rotate: 30, x: 140, fontSize: 17, y: 0, lineHeight: 2.0, text: 'Should use_the            spaces as empty line', width: 53},
  {type: 'text', fontFamily: 'Arial', fontSize: 17, x: 260, y: 20, text: 'Should\n      break at NL and show spaces', width: 120},
  {type: 'text', fontFamily: 'Verdana', fontSize: 6, x: 400, y: 20, text: '\n\n     \n     \n empty spaces with auto break', width: 120},
  {type: 'text', fontFamily: 'Times New Roman', rotate: 20, x: 520, y: 20, text: 'Should\n\nbe just one empty line', width: 110},
  {type: 'text', fontFamily: 'Verdana', width: 200, x: 700, y: 20, text: 'asdasdasdasd\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nempty spaces with auto break empty spaces with auto break'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 0, text: 'Should break like this', textAnchor: 'start'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 50, text: 'Should break like this', textAnchor: 'middle'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 100, text: 'Should break like this', textAnchor: 'end'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 200, y: 200, width: 200, text: 'Should break like this', textAnchor: 'start'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 200, y: 270, width: 200, text: 'Should break like this', textAnchor: 'middle'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 200, y: 340, width: 200, text: 'Should break like this', textAnchor: 'end'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 200, y: 470, width: 200, text: 'Should break like this', verticalAlign: 'top', textAnchor: 'end'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 400, y: 470, width: 200, text: 'Should break like this', verticalAlign: 'middle', textAnchor: 'middle'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 600, y: 470, width: 200, text: 'Should break like this', verticalAlign: 'bottom'},

  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 200, y: 600, height: 200, text: 'Should break like this', verticalAlign: 'top', textAnchor: 'end'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 400, y: 600, height: 200, text: 'Should break like this', verticalAlign: 'middle', textAnchor: 'middle'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 600, y: 600, height: 200, text: 'Should break like this', verticalAlign: 'bottom'},


  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 0, text: 'Should break like this', textAnchor: 'start'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 50, text: 'Should break like this', textAnchor: 'middle'},
  // {type: 'text', fontFamily: 'Verdana', fontSize: 20, x: 300, y: 100, text: 'Should break like this', textAnchor: 'end'},

  // {
  //   factory: Text, fontFamily: 'Verdana', fontSize: 30, x: 238, y: 100, text: 'Timeline example', width: 400, textAlign: 'center'
  // },
  // {
  //   factory: Text, fontFamily: 'Verdana', fontSize: 30, x: 238, y: 100, text: 'Timeline example', width: 400, textAlign: 'center'
  // },
  // {
  //   factory: Text, fontFamily: 'Verdana', fontSize: 30, x: 238, y: 100, text: 'Timeline example', width: 400, textAlign: 'center'
  // },
  // {
  //   factory: Timeline,
  //   x: 100,
  //   y: 700,
  //   width: 800,
  //   milestones: [
  //     {
  //       x: 100,
  //       rotate: 0,
  //       color: 'rgb(255,96,126)',
  //       labelProps: {
  //         text: '2009',
  //         width: 100,
  //         fontSize: 30
  //       },
  //       iconProps: {
  //         font: 'FontAwesome',
  //         icon: '\uf06d'
  //       }
  //     },
  //     {
  //       x: 300,
  //       rotate: 0,
  //       height: -500,
  //       color: 'rgb(84,198,225)',
  //       labelProps: {
  //         text: '2011',
  //         width: 100,
  //         fontSize: 30
  //       },
  //       iconProps: {
  //         font: 'FontAwesome',
  //         icon: '\uf0e7'
  //       }
  //     },
  //     {
  //       x: 500,
  //       rotate: 0,
  //       color: 'rgb(238, 194, 95)',
  //       labelProps: {
  //         text: '2011',
  //         width: 100,
  //         fontSize: 30
  //       },
  //       iconProps: {
  //         font: 'FontAwesome',
  //         icon: '\uf1d8'
  //       }
  //     }
  //   ]
  // }
], []);


function getPropType(type) {
  if (type === PropTypes.string) {
    return 'string';
  }
  if (type === PropTypes.number) {
    return 'number';
  }

  if (type === PropTypes.bool || type === PropTypes.node) {
    return null;
  }

  return 'string';
}

export default class Examples extends React.Component {

  constructor(props, context) {
    super(props, context);

    api.on('selectionChanged', this.handleSelectionChanged);
  }

  state = {
    selectedElements: [],
    elements: api.elements,
    zoom: 0.7
  };

  handleSelectionChanged = () => {
    this.setState({selectedElements: api.getSelectedElements()});
  };

  handleChange = (id, type, key, value) => {
    // var id = e.target.getAttribute('data-id');
    // console.log(id, e.target.value);
    let val = value;
    if (type === 'number') {
      val = Number(val);
      if (isNaN(val)) {
        return;
      }
    }
    api.processChange(id, key, val);
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
    return (<div style={{position: 'relative'}}>
      <div>
        <div>
          <button onClick={this.decreaseZoom}>-</button>
          Zoom ({(this.state.zoom).toFixed(2)})
          <button onClick={this.increaseZoom}>+</button>
        </div>
      </div>
      <div style={{minHeight: 600, maxHeight: 700, marginRight: 200, position: 'relative'}}>
        <Canvas zoom={this.state.zoom} api={api}/>
      </div>
      <div style={{position: 'absolute', right: 0, top: 0, width: 200}}>
        {this.state.selectedElements.map((element) => {
          const factory = api.getNode(element._id).constructor;
          return <div key={element._id}>
            <h6>{`${factory.name} / ${element._id}`}</h6>
            {Object.keys(factory.propTypes).map((key) => {
              if (key === '_id') {
                return null;
              }
              const type = getPropType(factory.propTypes[key]);
              if(!type) {
                return null;
              }
              return <div key={key}>
                <label>{key}</label><br/>
                <Input
                  type={type}
                  value={api.getValue(element._id, [key])}
                  onChange={e => this.handleChange(element._id, type, key, e.target.value)}/>
              </div>;
            })}
          </div>
        })}
      </div>
    </div>);
  }
}

const Input = (props) => {
  if (props.type === 'string') {
    return <textarea name={props.name} value={props.value} onChange={props.onChange}/>;
  }
  return <input {...props} />;
}
