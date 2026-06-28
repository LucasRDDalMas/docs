'use client'
import { useState, useRef, useEffect } from 'react'
import { useSearch } from '@/hooks/useSearch'
import styles from './TopBar.module.css'

interface Props {
  userLogin: string
  onMenuToggle: () => void
}

export function TopBar({ userLogin, onMenuToggle }: Props) {
  const { setOpen } = useSearch()
  const initial = userLogin.charAt(0).toUpperCase()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Toggle navigation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
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

        <div className={styles.userMenu} ref={menuRef}>
          <button
            className={styles.avatar}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Signed in as ${userLogin}`}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            {initial}
          </button>
          {menuOpen && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownUser}>{userLogin}</div>
              <form method="POST" action="/api/auth/logout">
                <button type="submit" className={styles.dropdownItem} role="menuitem">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
