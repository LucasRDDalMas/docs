'use client'
import { createContext, useContext, useState, useCallback } from 'react'

interface PanelCtx {
  open: boolean
  openPanel: () => void
  closePanel: () => void
}

const Ctx = createContext<PanelCtx>({ open: false, openPanel: () => {}, closePanel: () => {} })

export function PanelStoreProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openPanel = useCallback(() => setOpen(true), [])
  const closePanel = useCallback(() => setOpen(false), [])
  return <Ctx.Provider value={{ open, openPanel, closePanel }}>{children}</Ctx.Provider>
}

export function usePanelStore() {
  return useContext(Ctx)
}
