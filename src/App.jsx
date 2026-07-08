import Nav from './components/Nav'
import LetterIntro from './components/LetterIntro'
import WritingGrid from './components/WritingGrid'
import About from './components/About'
import FunFact from './components/FunFact'
import Languages from './components/Languages'
import Inventory from './components/Inventory'
import Contact from './components/Contact'

export default function App() {
  return (
    <div style={{ fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif", color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div id="top" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <LetterIntro />
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <WritingGrid />
      </div>

      <About />
      <FunFact />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        <Languages />
        <Inventory />
      </div>

      <Contact />
    </div>
  )
}
