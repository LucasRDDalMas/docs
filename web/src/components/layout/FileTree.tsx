'use client'
import { useState } from 'react'
import type { FileNode } from '@/types'
import styles from './FileTree.module.css'

interface Props { nodes: FileNode[]; currentPath: string }

function Node({ node, currentPath }: { node: FileNode; currentPath: string }) {
  const [open, setOpen] = useState(true)
  if (node.type === 'file') {
    const href = `/docs/${node.path.replace(/\.md$/, '')}`
    const active = currentPath === node.path
    return (
      <a href={href} className={`${styles.file} ${active ? styles.active : ''}`}>
        {node.name.replace(/\.md$/, '')}
      </a>
    )
  }
  return (
    <div className={styles.dir}>
      <button className={styles.dirLabel} onClick={() => setOpen(!open)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        {node.name}
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
