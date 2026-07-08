import PixelSticker from './PixelSticker'
import dragooon  from '../assets/dragooon.png'
import postcard  from '../assets/postcard.png'

export default function LetterIntro() {
  return (
    <div style={{ padding: '80px 0 72px', position: 'relative' }}>
      <PixelSticker src={dragooon} size={72} rotate="-9deg" floatDur="6s" style={{ top: 60, right: 0 }} />
      <PixelSticker src={postcard} size={44} rotate="8deg"  floatDur="5s" delay="0.6s" style={{ bottom: 80, right: 60 }} />

      <div style={{ maxWidth: 640, background: '#faf8f3', border: '1px solid #e8e3d8', padding: '52px 56px 48px' }}>
        {/* letterhead */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 40 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>
            prabin<span style={{ color: '#ff6b9d' }}>.</span>
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#bbb' }}>Kathmandu, Jul 2026</span>
        </div>

        {/* body */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, lineHeight: 2, color: '#2e2a24' }}>
          <p style={{ margin: '0 0 22px' }}>Hi,</p>
          <p style={{ margin: '0 0 22px' }}>
            I'm Prabin. I'm a full-stack developer based in Kathmandu — React, Node, the whole
            stack. I've shipped products, written APIs, and once built a Pacman that started as a
            Data Structures assignment and quietly took on a life of its own.
          </p>
          <p style={{ margin: '0 0 22px' }}>
            By night I write about art, memory, and the songs I can't shake. My code compiles.
            My feelings don't. This is where I try to fix that.
          </p>
          <p style={{ margin: '0 0 44px' }}>There are essays below.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ color: '#888' }}>— Prabin</span>
            <a href="#writing" className="btn-pill dark" style={{ fontSize: 13, padding: '13px 26px' }}>read the essays</a>
          </div>
        </div>
      </div>
    </div>
  )
}
