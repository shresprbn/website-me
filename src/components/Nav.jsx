export default function Nav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(10px)',
      background: 'rgba(247,245,240,.82)',
      borderBottom: '1px solid #e6e2d9',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px' }}>
        <a href="#top" style={{ textDecoration: 'none', color: '#141414', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>
          prabin<span style={{ color: '#ff6b9d' }}>.</span>
        </a>
        <div style={{ display: 'flex', gap: 30, fontSize: 14, fontWeight: 500 }}>
          <a href="#writing" className="nav-link">writing</a>
          <a href="#about"   className="nav-link teal">about</a>
          <a href="#contact" className="nav-link yellow">say hi</a>
        </div>
      </div>
    </nav>
  )
}
