import Nav from '../components/Nav'
import LetterIntro from '../components/LetterIntro'
import WritingGrid from '../components/WritingGrid'
import About from '../components/About'
import FunFact from '../components/FunFact'
import Languages from '../components/Languages'
import Inventory from '../components/Inventory'
import Contact from '../components/Contact'

export default function Home() {
  return (
    <div style={{ fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif", color: '#141414', background: '#f7f5f0', minHeight: '100vh' }}>
      <Nav />

      <div id="top" className="container">
        <LetterIntro />
      </div>

      <div className="container">
        <WritingGrid />
      </div>

      <About />
      <FunFact />

      <div className="container">
        <Languages />
        <Inventory />
      </div>

      <Contact />
    </div>
  )
}
