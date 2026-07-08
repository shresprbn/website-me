import React, { useState } from 'react'
import { essays } from '../data/essays'

export default function EssayGrid() {
  return (
    <section id="writing" style={{ padding: '88px 0 16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 34,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 800,
          fontSize: 42,
          letterSpacing: '-0.025em',
        }}>
          Recent writing
        </h2>
        <a
          href="https://medium.com/@shresprbn"
          target="_blank"
          rel="noreferrer"
          style={{
            textDecoration: 'none',
            fontFamily: "'Space Mono', monospace",
            fontSize: 13,
            color: '#8a8a8a',
          }}
        >
          all on medium →
        </a>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}>
        {essays.map((essay) => (
          <EssayCard key={essay.id} essay={essay} />
        ))}
      </div>
    </section>
  )
}

function EssayCard({ essay }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={essay.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textDecoration: 'none',
        color: essay.color,
        background: essay.bg,
        border: essay.border || 'none',
        borderRadius: 8,
        padding: 30,
        transform: hovered ? 'translateY(-6px)' : 'none',
        boxShadow: hovered
          ? `0 16px 34px rgba(0,0,0,${essay.bg === '#fff' ? '.10' : '.14'})`
          : '0 0 0 transparent',
        transition: 'transform .2s ease, box-shadow .2s ease',
        display: 'block',
      }}
    >
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        letterSpacing: '.1em',
        color: essay.labelColor,
      }}>
        {essay.date} · {essay.tag}
      </div>
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: 24,
        lineHeight: 1.14,
        marginTop: 13,
      }}>
        {essay.title}
      </div>
      <div style={{
        fontSize: 14,
        lineHeight: 1.5,
        color: essay.excerptColor,
        marginTop: 11,
      }}>
        {essay.excerpt}
      </div>
    </a>
  )
}
