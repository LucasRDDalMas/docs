import type { Metadata } from 'next'
import { SearchModal } from '@/components/search/SearchModal'
import '@/styles/global.css'

export const metadata: Metadata = { title: 'Docs' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SearchModal />
      </body>
    </html>
  )
}
