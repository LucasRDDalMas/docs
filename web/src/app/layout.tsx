import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SearchStoreProvider } from '@/hooks/useSearch'
import { SearchModal } from '@/components/search/SearchModal'
import '@/styles/global.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = { title: 'Docs' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SearchStoreProvider>
          {children}
          <SearchModal />
        </SearchStoreProvider>
      </body>
    </html>
  )
}
