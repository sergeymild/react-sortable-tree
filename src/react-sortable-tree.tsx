import React, { Component } from 'react'
import { AutoSizer, Grid } from 'react-virtualized'
import 'react-virtualized/styles.css'
import NodeRendererDefault from './node-renderer-default'
import TreeNode from './tree-node'
import { defaultGetNodeKey, defaultSearchMethod } from './utils/default-handlers'
import { memoizedGetFlatDataFromTree } from './utils/memoized-tree-data-utils'
import { changeNodeAtPath, find, toggleExpandedForAll, walk } from './utils/tree-data-utils'
import { TreeData, VisibilityChangeParams } from './index'
import deepEqual from 'deep-equal'

interface IProps {
  treeData: Array<TreeData>,
  className: string
  rowHeight: number
  scaffoldBlockPxWidth: number | null
  searchMethod: ((node: TreeData, searchQuery: string) => void) | null
  searchQuery: string | null
  searchFocusOffset: number | null
  searchFinishCallback: (() => void) | null
  getNodeKey?: () => number,
  onChange: ((treeData: Array<TreeData>) => void) | null,
  onVisibilityToggle: (params: VisibilityChangeParams) => void,
  onlyExpandSearchedNodes: boolean,
  rowDirection: string,
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface InstanceProps {
  treeData: Array<TreeData>
  ignoreOneTreeUpdate: boolean
  searchQuery: string | null
  searchFocusOffset: number | null
}

interface IState {
  searchMatches: Array<string>
  searchFocusTreeIndex: number | null
  instanceProps: InstanceProps
}

export class ReactSortableTree extends Component<IProps, IState> {
  public static defaultProps: IProps = {
    treeData: [],
    onChange: null,
    className: '',
    getNodeKey: defaultGetNodeKey,
    onVisibilityToggle: () => {},
    rowHeight: 30,
    scaffoldBlockPxWidth: null,
    searchFinishCallback: null,
    searchFocusOffset: null,
    searchMethod: null,
    searchQuery: null,
    onlyExpandSearchedNodes: false,
    rowDirection: 'ltr',
  }

  public constructor(props: IProps) {
    super(props);

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

  public componentDidMount() {
    ReactSortableTree.loadLazyChildren(this.props, this.state);
    const stateUpdate = ReactSortableTree.search(
      this.props,
      this.state,
      true,
      true,
      false,
    );
    // @ts-ignore
    this.setState(stateUpdate);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility,@typescript-eslint/member-ordering
  static getDerivedStateFromProps(nextProps: IProps, prevState: IState): Partial<IState> | null {
    const { instanceProps } = prevState;
    const newState = {};

    const isTreeDataEqual = deepEqual(instanceProps.treeData, nextProps.treeData);

    // make sure we have the most recent version of treeData
    instanceProps.treeData = nextProps.treeData;

    if (!isTreeDataEqual) {
      if (instanceProps.ignoreOneTreeUpdate) {
        instanceProps.ignoreOneTreeUpdate = false;
      } else {
        // @ts-ignore
        newState.searchFocusTreeIndex = null;
        ReactSortableTree.loadLazyChildren(nextProps, prevState);
        Object.assign(
          newState,
          ReactSortableTree.search(nextProps, prevState, false, false, false),
        );
      }

    } else if (instanceProps.searchQuery !== nextProps.searchQuery) {
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
    // @ts-ignore
    newState.instanceProps = { ...instanceProps, ...newState.instanceProps };
    return newState;
  }

  private getRows(treeData: Array<TreeData>) {
    return memoizedGetFlatDataFromTree({
      ignoreCollapsed: true,
      getNodeKey: this.props.getNodeKey,
      treeData,
    });
  }


  private toggleChildrenVisibility(node: TreeData, path: Array<string | number>) {
    const { instanceProps } = this.state;

    // @ts-ignore
    const treeData: Array<TreeData> = changeNodeAtPath({
      // @ts-ignore
      treeData: instanceProps.treeData,
      path,
      // @ts-ignore
      newNode: ({ node }) => ({ ...node, expanded: !node.expanded }),
      getNodeKey: this.props.getNodeKey,
    });

    if (this.props.onChange) this.props.onChange(treeData);

    this.props.onVisibilityToggle({
      treeData,
      node,
      expanded: !node.expanded,
      path,
    });
  }


  // returns the new state after search
  // eslint-disable-next-line @typescript-eslint/member-ordering
  private static search(
    props: IProps,
    state: IState,
    seekIndex: boolean,
    expand: boolean,
    singleSearch: boolean
  ) {
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
        // @ts-ignore
        searchFinishCallback([]);
      }

      return { searchMatches: [] };
    }

    const newState = { instanceProps: {} };

    // if onlyExpandSearchedNodes collapse the tree and search
    // @ts-ignore
    const { treeData: expandedTreeData, matches: searchMatches } = find({
      // @ts-ignore
      getNodeKey,
      treeData: onlyExpandSearchedNodes
        ? toggleExpandedForAll({
          // @ts-ignore
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
      // @ts-ignore
      newState.instanceProps.ignoreOneTreeUpdate = true; // Prevents infinite loop
      // @ts-ignore
      onChange(expandedTreeData);
    }

    if (searchFinishCallback) {
      // @ts-ignore
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

    // @ts-ignore
    newState.searchMatches = searchMatches;
    // @ts-ignore
    newState.searchFocusTreeIndex = searchFocusTreeIndex;
    return newState;
  }

  // Load any children in the tree that are given by a function
  // calls the onChange callback on the new treeData
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility,@typescript-eslint/member-ordering
  static loadLazyChildren(props, state) {
    const { instanceProps } = state;

    walk({
      // @ts-ignore
      treeData: instanceProps.treeData,
      getNodeKey: props.getNodeKey,
      // @ts-ignore
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
            // @ts-ignore
            done: childrenArray =>
              props.onChange(
                changeNodeAtPath({
                  // @ts-ignore
                  treeData: instanceProps.treeData,
                  path,
                  // @ts-ignore
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
// @ts-ignore
  private renderRow = (row, index, matchKeys, style: React.CSSProperties, key: string) => {
    const { node, path, lowerSiblingCounts, treeIndex } = row;

    const scaffoldBlockPxWidth = 23
    const rowDirection = this.props.rowDirection;
    const searchFocusOffset = this.props.searchFocusOffset;

    const nodeKey = path[path.length - 1];
    const isSearchMatch = nodeKey in matchKeys;
    const isSearchFocus =
      isSearchMatch && matchKeys[nodeKey] === searchFocusOffset;
    return (
      <TreeNode
        key={key}
        lowerSiblingCounts={lowerSiblingCounts}
        scaffoldBlockPxWidth={scaffoldBlockPxWidth}
        rowDirection={rowDirection}
        style={style}
      >
        <NodeRendererDefault
          isSearchMatch={isSearchMatch}
          isSearchFocus={isSearchFocus}
          toggleChildrenVisibility={this.toggleChildrenVisibility}
          treeIndex={treeIndex}
          node={node}
          path={path}
        />
      </TreeNode>
    );
  }

  public render() {
    const {
      rowHeight
    } = this.props;
    const {
      searchMatches,
      searchFocusTreeIndex,
      instanceProps,
    } = this.state;

    const rows = this.getRows(instanceProps.treeData);

    // Get indices for rows that match the search conditions
    const matchKeys = {};
    // @ts-ignore
    searchMatches.forEach(({ path }, i) => {
      // @ts-ignore
      matchKeys[path[path.length - 1]] = i;
    });

    // Seek to the focused search result if there is one specified
    const scrollToInfo =
      searchFocusTreeIndex !== null
        ? { scrollToIndex: searchFocusTreeIndex }
        : {};


    return (
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            {...scrollToInfo}
            autoContainerWidth={true}
            columnWidth={width}
            columnCount={1}
            scrollToAlignment="start"
            className="rst__virtualScrollOverride"
            width={width}
            height={height}
            rowCount={rows.length}
            rowHeight={rowHeight}
            overscanRowCount={4}
            cellRenderer={({ rowIndex, style, key }) =>
              this.renderRow(rows[rowIndex], rowIndex, matchKeys, style, key)
            }
          />
        )}
      </AutoSizer>
    );
  }
}