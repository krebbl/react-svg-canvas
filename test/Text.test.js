import expect from 'expect';
import React from 'react';
import ReactDOM from 'react-dom';
import Api from '../src/Api';
import Canvas from '../src/Canvas';
import Text from '../src/Text';

describe('Text', () => {
  it('should render canvas', (done) => {
    const api = Api.create([
      {factory: Text, fontFamily: 'Arial', fontSize: 16, x: 20, y: 30, text: 'Should break between words', width: 70},
      {factory: Text, fontFamily: 'Verdana', fontSize: 6, x: 20, y: 10, text: 'Should break', width: 30},
      {factory: Text, fontFamily: 'Arial', lineHeight: 3, x: 140, y: 20, text: 'Should swallow            spaces at the end', width: 110},
      {factory: Text, fontFamily: 'Times', rotate: 30, x: 140, fontSize: 17, y: 0, lineHeight: 2.0, text: 'Should use_the            spaces as empty line', width: 53},
      {factory: Text, fontFamily: 'Arial', fontSize: 17, x: 260, y: 20, text: 'Should\n      break at NL and show spaces', width: 120}
      ]);

    ReactDOM.render(<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, right: 0}}>
      <Canvas api={api} onFirstRender={(canvas) => {
        var canvasNode = ReactDOM.findDOMNode(canvas)
        expect(canvasNode).toExist();
        var textElements = canvasNode.querySelectorAll('.element-text');
        expect(textElements.length).toBe(5);
        expect(textElements[1].querySelector('text').getAttribute('font-size')).toBe('5');


        done();
      }}/>
    </div>, document.body);


  });
});
