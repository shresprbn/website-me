import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import BounceLab from './pages/BounceLab'
import PixelMaker from './pages/PixelMaker'
import Gallery from './pages/Gallery'
import CreationDetail from './pages/CreationDetail'
import BeatMaker from './pages/BeatMaker'
import ReferencePuller from './pages/ReferencePuller'
import CharacterMaker from './pages/CharacterMaker'
import FaceStudy from './pages/FaceStudy'
import FortuneTeller from './pages/FortuneTeller'
import GiftMaker from './pages/GiftMaker'
import GiftView from './pages/GiftView'
import StickyNotes from './pages/StickyNotes'
import GarbageRun from './pages/GarbageRun'
import ScrollToTop from './components/ScrollToTop'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/bounce-lab" element={<BounceLab />} />
        <Route path="/pixel-maker" element={<PixelMaker />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:id" element={<CreationDetail />} />
        <Route path="/beat-maker" element={<BeatMaker />} />
        <Route path="/reference-puller" element={<ReferencePuller />} />
        <Route path="/character-maker" element={<CharacterMaker />} />
        <Route path="/face-study" element={<FaceStudy />} />
        <Route path="/fortune-teller" element={<FortuneTeller />} />
        <Route path="/gift-package" element={<GiftMaker />} />
        <Route path="/gift/:id" element={<GiftView />} />
        <Route path="/notes-wall" element={<StickyNotes />} />
        <Route path="/garbage-run" element={<GarbageRun />} />
      </Routes>
    </BrowserRouter>
  )
}
