'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Worker hosted on unpkg; version-pinned to the installed pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Props {
  url: string
  downloadName?: string
}

export function PdfCarousel({ url, downloadName }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(720)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Track the container width so the rendered PDF fills it on any viewport.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 200) setWidth(Math.min(920, w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setPage(1)
  }, [])

  const prev = () => setPage((p) => Math.max(1, p - 1))
  const next = () => setPage((p) => Math.min(numPages || 1, p + 1))

  // Keyboard arrows for navigation once the component is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages])

  return (
    <div className="pdf-carousel" ref={containerRef}>
      <div className="pdf-canvas">
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          loading={<div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading PDF…</div>}
          error={
            <div style={{ padding: '2rem', color: 'var(--muted)' }}>
              Could not load the PDF.{' '}
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open directly
              </a>
              .
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={width}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>
      <div className="pdf-controls">
        <button onClick={prev} disabled={page <= 1} aria-label="Previous page">
          ← Previous
        </button>
        <span>
          Page {page} of {numPages || '…'}
        </span>
        <button onClick={next} disabled={numPages > 0 && page >= numPages} aria-label="Next page">
          Next →
        </button>
      </div>
      <a
        href={url}
        download={downloadName}
        target="_blank"
        rel="noopener noreferrer"
        className="pdf-download"
      >
        ↓ Download full PDF
      </a>
    </div>
  )
}
