'use client'

import dynamic from 'next/dynamic'

// Dynamically import the carousel with SSR disabled. pdf.js uses
// DOMMatrix / canvas APIs that don't exist on the server, so it can
// only run in the browser.
const PdfCarousel = dynamic(
  () => import('./PdfCarousel').then((m) => m.PdfCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="pdf-carousel" style={{ minHeight: 520 }}>
        <div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading PDF viewer…</div>
      </div>
    ),
  },
)

interface Props {
  url: string
  downloadName?: string
}

export function PdfCarouselLoader(props: Props) {
  return <PdfCarousel {...props} />
}
