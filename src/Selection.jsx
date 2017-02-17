import React, {PropTypes} from 'react';

const innerSelectionStyle = {pointerEvents: 'none'};

export default class Selection extends React.Component {

  static propTypes = {
  };

  static defaultProps = {};

  static contextTypes = {
    zoom: PropTypes.number,
    canvas: PropTypes.object,
    api: PropTypes.object
  };

  render() {
    const selection = this.props;
    return (<g transform={selection.transform}>
      <g style={innerSelectionStyle}>
        <rect
          width={selection.width}
          height={selection.height}
          fill="transparent"
        />
      </g>
      {selection.editor}
      <g style={innerSelectionStyle}>
        <rect
          width={selection.width} height={selection.height} fill="transparent"
          vectorEffect="non-scaling-stroke"
          stroke="blue" strokeWidth="0.5"
        />
      </g>
      <g>
        {this.props.children}
      </g>
    </g>);
  }
}
