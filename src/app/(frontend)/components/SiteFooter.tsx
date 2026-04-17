import { existsSync } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import Image from 'next/image'

const AUTHOR = {
  name: 'Debayan Mandal',
  website: 'https://rohan-debayan.github.io/Personal_Website_DM/',
  linkedin: 'https://www.linkedin.com/in/debayanforresearch',
  // Drop the circular logo file at site/public/images/debayan-logo.png
  // (PNG with transparent background works best). If the file isn't
  // present at server boot we just render without the logo.
  logoSrc: '/images/debayan-logo.png',
}

const LOGO_EXISTS = existsSync(
  path.resolve(process.cwd(), 'public', 'images', 'debayan-logo.png'),
)

function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
function IconGlobe() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <span className="footer-brand">GISS-SG</span>
          {' '}· Geographic Information Science & Systems Specialty Group
          {' '}· American Association of Geographers
          <br />
          <span style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()}
          </span>
        </div>
        <div className="footer-credit">
          {LOGO_EXISTS ? (
            <Image
              src={AUTHOR.logoSrc}
              alt={`${AUTHOR.name} logo`}
              width={48}
              height={48}
              className="footer-logo"
            />
          ) : null}
          <div className="footer-credit-text">
            <div>
              Designed by{' '}
              <a
                href={AUTHOR.website}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-author"
              >
                {AUTHOR.name}
              </a>
            </div>
            <div className="footer-credit-links">
              <a
                href={AUTHOR.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Personal website"
                title="Personal website"
              >
                <IconGlobe />
              </a>
              <a
                href={AUTHOR.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <IconLinkedIn />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
