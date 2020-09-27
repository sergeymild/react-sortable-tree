export interface TreeData {
  title: string;
  subtitle: string;
  expanded: boolean;
  children: Array<TreeData>;
}

export interface SearchResult {
  matches: Array<string>
}

export interface SearchCriteria {
  node: TreeData;
  searchQuery?: string
}

export interface SortableTree {
  treeData: Array<TreeData>;
  onChange?: (treeData: Array<TreeData>) => void;
  searchMethod?: (search: SearchCriteria) => boolean;
  searchFinishCallback?: (matches: SearchResult) => void;
  searchQuery?: string;
  onlyExpandSearchedNodes?: boolean;
}