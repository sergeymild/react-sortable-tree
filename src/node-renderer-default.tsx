import React, { Component } from 'react'
import { TreeData } from './index'
import { Octicon, OcticonSymbol } from '../../octicons'
import { RelativeTime } from '../../relative-time'

interface IProps {
  readonly node: TreeData,
  readonly path: Array<string | number>,
  readonly treeIndex: number
  readonly toggleChildrenVisibility?: (node: TreeData, path: Array<string | number>, treeIndex: number) => void
  readonly isSearchMatch: boolean
  readonly isSearchFocus: boolean
}

class NodeRendererDefault extends Component<IProps> {
  private onClick = () => {
    const func = this.props.toggleChildrenVisibility
    if (!func) return
    func(this.props.node, this.props.path, this.props.treeIndex)
  }

  public render() {
    const {
      node,
      isSearchMatch,
      isSearchFocus,
    } = this.props
    let rowClassNames = 'row'
    if (isSearchMatch) rowClassNames += ' row-search-match'
    if (isSearchFocus) rowClassNames += ' row-search-focus'
    const icon = node.children.length > 0
      ? OcticonSymbol.fileDirectory
      : OcticonSymbol.gitBranch
    return (
      <span className={rowClassNames}>
        <Octicon className="icon" symbol={icon} onClick={node.children.length > 0 ? this.onClick : undefined} />
        <span className="row-title">{node.title}</span>
        {node.subtitle && <span className="row-subtitle">
          <RelativeTime date={new Date(node.subtitle)}/>
        </span>}
      </span>
    )
  }
}


export default NodeRendererDefault
