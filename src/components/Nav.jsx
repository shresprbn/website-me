import { Link, useLocation } from 'react-router-dom'

const PLAYGROUND_ROUTES = [
  '/playground',
  '/bounce-lab',
  '/pixel-maker',
  '/beat-maker',
  '/character-maker',
  '/reference-puller',
  '/face-study',
  '/fortune-teller',
]

export default function Nav() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isGallery = pathname === '/gallery' || pathname.startsWith('/gallery/')
  const isPlaygroundSection =
    !isGallery &&
    PLAYGROUND_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  const sectionHref = (hash) => (isHome ? hash : `/${hash}`)

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(10px)',
      background: 'rgba(247,245,240,.82)',
      borderBottom: '1px solid #e6e2d9',
    }}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          prabin<span style={{ color: '#ff6b9d' }}>.</span>
        </Link>
        <div className="nav-links">
          <a href={sectionHref('#writing')} className="nav-link">writing</a>
          <a href={sectionHref('#about')} className="nav-link teal">about</a>
          <Link
            to="/playground"
            className={`nav-link${isPlaygroundSection ? ' active' : ''}`}
            style={isPlaygroundSection ? { color: '#ff6b9d' } : undefined}
          >
            playground
          </Link>
          <Link
            to="/gallery"
            className={`nav-link${isGallery ? ' active' : ''}`}
            style={isGallery ? { color: '#ff6b9d' } : undefined}
          >
            gallery
          </Link>
          <a href={sectionHref('#contact')} className="nav-link yellow">say hi</a>
        </div>
      </div>
    </nav>
  )
}
