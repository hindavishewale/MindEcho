import React, { useState } from 'react';
import { searchByEmotion } from '../services/api';

const EMOTIONS = [
  { name: 'happy',   icon: '😊', color: 'from-green-500 to-emerald-500',  border: 'border-green-500',  bg: 'bg-green-500/20'  },
  { name: 'sad',     icon: '😢', color: 'from-blue-500 to-cyan-500',      border: 'border-blue-500',   bg: 'bg-blue-500/20'   },
  { name: 'angry',   icon: '😠', color: 'from-red-500 to-pink-500',       border: 'border-red-500',    bg: 'bg-red-500/20'    },
  { name: 'fear',    icon: '😨', color: 'from-purple-500 to-indigo-500',  border: 'border-purple-500', bg: 'bg-purple-500/20' },
  { name: 'surprise',icon: '😲', color: 'from-yellow-500 to-orange-500',  border: 'border-yellow-500', bg: 'bg-yellow-500/20' },
  { name: 'disgust', icon: '🤢', color: 'from-gray-500 to-slate-500',     border: 'border-gray-500',   bg: 'bg-gray-500/20'   },
  { name: 'neutral', icon: '😐', color: 'from-gray-400 to-gray-600',      border: 'border-gray-400',   bg: 'bg-gray-400/20'   },
];

const EMOTION_ICONS = { happy:'😊', sad:'😢', angry:'😠', fear:'😨', surprise:'😲', disgust:'🤢', neutral:'😐' };

const EmotionSearch = () => {
  const [sessionId, setSessionId]           = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [results, setResults]               = useState([]);
  const [searched, setSearched]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const handleSearch = async () => {
    if (!sessionId.trim()) { setError('Please enter a Session ID first.'); return; }
    setError('');
    setLoading(true);
    setSearched(false);
    try {
      const data = await searchByEmotion(selectedEmotion, sessionId.trim());
      setResults(data.results);
      setSearched(true);
    } catch (e) {
      setError('Search failed. Check the session ID and make sure the video is analyzed.');
    } finally {
      setLoading(false);
    }
  };

  const selected = EMOTIONS.find(e => e.name === selectedEmotion);

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Emotion Search</span>
          </h1>
          <p className="text-lg text-gray-400">
            Search for a specific emotion within a single analyzed video
          </p>
        </div>

        {/* Session ID Input */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Enter Session ID</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={sessionId}
              onChange={e => { setSessionId(e.target.value); setError(''); }}
              placeholder="Paste your Session ID here (from Upload Video page)"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-2">⚠️ {error}</p>}
        </div>

        {/* Emotion Selector */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-white mb-5">🎭 Select Emotion to Search</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {EMOTIONS.map(emotion => (
              <button
                key={emotion.name}
                onClick={() => setSelectedEmotion(emotion.name)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedEmotion === emotion.name
                    ? `${emotion.border} ${emotion.bg} scale-105`
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="text-4xl mb-2">{emotion.icon}</div>
                <p className="text-xs font-semibold capitalize text-white">{emotion.name}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary w-full text-lg"
          >
            {loading ? '🔄 Searching...' : `🔍 Find "${selectedEmotion}" in this video`}
          </button>
        </div>

        {/* Results */}
        {searched && (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{selected?.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">
                  {results.length > 0
                    ? `${results.length} segment${results.length > 1 ? 's' : ''} with "${selectedEmotion}"`
                    : `No "${selectedEmotion}" found in this video`}
                </h2>
                <p className="text-gray-400 text-sm font-mono">{sessionId}</p>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border p-5 transition-all hover:bg-white/10 ${selected?.bg} ${selected?.border} border-opacity-40`}
                  >
                    {/* Timestamp + confidence */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <span className="text-white font-bold text-lg">
                        ⏱️ {Number(result.timestamp).toFixed(1)}s
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${selected?.color} text-white`}>
                        {selected?.icon} {selectedEmotion}
                      </span>
                      <span className="text-gray-300 text-sm">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </span>
                    </div>

                    {/* Per-modality breakdown */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: '😊 Face',  value: result.face_emotion  },
                        { label: '🎤 Voice', value: result.voice_emotion },
                        { label: '💬 Text',  value: result.text_emotion  },
                      ].map(m => (
                        <div key={m.label} className="bg-white/5 rounded-lg p-3 text-center">
                          <p className="text-gray-400 text-xs mb-1">{m.label}</p>
                          <p className="text-white font-semibold capitalize text-sm">
                            {m.value ? `${EMOTION_ICONS[m.value] || '❓'} ${m.value}` : '—'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Transcription */}
                    {result.transcription && (
                      <p className="text-gray-300 text-sm italic border-t border-white/10 pt-3">
                        💬 "{result.transcription}"
                      </p>
                    )}

                    {/* View in timeline */}
                    <button
                      onClick={() => window.location.href = `/emotion-timeline?session=${result.session_id}`}
                      className="btn-secondary w-full text-sm mt-4"
                    >
                      📊 View Full Timeline
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-6xl mb-4">{selected?.icon}</div>
                <p className="text-gray-400">
                  No segments with "{selectedEmotion}" were detected in this video.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Try a different emotion or make sure the video analysis completed successfully.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default EmotionSearch;
