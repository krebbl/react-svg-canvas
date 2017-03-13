import React, {PropTypes} from 'react';

const innerSelectionStyle = {pointerEvents: 'none'};

export default class Selection extends React.Component {

  static propTypes = {
  };

  static defaultProps = {};

  static contextTypes = {
    canvas: PropTypes.object,
    api: PropTypes.object
  };

  static childContextTypes = {
    matrix: PropTypes.object
  };

  getChildContext() {
    return {
      matrix: this.props.matrix
    };
  }

  render() {
    const selection = this.props;
    const rectProps = {
      x: selection.width < 0 ? selection.width : 0,
      y: selection.height < 0 ? selection.height : 0,
      width: Math.abs(selection.width),
      height: Math.abs(selection.height)
    };
    const matrix = selection.matrix;
    return (<g transform={`matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].join(',')})`}>
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
