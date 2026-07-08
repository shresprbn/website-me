import { useState } from 'react'
import PixelSticker from './PixelSticker'
import { useWindowWidth } from '../hooks/useWindowWidth'
import tinkerer from '../assets/tinkerer_big.png'

const FACTS = [
  "As a kid I sang Bryan Adams' \"Summer of 69\" on loop — and recorded a deeply crappy version.",
  "The Velvet Underground and I have a complicated, ongoing relationship.",
  "I once spent a whole essay defending Icarus for flying too close to the sun.",
  "I collect old songs the way other people collect receipts.",
  "Most of my best sentences arrive at 2am and are gone by morning.",
  "I reread things I wrote years ago and barely recognize the author.",
]

export default function FunFact() {
  const [fact, setFact] = useState(FACTS[0])
  const isMobile = useWindowWidth() < 640

  const shuffle = () => {
    let next = fact
    let guard = 0
    while (next === fact && guard < 12) {
      next = FACTS[Math.floor(Math.random() * FACTS.length)]
      guard++
    }
    setFact(next)
  }

  return (
    <div style={{ background: '#ffd23f' }}>
      <div className="funfact-inner">
        <PixelSticker src={tinkerer} size={92} rotate="-7deg" floatDur="6.5s" delay="0.3s" style={{ bottom: -6, right: 150 }} hidden={isMobile} />
        <div style={{ maxWidth: 720, flex: 1, minWidth: 300 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: '.18em', color: '#7a5c00', marginBottom: 16 }}>FUN FACT</div>
          <p className="funfact-text">{fact}</p>
        </div>
        <button className="shuffle-btn" onClick={shuffle}>{isMobile ? '↻' : 'shuffle ↻'}</button>
      </div>
    </div>
  )
}
