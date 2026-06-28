'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { FileNode } from '@/types'
import styles from './FileTree.module.css'

interface Props { nodes: FileNode[]; currentPath: string }

function Node({ node, currentPath }: { node: FileNode; currentPath: string }) {
  const [open, setOpen] = useState(true)
  if (node.type === 'file') {
    // Hide index files — the folder label links to them instead
    if (node.name === '_index.md' || node.name === 'index.md') return null
    const href = `/docs/${node.path.replace(/^docs\//, '').replace(/\.md$/, '')}`
    const active = currentPath === node.path
    return (
      <Link href={href} className={`${styles.file} ${active ? styles.active : ''}`}>
        {node.name.replace(/\.md$/, '')}
      </Link>
    )
  }
  // Make folder label clickable if it has _index.md or index.md
  const indexChild = node.children?.find(c => c.name === '_index.md' || c.name === 'index.md')
  // Always link to the folder path — page.tsx handles _index.md / index.md fallback
  const folderHref = indexChild
    ? `/docs/${node.path.replace(/^docs\//, '')}`
    : undefined
  return (
    <div className={styles.dir}>
      <button className={styles.dirLabel} onClick={() => setOpen(!open)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        {indexChild && folderHref
          ? <Link href={folderHref} onClick={e => e.stopPropagation()}>{node.name}</Link>
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
