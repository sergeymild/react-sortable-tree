import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './tree-node.css';

class TreeNode extends Component {
  render() {
    const {
      children,
      listIndex,
      scaffoldBlockPxWidth,
      lowerSiblingCounts,
      treeIndex,
      rowDirection,
      ...otherProps
    } = this.props;

    const rowDirectionClass = rowDirection === 'rtl' ? 'rtl list-item' : 'list-item';
    const scaffoldBlockCount = lowerSiblingCounts.length;
    let style;
    if (rowDirection === 'rtl') {
      style = { right: scaffoldBlockPxWidth * scaffoldBlockCount };
    } else {
      style = { left: scaffoldBlockPxWidth * scaffoldBlockCount };
    }

    return (
      <div{...otherProps} className={rowDirectionClass}>
        <div className="content" style={style}>
          {children}
        </div>
      </div>
    );
  }
}

TreeNode.defaultProps = {
  rowDirection: 'ltr',
};

TreeNode.propTypes = {
  treeIndex: PropTypes.number.isRequired,
  scaffoldBlockPxWidth: PropTypes.number.isRequired,
  lowerSiblingCounts: PropTypes.arrayOf(PropTypes.number).isRequired,

  listIndex: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
  // rtl support
  rowDirection: PropTypes.string,
};

export default TreeNode;
