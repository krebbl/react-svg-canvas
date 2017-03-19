
export default [
  {
    title: 'Text anchor without width set',
    width: 800,
    height: 200,
    elements: [
      {type: 'text', fontSize: 20, x: 300, y: 0, text: 'Left Aligned', textAnchor: 'start'},
      {type: 'text', fontSize: 20, x: 300, y: 50, text: 'Center Aligned', textAnchor: 'middle'},
      {type: 'text', fontSize: 20, x: 300, y: 100, text: 'Right Aligned', textAnchor: 'end'}
    ]
  },
  {
    title: 'Text anchor with width set',
    width: 800,
    height: 200,
    elements: [
      {type: 'text', fontSize: 20, x: 200, y: 0, width: 200, text: 'Left aligned in box', textAnchor: 'start'},
      {type: 'text', fontSize: 20, x: 200, y: 50, width: 200, text: 'Center aligned in box', textAnchor: 'middle'},
      {type: 'text', fontSize: 20, x: 200, y: 110, width: 200, text: 'Right aligned in box', textAnchor: 'end'}
    ]
  },
  {
    title: 'Vertical align without height set',
    width: 800,
    height: 200,
    elements: [
      {type: 'text', fontSize: 20, x: 10, y: 60, width: 200, text: 'Vertical align top', verticalAlign: 'top'},
      {type: 'text', fontSize: 20, x: 200, y: 60, width: 200, text: 'Vertical align middle', verticalAlign: 'middle'},
      {type: 'text', fontSize: 20, x: 500, y: 60, width: 200, text: 'Vertical align bottom', verticalAlign: 'bottom'}
    ]
  }
];
