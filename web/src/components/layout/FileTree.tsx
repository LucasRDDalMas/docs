'use client'
import { useState } from 'react'
import type { FileNode } from '@/types'
import styles from './FileTree.module.css'

interface Props { nodes: FileNode[]; currentPath: string }

function Node({ node, currentPath }: { node: FileNode; currentPath: string }) {
  const [open, setOpen] = useState(true)
  if (node.type === 'file') {
    // Hide _index.md — folder index pages are navigated via the folder label
    if (node.name === '_index.md') return null
    const href = `/docs/${node.path.replace(/^doc\//, '').replace(/\.md$/, '')}`
    const active = currentPath === node.path
    return (
      <a href={href} className={`${styles.file} ${active ? styles.active : ''}`}>
        {node.name.replace(/\.md$/, '')}
      </a>
    )
  }
  // If folder has _index.md, make the folder label a link to the folder page
  const hasIndex = node.children?.some(c => c.name === '_index.md')
  const folderHref = hasIndex ? `/docs/${node.path.replace(/^doc\//, '')}` : undefined
  return (
    <div className={styles.dir}>
      <button className={styles.dirLabel} onClick={() => setOpen(!open)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        {hasIndex && folderHref
          ? <a href={folderHref} onClick={e => e.stopPropagation()}>{node.name}</a>
          : node.name}
      </button>
      {open && node.children && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <Node key={child.path} node={child} currentPath={currentPath} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ nodes, currentPath }: Props) {
  return (
    <nav className={styles.tree}>
      {nodes.map((node) => <Node key={node.path} node={node} currentPath={currentPath} />)}
    </nav>
  )
}
