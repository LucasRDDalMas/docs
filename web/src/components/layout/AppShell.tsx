'use client'
import { useState } from 'react'
import { TopBar } from './TopBar'
import { PanelStoreProvider, usePanelStore } from './PanelStore'
import styles from './AppShell.module.css'

interface Props {
  userLogin: string
  nav: React.ReactNode
  content: React.ReactNode
  panel: React.ReactNode
}

function Shell({ userLogin, nav, content, panel }: Props) {
  const { open } = usePanelStore()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className={`${styles.shell} ${open ? styles.panelOpen : ''} ${navOpen ? styles.navVisible : ''}`}>
      <TopBar userLogin={userLogin} onMenuToggle={() => setNavOpen((v) => !v)} />
      {navOpen && (
        <div className={styles.backdrop} onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}
      <aside className={styles.nav}>{nav}</aside>
      <main className={styles.content}>{content}</main>
      {open && <aside className={styles.panel}>{panel}</aside>}
    </div>
  )
}

export function AppShell(props: Props) {
  return (
    <PanelStoreProvider>
      <Shell {...props} />
    </PanelStoreProvider>
  )
}
