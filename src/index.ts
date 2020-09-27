// eslint-disable-next-line @typescript-eslint/naming-convention
export interface TreeData {
  id: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  item?: any,
  children: Array<TreeData>;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SearchResult {
  matches: Array<string>
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SearchCriteria {
  node: TreeData;
  searchQuery?: string
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SortableTree {
  treeData: Array<TreeData>;
  onChange?: (treeData: Array<TreeData>) => void;
  searchMethod?: (search: SearchCriteria) => boolean;
  searchFinishCallback?: () => void
  searchQuery?: string
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface VisibilityChangeParams {
  treeData: Array<TreeData>
  node: TreeData
  expanded: boolean
  path: Array<string | number>
}

import { ReactSortableTree } from './react-sortable-tree';

export * from './utils/default-handlers';
export * from './utils/tree-data-utils';
export const SortableTree = ReactSortableTree;
