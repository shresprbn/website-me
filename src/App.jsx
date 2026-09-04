import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import BounceLab from './pages/BounceLab'
import PixelMaker from './pages/PixelMaker'
import FontMaker from './pages/FontMaker'
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
import WordZap from './pages/WordZap'
import PomodoroLanding from './pages/PomodoroLanding'
import PomodoroTimer from './pages/PomodoroTimer'
import GameOfLife from './pages/GameOfLife'
import ReactionDiffusion from './pages/ReactionDiffusion'
import PowderToy from './pages/PowderToy'
import EuphoriaStory from './pages/EuphoriaStory'
import EuphoriaTerminal from './pages/EuphoriaTerminal'
import ScrollToTop from './components/ScrollToTop'
import { ModalProvider } from './components/ModalProvider'

export default function App() {
  return (
    <BrowserRouter>
      <ModalProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/bounce-lab" element={<BounceLab />} />
          <Route path="/pixel-maker" element={<PixelMaker />} />
          <Route path="/font-maker" element={<FontMaker />} />
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
          <Route path="/word-zap" element={<WordZap />} />
          <Route path="/pomodoro" element={<PomodoroLanding />} />
          <Route path="/pomodoro/:roomId" element={<PomodoroTimer />} />
          <Route path="/game-of-life" element={<GameOfLife />} />
          <Route path="/reaction-diffusion" element={<ReactionDiffusion />} />
          <Route path="/powder-toy" element={<PowderToy />} />
          <Route path="/euphoria" element={<EuphoriaStory />} />
          <Route path="/euphoria-terminal" element={<EuphoriaTerminal />} />
        </Routes>
      </ModalProvider>
    </BrowserRouter>
  )
}
