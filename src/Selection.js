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
    const rectProps = {
      x: selection.width < 0 ? selection.width : 0,
      y: selection.height < 0 ? selection.height : 0,
      width: Math.abs(selection.width),
      height: Math.abs(selection.height)
    };
    return (<g transform={selection.transform}>
      <g style={innerSelectionStyle}>
        <rect
          {...rectProps}
          fill="transparent"
        />
      </g>
      {selection.editor}
      <g style={innerSelectionStyle}>
        <rect
          {...rectProps}
          fill="transparent"
          vectorEffect="non-scaling-stroke"
          stroke="gray" strokeWidth="0.5"
          strokeOpacity="0.5"
        />
      </g>
      <g>
        {this.props.children}
      </g>
    </g>);
  }
}
