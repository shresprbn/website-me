import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import PixelMaker from './pages/PixelMaker'
import BeatMaker from './pages/BeatMaker'
import ReferencePuller from './pages/ReferencePuller'
import CharacterMaker from './pages/CharacterMaker'
import ScrollToTop from './components/ScrollToTop'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/pixel-maker" element={<PixelMaker />} />
        <Route path="/beat-maker" element={<BeatMaker />} />
        <Route path="/reference-puller" element={<ReferencePuller />} />
        <Route path="/character-maker" element={<CharacterMaker />} />
      </Routes>
    </BrowserRouter>
  )
}
