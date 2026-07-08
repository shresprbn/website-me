import PixelSticker from './PixelSticker'
import { useWindowWidth } from '../hooks/useWindowWidth'
import oops from '../assets/oops.png'

export default function About() {
  const isMobile = useWindowWidth() < 640

  return (
    <section id="about" style={{ marginTop: 92, background: '#4ecdc4', color: '#0d2e2b' }}>
      <div className="about-inner">
        <PixelSticker
          src={oops}
          size={isMobile ? 64 : 104}
          rotate="5deg"
          floatDur="7s"
          style={isMobile ? { top: 12, right: 12 } : { top: -20, right: 0 }}
        />

        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.18em', opacity: .7, marginBottom: 28 }}>ABOUT ME</div>

        <div className="about-card">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.1em', color: '#8a8378', marginBottom: 16 }}>// about me — index card</div>
          <p className="about-text">
            Thoughtful software developer from Nepal who enjoys solving complex technical challenges, values financial planning, stays curious about new ideas, and balances practical decision-making with creativity, gaming, and continuous learning.
          </p>
        </div>
      </div>
    </section>
  )
}
