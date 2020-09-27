import React, { Component } from 'react';
import './tree-node.css';

interface IProps {
  readonly scaffoldBlockPxWidth: number
  readonly lowerSiblingCounts: Array<number>
  readonly rowDirection: string
  readonly style: React.CSSProperties
}

class TreeNode extends Component<IProps> {
  public render() {
    const {
      children,
      scaffoldBlockPxWidth,
      lowerSiblingCounts,
      rowDirection,
      ...otherProps
    } = this.props;

    const rowDirectionClass = rowDirection === 'rtl' ? 'rtl list-item' : 'list-item';
    const scaffoldBlockCount = lowerSiblingCounts.length === 1 ? 0 : lowerSiblingCounts.length - 1;
    let style;
    const margin = scaffoldBlockPxWidth * scaffoldBlockCount
    if (rowDirection === 'rtl') {
      style = { right: margin };
    } else {
      style = { left: margin };
    }

    return (
      <div{...otherProps} className={rowDirectionClass} style={this.props.style}>
        <div className="content" style={{...style, width: `calc(100% - ${margin}px)`}}>
          {children}
        </div>
      </div>
    );
  }
}

export default TreeNode;
