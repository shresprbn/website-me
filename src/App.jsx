import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import PixelMaker from './pages/PixelMaker'
import BeatMaker from './pages/BeatMaker'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/pixel-maker" element={<PixelMaker />} />
        <Route path="/beat-maker" element={<BeatMaker />} />
      </Routes>
    </BrowserRouter>
  )
}
