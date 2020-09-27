import React, { Component } from 'react';
import PropTypes from 'prop-types';

class NodeRendererDefault extends Component {
  onClick = (e) => {
    e.preventDefault()
    this.props.toggleChildrenVisibility(this.props.node, this.props.path, this.props.treeIndex)
  }

  render() {
    const {
      toggleChildrenVisibility,
      node,
      isSearchMatch,
      isSearchFocus,
    } = this.props;
    let rowClassNames = 'row'
    if (isSearchMatch) rowClassNames += ' row-search-match'
    if (isSearchFocus) rowClassNames += ' row-search-focus'

    return (
      <>
        {toggleChildrenVisibility &&
          node.children &&
          (node.children.length > 0 || typeof node.children === 'function') && (
          <button
            type="button"
            className={node.expanded ? 'collapsed-button' : 'expanded-button'}
            onClick={this.onClick}
          />
          )}

        <div className={rowClassNames}>
          <span className="row-title">{node.title}</span>
          {node.subtitle && <span className="row-subtitle">{node.subtitle}</span>}
        </div>
      </>
    );
  }
}

NodeRendererDefault.defaultProps = {
  isSearchMatch: false,
  isSearchFocus: false,
  toggleChildrenVisibility: null,
  style: {},
  title: null,
};

NodeRendererDefault.propTypes = {
  node: PropTypes.shape({}).isRequired,
  title: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  path: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  treeIndex: PropTypes.number.isRequired,
  isSearchMatch: PropTypes.bool,
  isSearchFocus: PropTypes.bool,
  toggleChildrenVisibility: PropTypes.func,
  style: PropTypes.shape({}),
  // rtl support
  rowDirection: PropTypes.string,
};

export default NodeRendererDefault;
