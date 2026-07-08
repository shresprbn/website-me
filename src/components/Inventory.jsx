import boots     from '../assets/boots.jpg'
import backpack  from '../assets/backpack.jpg'
import zine      from '../assets/zine.jpg'
import tamagotchi from '../assets/tamagotchi.jpg'
import coffee    from '../assets/coffee.jpg'

const items = [
  { src: boots,      label: 'trusty boots',       alt: 'pixel art of a white boot' },
  { src: backpack,   label: 'everyday backpack',   alt: 'pixel art of a brown backpack' },
  { src: zine,       label: 'a half-finished book', alt: 'pixel art of a book' },
  { src: tamagotchi, label: 'a phone that won\'t shut up',  alt: 'pixel art of a phone' },
  { src: coffee,     label: 'cold coffee, always', alt: 'pixel art of a coffee mug' },
]

export default function Inventory() {
  return (
    <div style={{ padding: '8px 0 84px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: '-0.025em' }}>Stuff I carry</h2>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#8a8a8a' }}>// inventory</span>
      </div>
      <div className="inventory-grid">
        {items.map((item) => (
          <div key={item.label} className="inventory-item">
            <img
              src={item.src}
              alt={item.alt}
              className="inventory-img"
              style={{ width: '100%', aspectRatio: '1', display: 'block', imageRendering: 'pixelated', border: '1px solid #ece8df', boxShadow: '0 4px 14px rgba(0,0,0,.08)' }}
            />
            <div className="inventory-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
