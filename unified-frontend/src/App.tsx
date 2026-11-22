import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PhotoDetector from './pages/PhotoDetector';
import VideoDetector from './pages/VideoDetector';
import AudioDetector from './pages/AudioDetector';
import TextDetector from './pages/TextDetector';
import Results from './pages/Results';
import About from './pages/About';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/photo" element={<PhotoDetector />} />
        <Route path="/video" element={<VideoDetector />} />
        <Route path="/audio" element={<AudioDetector />} />
        <Route path="/text" element={<TextDetector />} />
        <Route path="/results/:type/:id" element={<Results />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;