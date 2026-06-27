'use client'
import styles from './DocContent.module.css'

interface Props { html: string; filePath: string }

export function DocContent({ html, filePath }: Props) {
  return (
    <article
      dangerouslySetInnerHTML={{ __html: html }}
      data-doc-path={filePath}
      className={styles.article}
    />
  )
}
