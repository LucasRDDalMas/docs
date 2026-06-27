import styles from './AppShell.module.css'

interface Props {
  nav: React.ReactNode
  content: React.ReactNode
  panel: React.ReactNode
}

export function AppShell({ nav, content, panel }: Props) {
  return (
    <div className={styles.shell}>
      <aside className={styles.nav}>{nav}</aside>
      <main className={styles.content}>{content}</main>
      <aside className={styles.panel}>{panel}</aside>
    </div>
  )
}
