import type { SVGProps } from 'react'

interface LinksShape {
  website?: string | null
  twitter?: string | null
  linkedin?: string | null
  googleScholar?: string | null
  orcid?: string | null
}

/**
 * Compact brand icons shown at the bottom of each officer card.
 * We only render an icon if the link is actually populated, so cards
 * don't show empty placeholders.
 *
 * SVG marks are small single-path versions sized 16x16 for a uniform
 * footprint. All links open in a new tab with rel=noopener.
 */
export function OfficerLinks({ links }: { links: LinksShape | null | undefined }) {
  if (!links) return null
  const entries: Array<{ label: string; href: string; icon: React.ReactNode }> = []

  const normalizeUrl = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  if (links.linkedin) {
    const url = normalizeUrl(links.linkedin)
    if (url) entries.push({ label: 'LinkedIn', href: url, icon: <LinkedInIcon /> })
  }
  if (links.twitter) {
    const url = normalizeUrl(links.twitter)
    if (url) entries.push({ label: 'X / Twitter', href: url, icon: <XIcon /> })
  }
  if (links.googleScholar) {
    const url = normalizeUrl(links.googleScholar)
    if (url)
      entries.push({ label: 'Google Scholar', href: url, icon: <ScholarIcon /> })
  }
  if (links.orcid) {
    const raw = (links.orcid || '').trim()
    // Accept bare IDs like 0000-0002-1809-7088 or full URLs.
    const url = /^https?:\/\//i.test(raw)
      ? raw
      : raw
      ? `https://orcid.org/${raw}`
      : null
    if (url) entries.push({ label: 'ORCID', href: url, icon: <OrcidIcon /> })
  }

  if (entries.length === 0) return null

  return (
    <div className="officer-links">
      {entries.map((e) => (
        <a
          key={e.label}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={e.label}
          title={e.label}
        >
          {e.icon}
        </a>
      ))}
    </div>
  )
}

/* ---------- Icons (16x16, currentColor) ---------- */

function svgBase(props: SVGProps<SVGSVGElement>) {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true,
    ...props,
  }
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svgBase(props)}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svgBase(props)}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zm-1.292 19.495h2.04L6.486 3.24H4.298L17.609 20.648z" />
    </svg>
  )
}

function ScholarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svgBase(props)}>
      <path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 100 14 7 7 0 000-14z" />
    </svg>
  )
}

function OrcidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svgBase(props)}>
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947 0 .525-.422.947-.947.947a.95.95 0 01-.947-.947c0-.516.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-2.016-1.284-3.722-4.097-3.722h-2.222z" />
    </svg>
  )
}
