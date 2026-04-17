import Link from 'next/link'
import Image from 'next/image'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label="GISS-SG home">
          <Image
            src="/images/AAG_GISS_logo.png"
            alt="GISS-SG logo"
            width={48}
            height={48}
            priority
            className="brand-logo"
          />
          <span className="brand-text">
            <span className="brand-mark">GISS-SG</span>
            <small>Geographic Information Science &amp; Systems</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <div className="nav-row">
            <Link href="/">Home</Link>
            <Link href="/blog">News</Link>
            <div className="nav-dropdown">
              <Link href="/awards" className="nav-dropdown-toggle">
                Awards
              </Link>
              <div className="nav-dropdown-menu" role="menu">
                <Link href="/awards/student-honors" role="menuitem">
                  Student Honors Paper Competition
                </Link>
                <Link href="/awards/aangeenbrug" role="menuitem">
                  Aangeenbrug Award
                </Link>
                <Link href="/awards/tobler-lecture" role="menuitem">
                  Waldo Tobler Distinguished Lecture
                </Link>
              </div>
            </div>
            <Link href="/officers">Officers</Link>
            <Link href="/gallery">Gallery</Link>
            <a
              href="http://community.aag.org/AAG/Communities/ViewCommunities/GroupDetails/?CommunityKey=7d5b5ab9-8c7b-4b70-8c48-9510e3c9e4ad"
              target="_blank"
              rel="noopener noreferrer"
            >
              AAG Community ↗
            </a>
          </div>
          <div className="nav-row">
            <Link href="/reports">Reports</Link>
            <Link href="/newsletters">Newsletters</Link>
            <Link href="/pages/constitution">Constitution</Link>
            <Link href="/admin" className="nav-login">
              Officer Login
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
