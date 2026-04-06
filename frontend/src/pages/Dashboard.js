import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureClick = (path) => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate(path);
    }
  };

  const features = [
    {
      icon: '🎥',
      title: 'Live Interview',
      description: 'Real-time emotion analysis using your webcam with AI-powered insights',
      path: '/live-interview',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '📤',
      title: 'Upload Video',
      description: 'Analyze recorded videos for comprehensive emotion detection',
      path: '/upload-video',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: '📊',
      title: 'Emotion Timeline',
      description: 'Visualize emotion changes over time with interactive charts',
      path: '/emotion-timeline',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: '🔍',
      title: 'Emotion Search',
      description: 'Search and filter videos by specific emotions detected',
      path: '/emotion-search',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: '🤖',
      title: 'AI Interview System',
      description: 'Advanced AI-powered interview simulation and analysis',
      path: '/live-interview',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom">
        {/* Hero Section */}
        <div className="text-center mb-20 fade-in">
          <div className="inline-block mb-6">
            <div className="text-7xl float">🧠</div>
          </div>
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-text">MindEcho</span>
            <br />
            Trimodal AI Emotion Intelligence
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Advanced trimodal AI framework for emotion-aware interview analysis.
            Real-time face, voice, and text emotion detection powered by deep learning.
          </p>
          <div className="flex gap-4 justify-center">
            {!user ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary text-lg"
              >
                🔐 Login / Register to Start
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/live-interview')}
                  className="btn-primary text-lg"
                >
                  🎥 Start Live Interview
                </button>
                <button
                  onClick={() => navigate('/upload-video')}
                  className="btn-secondary text-lg"
                >
                  📤 Upload Video
                </button>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => handleFeatureClick(feature.path)}
              className="card cursor-pointer group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* System Capabilities */}
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">System Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-6xl mb-4">😊</div>
              <h4 className="text-xl font-semibold text-white mb-2">Face Emotion</h4>
              <p className="text-gray-400">CNN-based facial expression analysis with 60%+ accuracy</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h4 className="text-xl font-semibold text-white mb-2">Voice Emotion</h4>
              <p className="text-gray-400">LSTM-based voice tone analysis using MFCC features</p>
            </div>
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h4 className="text-xl font-semibold text-white mb-2">Text Emotion</h4>
              <p className="text-gray-400">BERT-based sentiment analysis from speech-to-text</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
          <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-bold text-center mb-6 text-white">
              {isLogin ? 'Login' : 'Register'}
            </h2>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth}>
              {!isLogin && (
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength="6"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 mb-4"
              >
                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
              </button>
            </form>

            <p className="text-center text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-blue-400 hover:underline"
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
