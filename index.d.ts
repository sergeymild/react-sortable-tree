export type TreeData = {
  title: string;
  subtitle: string;
  expanded: boolean;
  children: Array<TreeData>;
}

export type SearchResult = {
  matches: Array<string>
}

export type SearchCriteria = {
  node: TreeData;
  searchQuery?: string
}

export type SortableTree = {
  treeData: Array<TreeData>;
  onChange?: (treeData: Array<TreeData>) => void;
  searchMethod?: (search: SearchCriteria) => boolean;
  searchFinishCallback?: (matches: SearchResult) => void;
  searchQuery?: string;
  onlyExpandSearchedNodes?: boolean;
}