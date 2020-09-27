import isEqual from 'lodash.isequal';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { polyfill } from 'react-lifecycles-compat';
import { AutoSizer, List } from 'react-virtualized';
import 'react-virtualized/styles.css';
import NodeRendererDefault from './node-renderer-default';
import TreeNode from './tree-node';
import {
  defaultGetNodeKey,
  defaultSearchMethod,
} from './utils/default-handlers';
import { memoizedGetFlatDataFromTree } from './utils/memoized-tree-data-utils';
import {
  changeNodeAtPath,
  find,
  toggleExpandedForAll,
  walk,
} from './utils/tree-data-utils';

let treeIdCounter = 1;

const mergeTheme = props => {
  const merged = {
    ...props,
    style: { ...props.theme.style, ...props.style },
    innerStyle: { ...props.theme.innerStyle, ...props.innerStyle },
    reactVirtualizedListProps: {
      ...props.theme.reactVirtualizedListProps,
      ...props.reactVirtualizedListProps,
    },
  };

  const overridableDefaults = {
    nodeContentRenderer: NodeRendererDefault,
    rowHeight: 30,
    scaffoldBlockPxWidth: 44,
    treeNodeRenderer: TreeNode,
  };
  Object.keys(overridableDefaults).forEach(propKey => {
    // If prop has been specified, do not change it
    // If prop is specified in theme, use the theme setting
    // If all else fails, fall back to the default
    if (props[propKey] === null) {
      merged[propKey] =
        typeof props.theme[propKey] !== 'undefined'
          ? props.theme[propKey]
          : overridableDefaults[propKey];
    }
  });

  return merged;
};

class ReactSortableTree extends Component {
  constructor(props) {
    super(props);

    const {
      nodeContentRenderer,
      treeNodeRenderer,
    } = mergeTheme(props);
    // Wrapping classes for use with react-dnd
    this.treeId = `rst__${treeIdCounter}`;
    treeIdCounter += 1;
    this.nodeContentRenderer = nodeContentRenderer;
    this.treeNodeRenderer = treeNodeRenderer;

    this.scrollZoneVirtualList = List;

    this.state = {
      searchMatches: [],
      searchFocusTreeIndex: null,

      // props that need to be used in gDSFP or static functions will be stored here
      instanceProps: {
        treeData: [],
        ignoreOneTreeUpdate: false,
        searchQuery: null,
        searchFocusOffset: null,
      },
    };

    this.toggleChildrenVisibility = this.toggleChildrenVisibility.bind(this);
  }

  componentDidMount() {
    ReactSortableTree.loadLazyChildren(this.props, this.state);
    const stateUpdate = ReactSortableTree.search(
      this.props,
      this.state,
      true,
      true,
      false,
    );
    this.setState(stateUpdate);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { instanceProps } = prevState;
    const newState = {};

    const isTreeDataEqual = isEqual(instanceProps.treeData, nextProps.treeData);

    // make sure we have the most recent version of treeData
    instanceProps.treeData = nextProps.treeData;

    if (!isTreeDataEqual) {
      if (instanceProps.ignoreOneTreeUpdate) {
        instanceProps.ignoreOneTreeUpdate = false;
      } else {
        newState.searchFocusTreeIndex = null;
        ReactSortableTree.loadLazyChildren(nextProps, prevState);
        Object.assign(
          newState,
          ReactSortableTree.search(nextProps, prevState, false, false, false),
        );
      }

    } else if (!isEqual(instanceProps.searchQuery, nextProps.searchQuery)) {
      Object.assign(
        newState,
        ReactSortableTree.search(nextProps, prevState, true, true, false),
      );
    } else if (
      instanceProps.searchFocusOffset !== nextProps.searchFocusOffset
    ) {
      Object.assign(
        newState,
        ReactSortableTree.search(nextProps, prevState, true, true, true),
      );
    }

    instanceProps.searchQuery = nextProps.searchQuery;
    instanceProps.searchFocusOffset = nextProps.searchFocusOffset;
    newState.instanceProps = { ...instanceProps, ...newState.instanceProps };

    return newState;
  }

  getRows(treeData) {
    return memoizedGetFlatDataFromTree({
      ignoreCollapsed: true,
      getNodeKey: this.props.getNodeKey,
      treeData,
    });
  }


  toggleChildrenVisibility(node, path) {
    const { instanceProps } = this.state;

    const treeData = changeNodeAtPath({
      treeData: instanceProps.treeData,
      path,
      newNode: ({ node }) => ({ ...node, expanded: !node.expanded }),
      getNodeKey: this.props.getNodeKey,
    });

    this.props.onChange(treeData);

    this.props.onVisibilityToggle({
      treeData,
      node,
      expanded: !node.expanded,
      path,
    });
  }


  // returns the new state after search
  static search(props, state, seekIndex, expand, singleSearch) {
    const {
      onChange,
      getNodeKey,
      searchFinishCallback,
      searchQuery,
      searchMethod,
      searchFocusOffset,
      onlyExpandSearchedNodes,
    } = props;

    const { instanceProps } = state;

    // Skip search if no conditions are specified
    if (!searchQuery && !searchMethod) {
      if (searchFinishCallback) {
        searchFinishCallback([]);
      }

      return { searchMatches: [] };
    }

    const newState = { instanceProps: {} };

    // if onlyExpandSearchedNodes collapse the tree and search
    const { treeData: expandedTreeData, matches: searchMatches } = find({
      getNodeKey,
      treeData: onlyExpandSearchedNodes
        ? toggleExpandedForAll({
          treeData: instanceProps.treeData,
          expanded: false,
        })
        : instanceProps.treeData,
      searchQuery,
      searchMethod: searchMethod || defaultSearchMethod,
      searchFocusOffset,
      expandAllMatchPaths: expand && !singleSearch,
      expandFocusMatchPaths: !!expand,
    });

    // Update the tree with data leaving all paths leading to matching nodes open
    if (expand) {
      newState.instanceProps.ignoreOneTreeUpdate = true; // Prevents infinite loop
      onChange(expandedTreeData);
    }

    if (searchFinishCallback) {
      searchFinishCallback(searchMatches);
    }

    let searchFocusTreeIndex = null;
    if (
      seekIndex &&
      searchFocusOffset !== null &&
      searchFocusOffset < searchMatches.length
    ) {
      searchFocusTreeIndex = searchMatches[searchFocusOffset].treeIndex;
    }

    newState.searchMatches = searchMatches;
    newState.searchFocusTreeIndex = searchFocusTreeIndex;

    return newState;
  }

  canNodeHaveChildren(node) {
    const { canNodeHaveChildren } = this.props;
    if (canNodeHaveChildren) {
      return canNodeHaveChildren(node);
    }
    return true;
  }

  // Load any children in the tree that are given by a function
  // calls the onChange callback on the new treeData
  static loadLazyChildren(props, state) {
    const { instanceProps } = state;

    walk({
      treeData: instanceProps.treeData,
      getNodeKey: props.getNodeKey,
      callback: ({ node, path, lowerSiblingCounts, treeIndex }) => {
        // If the node has children defined by a function, and is either expanded
        //  or set to load even before expansion, run the function.
        if (
          node.children &&
          typeof node.children === 'function' &&
          (node.expanded || props.loadCollapsedLazyChildren)
        ) {
          // Call the children fetching function
          node.children({
            node,
            path,
            lowerSiblingCounts,
            treeIndex,

            // Provide a helper to append the new data when it is received
            done: childrenArray =>
              props.onChange(
                changeNodeAtPath({
                  treeData: instanceProps.treeData,
                  path,
                  newNode: ({ node: oldNode }) =>
                    // Only replace the old node if it's the one we set off to find children
                    //  for in the first place
                    oldNode === node
                      ? {
                        ...oldNode,
                        children: childrenArray,
                      }
                      : oldNode,
                  getNodeKey: props.getNodeKey,
                }),
              ),
          });
        }
      },
    });
  }

  renderRow(row, { listIndex, style, matchKeys }) {
    const { node, parentNode, path, lowerSiblingCounts, treeIndex } = row;

    const {
      scaffoldBlockPxWidth,
      searchFocusOffset,
      rowDirection,
    } = mergeTheme(this.props);
    const TreeNodeRenderer = this.treeNodeRenderer;
    const NodeContentRenderer = this.nodeContentRenderer;
    const nodeKey = path[path.length - 1];
    const isSearchMatch = nodeKey in matchKeys;
    const isSearchFocus =
      isSearchMatch && matchKeys[nodeKey] === searchFocusOffset;

    return (
      <TreeNodeRenderer
        style={style}
        key={nodeKey}
        listIndex={listIndex}
        lowerSiblingCounts={lowerSiblingCounts}
        treeIndex={treeIndex}
        scaffoldBlockPxWidth={scaffoldBlockPxWidth}
        node={node}
        path={path}
        rowDirection={rowDirection}
      >
        <NodeContentRenderer
          parentNode={parentNode}
          isSearchMatch={isSearchMatch}
          isSearchFocus={isSearchFocus}
          toggleChildrenVisibility={this.toggleChildrenVisibility}
          treeIndex={treeIndex}
          node={node}
          path={path}
        />
      </TreeNodeRenderer>
    );
  }

  onScroll = (e) => { this.scrollTop = e.scrollTop };

  render() {
    const {
      style,
      className,
      innerStyle,
      rowHeight,
      reactVirtualizedListProps
    } = mergeTheme(this.props);
    const {
      searchMatches,
      searchFocusTreeIndex,
      instanceProps,
    } = this.state;

    const rows = this.getRows(instanceProps.treeData);

    // Get indices for rows that match the search conditions
    const matchKeys = {};
    searchMatches.forEach(({ path }, i) => {
      matchKeys[path[path.length - 1]] = i;
    });

    // Seek to the focused search result if there is one specified
    const scrollToInfo =
      searchFocusTreeIndex !== null
        ? { scrollToIndex: searchFocusTreeIndex }
        : {};

    let containerStyle = style;
    containerStyle = { height: '100%', ...containerStyle };
    const ScrollZoneVirtualList = this.scrollZoneVirtualList;
    // Render list with react-virtualized
    const list = (
      <AutoSizer>
        {({ height, width }) => (
          <ScrollZoneVirtualList
            {...scrollToInfo}
            speed={30}
            scrollToAlignment="start"
            className="rst__virtualScrollOverride"
            width={width}
            onScroll={this.onScroll}
            height={height}
            style={innerStyle}
            rowCount={rows.length}
            estimatedRowSize={
              typeof rowHeight !== 'function' ? rowHeight : undefined
            }
            rowHeight={
              typeof rowHeight !== 'function'
                ? rowHeight
                : ({ index }) =>
                  rowHeight({
                    index,
                    treeIndex: index,
                    node: rows[index].node,
                    path: rows[index].path,
                  })
            }
            rowRenderer={({ index, style: rowStyle }) =>
              this.renderRow(rows[index], {
                listIndex: index,
                style: rowStyle,
                matchKeys,
              })
            }
            {...reactVirtualizedListProps}
          />
        )}
      </AutoSizer>
    );

    return (
      <div
        className={className}
        style={containerStyle}
      >
        {list}
      </div>
    );
  }
}

ReactSortableTree.propTypes = {

  // Tree data in the following format:
  // [{title: 'main', subtitle: 'sub'}, { title: 'value2', expanded: true, children: [{ title: 'value3') }] }]
  // `title` is the primary label for the node
  // `subtitle` is a secondary label for the node
  // `expanded` shows children of the node if true, or hides them if false. Defaults to false.
  // `children` is an array of child nodes belonging to the node.
  treeData: PropTypes.arrayOf(PropTypes.object).isRequired,

  // Style applied to the container wrapping the tree (style defaults to {height: '100%'})
  style: PropTypes.shape({}),

  // Class name for the container wrapping the tree
  className: PropTypes.string,

  // Style applied to the inner, scrollable container (for padding, etc.)
  innerStyle: PropTypes.shape({}),

  // Used by react-virtualized
  // Either a fixed row height (number) or a function that returns the
  // height of a row given its index: `({ index: number }): number`
  rowHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),

  // Custom properties to hand to the react-virtualized list
  // https://github.com/bvaughn/react-virtualized/blob/master/docs/List.md#prop-types
  reactVirtualizedListProps: PropTypes.shape({}),

  // The width of the blocks containing the lines representing the structure of the tree.
  scaffoldBlockPxWidth: PropTypes.number,

  // The method used to search nodes.
  // Defaults to a function that uses the `searchQuery` string to search for nodes with
  // matching `title` or `subtitle` values.
  // NOTE: Changing `searchMethod` will not update the search, but changing the `searchQuery` will.
  searchMethod: PropTypes.func,

  // Used by the `searchMethod` to highlight and scroll to matched nodes.
  // Should be a string for the default `searchMethod`, but can be anything when using a custom search.
  searchQuery: PropTypes.any, // eslint-disable-line react/forbid-prop-types

  // Outline the <`searchFocusOffset`>th node and scroll to it.
  searchFocusOffset: PropTypes.number,

  // Get the nodes that match the search criteria. Used for counting total matches, etc.
  searchFinishCallback: PropTypes.func,

  treeNodeRenderer: PropTypes.func,

  // Override the default component for rendering nodes (but keep the scaffolding generator)
  // This is an advanced option for complete customization of the appearance.
  // It is best to copy the component in `node-renderer-default.js` to use as a base, and customize as needed.
  nodeContentRenderer: PropTypes.func,

  theme: PropTypes.shape({
    style: PropTypes.shape({}),
    innerStyle: PropTypes.shape({}),
    reactVirtualizedListProps: PropTypes.shape({}),
    scaffoldBlockPxWidth: PropTypes.number,
    rowHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.func]),
    treeNodeRenderer: PropTypes.func,
    nodeContentRenderer: PropTypes.func,
  }),

  // Determine the unique key used to identify each node and
  // generate the `path` array passed in callbacks.
  // By default, returns the index in the tree (omitting hidden nodes).
  getNodeKey: PropTypes.func,

  // Called whenever tree data changed.
  // Just like with React input elements, you have to update your
  // own component's data to see the changes reflected.
  onChange: PropTypes.func.isRequired,

  // Determine whether a node can have children
  canNodeHaveChildren: PropTypes.func,

  // Called after children nodes collapsed or expanded.
  onVisibilityToggle: PropTypes.func,

  // Specify that nodes that do not match search will be collapsed
  onlyExpandSearchedNodes: PropTypes.bool,

  // rtl support
  rowDirection: PropTypes.string,
};

ReactSortableTree.defaultProps = {
  className: '',
  getNodeKey: defaultGetNodeKey,
  innerStyle: {},
  treeNodeRenderer: null,
  nodeContentRenderer: null,
  onVisibilityToggle: () => {
  },
  reactVirtualizedListProps: {},
  rowHeight: null,
  scaffoldBlockPxWidth: null,
  searchFinishCallback: null,
  searchFocusOffset: null,
  searchMethod: null,
  searchQuery: null,
  style: {},
  theme: {},
  onlyExpandSearchedNodes: false,
  rowDirection: 'ltr',
};

polyfill(ReactSortableTree);


const SortableTree = props => (
  <ReactSortableTree {...props} />
);

export default SortableTree;
