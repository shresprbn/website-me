import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isPlayground = pathname === '/playground'
  const isPixelMaker = pathname === '/pixel-maker'
  const isBeatMaker = pathname === '/beat-maker'
  const isReferencePuller = pathname === '/reference-puller'
  const isCharacterMaker = pathname === '/character-maker'

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
            className={`nav-link${isPlayground ? ' active' : ''}`}
            style={isPlayground ? { color: '#ff6b9d' } : undefined}
          >
            playground
          </Link>
          <Link
            to="/pixel-maker"
            className={`nav-link${isPixelMaker ? ' active' : ''}`}
            style={isPixelMaker ? { color: '#4ecdc4' } : undefined}
          >
            pixel maker
          </Link>
          <Link
            to="/beat-maker"
            className={`nav-link${isBeatMaker ? ' active' : ''}`}
            style={isBeatMaker ? { color: '#ffb800' } : undefined}
          >
            beat maker
          </Link>
          <Link
            to="/reference-puller"
            className={`nav-link${isReferencePuller ? ' active' : ''}`}
            style={isReferencePuller ? { color: '#7c6cf0' } : undefined}
          >
            reference puller
          </Link>
          <Link
            to="/character-maker"
            className={`nav-link${isCharacterMaker ? ' active' : ''}`}
            style={isCharacterMaker ? { color: '#57b894' } : undefined}
          >
            character
          </Link>
          <a href={sectionHref('#contact')} className="nav-link yellow">say hi</a>
        </div>
      </div>
    </nav>
  )
}
