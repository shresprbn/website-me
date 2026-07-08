import PixelSticker from './PixelSticker'
import oops from '../assets/oops.png'

export default function About() {
  return (
    <section id="about" style={{ marginTop: 92, background: '#4ecdc4', color: '#0d2e2b' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 32px', position: 'relative' }}>
        <PixelSticker src={oops} size={104} rotate="5deg" floatDur="7s" style={{ top: -20, right: 0 }} />

        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.18em', opacity: .7, marginBottom: 28 }}>ABOUT ME</div>

        <div style={{ background: '#fff', color: '#3c382f', padding: '36px 40px', boxShadow: '0 6px 24px rgba(0,0,0,.13)', transform: 'rotate(-0.7deg)', maxWidth: 860 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.1em', color: '#8a8378', marginBottom: 16 }}>// about me — index card</div>
          <p style={{ margin: 0, fontSize: 20, lineHeight: 1.65 }}>
            Thoughtful software developer from Nepal who enjoys solving complex technical challenges, values financial planning, stays curious about new ideas, and balances practical decision-making with creativity, gaming, and continuous learning.
          </p>
        </div>
      </div>
    </section>
  )
}
