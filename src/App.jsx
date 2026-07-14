import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Playground from './pages/Playground'
import PixelMaker from './pages/PixelMaker'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/pixel-maker" element={<PixelMaker />} />
      </Routes>
    </BrowserRouter>
  )
}
