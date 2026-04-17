import React from 'react'
import './styles.css'
import { fraunces, inter } from './fonts'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'

export const metadata = {
  description:
    'Geographic Information Science & Systems Specialty Group of the American Association of Geographers.',
  title: 'GISS-SG: AAG Geographic Information Science & Systems Specialty Group',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
