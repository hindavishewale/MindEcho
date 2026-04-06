import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveInterview from './pages/LiveInterview';
import UploadVideo from './pages/UploadVideo';
import EmotionTimeline from './pages/EmotionTimeline';
import EmotionSearch from './pages/EmotionSearch';
import ModelsInfo from './pages/ModelsInfo';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live-interview" element={<LiveInterview />} />
            <Route path="/upload-video" element={<UploadVideo />} />
            <Route path="/emotion-timeline" element={<EmotionTimeline />} />
            <Route path="/emotion-search" element={<EmotionSearch />} />
            <Route path="/models" element={<ModelsInfo />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
