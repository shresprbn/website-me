export default function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(10px)',
      background: 'rgba(247,245,240,.82)',
      borderBottom: '1px solid #e6e2d9',
    }}>
      <div className="nav-inner">
        <a href="#top" className="nav-logo">
          prabin<span style={{ color: '#ff6b9d' }}>.</span>
        </a>
        <div className="nav-links">
          <a href="#writing" className="nav-link">writing</a>
          <a href="#about"   className="nav-link teal">about</a>
          <a href="#contact" className="nav-link yellow">say hi</a>
        </div>
      </div>
    </nav>
  )
}
