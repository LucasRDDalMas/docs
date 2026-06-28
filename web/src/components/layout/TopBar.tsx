'use client'
import { useSearch } from '@/hooks/useSearch'
import styles from './TopBar.module.css'

interface Props {
  userLogin: string
}

export function TopBar({ userLogin }: Props) {
  const { setOpen } = useSearch()
  const initial = userLogin.charAt(0).toUpperCase()

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        <span className={styles.brandName}>Docs</span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.searchTrigger}
          onClick={() => setOpen(true)}
          aria-label="Search documentation"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>Search</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>

        <div className={styles.avatar} title={userLogin} aria-label={`Signed in as ${userLogin}`}>
          {initial}
        </div>
      </div>
    </header>
  )
}
