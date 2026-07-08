import PixelSticker from './PixelSticker'
import spacema from '../assets/spacema_big.png'

export default function Contact() {
  return (
    <footer id="contact" style={{ background: '#141414', color: '#fff' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 32px 72px', position: 'relative' }}>
        <PixelSticker src={spacema} size={84} rotate="8deg" floatDur="7s" delay="0.9s" style={{ top: 64, right: 8 }} />

        <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1.04, letterSpacing: '-0.035em', maxWidth: 680 }}>
          Read something, or just say hello.
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32, flexWrap: 'wrap' }}>
          <a href="https://medium.com/@shresprbn" target="_blank" rel="noreferrer" className="btn-pill pink" style={{ fontSize: 15, padding: '15px 28px' }}>
            read me on Medium
          </a>
          <div style={{ display: 'flex', gap: 22 }}>
            <a href="https://github.com/shresprbn" target="_blank" rel="noreferrer" className="footer-link yellow">github</a>
            <a href="https://www.linkedin.com/in/prabin-shrestha-4537881ab/" target="_blank" rel="noreferrer" className="footer-link teal">linkedin</a>
            <a href="mailto:shresprbn@gmail.com" className="footer-link pink">email</a>
            <a href="https://www.instagram.com/axnusic/" target="_blank" rel="noreferrer" className="footer-link yellow">instagram</a>
          </div>
        </div>

        <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #2a2a2a', fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#777', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span>© 2026 Prabin Shrestha</span>
          <span>made between drafts</span>
        </div>
      </div>
    </footer>
  )
}
