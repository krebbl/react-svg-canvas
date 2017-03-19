import React, {PropTypes} from 'react';
import JSONPretty from 'react-json-pretty';
import 'react-json-pretty/JSONPretty.monikai.styl';
import {Api, Canvas} from 'react-svg-canvas';
import textExamples from './textExamples';

class CodeExample extends React.Component {

  static propTypes = {
    elements: PropTypes.array,
    factoryMap: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
    title: PropTypes.string
  };

  constructor(props, context) {
    super(props, context);

    this.api = Api.create({
      width: props.width - 20,
      height: props.height - 20,
      background: 'white'
    }, props.elements);

    Object.keys(props.factoryMap || {}).forEach(key => {
      this.api.registerFactory(key, props.factoryMap[key]);
    });

    this.state = {
      zoom: 1
    };
  }


  render() {
    const {width, height} = this.props;
    return <div style={{width}}>
      <h2>{this.props.title}</h2>
      <div style={{position: 'relative', width, height}}>
        <Canvas api={this.api} zoom={this.state.zoom} />
      </div>
      <div>
        <JSONPretty json={this.props.elements} />
        {/* TODO: configuration */}
      </div>
    </div>
  }
}

export default class ComponentIndex extends React.Component {


  render() {
    return <div>
      {textExamples.map((example, i) => {
        return <CodeExample
          key={i}
          title={example.title}
          elements={example.elements}
          width={example.width} height={example.height}
        />
      })}
    </div>
  }

}
