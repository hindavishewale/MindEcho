import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEmotionTimeline } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const EMOTION_CONFIG = {
  happy:   { color: '#10B981', icon: '😊' },
  sad:     { color: '#3B82F6', icon: '😢' },
  angry:   { color: '#EF4444', icon: '😠' },
  fear:    { color: '#8B5CF6', icon: '😨' },
  surprise:{ color: '#F59E0B', icon: '😲' },
  disgust: { color: '#6B7280', icon: '🤢' },
  neutral: { color: '#9CA3AF', icon: '😐' },
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">⏱️ {label}s</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span style={{ color: p.color }}>●</span>
          <span className="text-white capitalize">{p.dataKey}:</span>
          <span style={{ color: p.color }} className="font-bold">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

const EmotionTimeline = () => {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(searchParams.get('session') || '');
  const [timeline, setTimeline]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeEmotions, setActiveEmotions] = useState(new Set(Object.keys(EMOTION_CONFIG)));

  const fetchTimeline = async (id) => {
    const sid = id ?? sessionId;
    if (!sid.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await getEmotionTimeline(sid.trim());
      setTimeline(result.timeline || []);
      if (!result.timeline?.length) setError('No timeline data found for this session.');
    } catch {
      setError('Failed to load timeline. Check the session ID.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load if session param in URL
  useEffect(() => {
    if (searchParams.get('session')) fetchTimeline(searchParams.get('session'));
  }, []);

  // Build chart data: one row per timestamp, columns = each emotion's confidence %
  // At each timestamp only the detected emotion gets its real confidence, others get 0
  const chartData = timeline.map(item => {
    const row = { time: Number(item.timestamp).toFixed(1) };
    Object.keys(EMOTION_CONFIG).forEach(e => { row[e] = 0; });
    if (item.emotion && EMOTION_CONFIG[item.emotion]) {
      row[item.emotion] = parseFloat((item.confidence * 100).toFixed(1));
    }
    return row;
  });

  // Which emotions actually appear in this session
  const presentEmotions = Object.keys(EMOTION_CONFIG).filter(e =>
    timeline.some(t => t.emotion === e)
  );

  // Dominant emotion
  const emotionCounts = timeline.reduce((acc, t) => {
    acc[t.emotion] = (acc[t.emotion] || 0) + 1; return acc;
  }, {});
  const dominant = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

  const toggleEmotion = (e) => {
    setActiveEmotions(prev => {
      const next = new Set(prev);
      next.has(e) ? next.delete(e) : next.add(e);
      return next;
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">

        {/* Header */}
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Emotion Timeline</span>
          </h1>
          <p className="text-lg text-gray-400">
            See how emotions change second-by-second throughout the video
          </p>
        </div>

        {/* Session Input */}
        <div className="card mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTimeline()}
              placeholder="Enter Session ID"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
            />
            <button
              onClick={() => fetchTimeline()}
              disabled={loading}
              className="btn-primary px-8"
            >
              {loading ? '🔄 Loading...' : '📊 Load Timeline'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">⚠️ {error}</p>}
        </div>

        {timeline.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card text-center py-4">
                <p className="text-3xl font-bold text-white">{timeline.length}</p>
                <p className="text-gray-400 text-sm mt-1">Total Segments</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-3xl font-bold text-white">{presentEmotions.length}</p>
                <p className="text-gray-400 text-sm mt-1">Emotions Detected</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-3xl font-bold" style={{ color: dominant ? EMOTION_CONFIG[dominant[0]]?.color : '#fff' }}>
                  {dominant ? `${EMOTION_CONFIG[dominant[0]]?.icon} ${dominant[0]}` : '—'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Dominant Emotion</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-3xl font-bold text-white">
                  {timeline.length > 0 ? `${Number(timeline[timeline.length - 1].timestamp).toFixed(0)}s` : '—'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Video Duration</p>
              </div>
            </div>

            {/* Emotion Toggle Filters */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-white mb-4">🎛️ Toggle Emotions on Chart</h2>
              <div className="flex flex-wrap gap-3">
                {presentEmotions.map(e => {
                  const cfg = EMOTION_CONFIG[e];
                  const isOn = activeEmotions.has(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggleEmotion(e)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                        isOn ? 'text-white scale-105' : 'opacity-40 text-gray-400'
                      }`}
                      style={{ borderColor: cfg.color, backgroundColor: isOn ? cfg.color + '33' : 'transparent' }}
                    >
                      <span>{cfg.icon}</span>
                      <span className="capitalize">{e}</span>
                      <span className="text-xs">({emotionCounts[e] || 0})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Multi-Emotion Chart */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">📈 Emotion Confidence Over Time</h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="time"
                    stroke="#6B7280"
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -10, fill: '#6B7280', fontSize: 12 }}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#6B7280"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: '#9CA3AF', paddingTop: '10px' }}
                    formatter={(value) => (
                      <span style={{ color: EMOTION_CONFIG[value]?.color, textTransform: 'capitalize' }}>
                        {EMOTION_CONFIG[value]?.icon} {value}
                      </span>
                    )}
                  />
                  {presentEmotions
                    .filter(e => activeEmotions.has(e))
                    .map(e => (
                      <Line
                        key={e}
                        type="monotone"
                        dataKey={e}
                        stroke={EMOTION_CONFIG[e].color}
                        strokeWidth={2.5}
                        dot={{ fill: EMOTION_CONFIG[e].color, r: 3 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Timeline List */}
            <div className="card">
              <h2 className="text-2xl font-bold text-white mb-6">🕐 Detailed Segment View</h2>
              <div className="space-y-3">
                {timeline.map((item, index) => {
                  const cfg = EMOTION_CONFIG[item.emotion] || { color: '#9CA3AF', icon: '❓' };
                  return (
                    <div
                      key={index}
                      className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:bg-white/10 transition-all"
                      style={{ borderLeftColor: cfg.color, borderLeftWidth: 4 }}
                    >
                      {/* Timestamp */}
                      <span className="text-white font-bold w-16 shrink-0">
                        ⏱️ {Number(item.timestamp).toFixed(1)}s
                      </span>

                      {/* Emotion badge */}
                      <span
                        className="px-3 py-1 rounded-full text-sm font-semibold capitalize"
                        style={{ backgroundColor: cfg.color + '33', color: cfg.color, border: `1px solid ${cfg.color}` }}
                      >
                        {cfg.icon} {item.emotion}
                      </span>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${(item.confidence * 100).toFixed(0)}%`, backgroundColor: cfg.color }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-12 text-right">
                          {(item.confidence * 100).toFixed(1)}%
                        </span>
                      </div>

                      {/* Attention weights */}
                      {item.attention_weights && Object.keys(item.attention_weights).length > 0 && (
                        <div className="flex gap-3 text-xs text-gray-400">
                          <span>😊 {(item.attention_weights.face * 100).toFixed(0)}%</span>
                          <span>🎤 {(item.attention_weights.voice * 100).toFixed(0)}%</span>
                          <span>💬 {(item.attention_weights.text * 100).toFixed(0)}%</span>
                        </div>
                      )}

                      {/* Transcription */}
                      {item.transcription && (
                        <p className="w-full text-gray-400 text-sm italic mt-1">
                          💬 "{item.transcription}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Empty state before search */}
        {!loading && timeline.length === 0 && !error && (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-xl text-gray-400">Enter a Session ID to load the emotion timeline.</p>
            <p className="text-sm text-gray-500 mt-2">You can find the Session ID on the Upload Video page after analysis.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmotionTimeline;
