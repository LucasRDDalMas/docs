'use client'
import { createContext, useContext, useState, useCallback } from 'react'

export type PanelTab = 'comments' | 'suggestions'

interface PanelCtx {
  open: boolean
  tab: PanelTab
  openPanel: (tab?: PanelTab) => void
  closePanel: () => void
  setTab: (tab: PanelTab) => void
}

const Ctx = createContext<PanelCtx>({
  open: false,
  tab: 'comments',
  openPanel: () => {},
  closePanel: () => {},
  setTab: () => {},
})

export function PanelStoreProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [tab, setTabState] = useState<PanelTab>('comments')

  const openPanel = useCallback((t?: PanelTab) => {
    if (t) setTabState(t)
    setOpen(true)
  }, [])

  const closePanel = useCallback(() => setOpen(false), [])
  const setTab = useCallback((t: PanelTab) => setTabState(t), [])

  return (
    <Ctx.Provider value={{ open, tab, openPanel, closePanel, setTab }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePanelStore() {
  return useContext(Ctx)
}
