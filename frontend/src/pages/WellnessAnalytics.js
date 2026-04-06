import React, { useState, useEffect } from 'react';
import { getWellnessTrends } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const WellnessAnalytics = () => {
  const [userId, setUserId] = useState('user123');
  const [days, setDays] = useState(7);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);

  const emotionColors = {
    happy: '#10B981',
    sad: '#3B82F6',
    angry: '#EF4444',
    fear: '#8B5CF6',
    surprise: '#F59E0B',
    disgust: '#6B7280',
    neutral: '#9CA3AF'
  };

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const result = await getWellnessTrends(userId, days);
      setTrends(result.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const wellnessData = trends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    score: (trend.wellness_score * 100).toFixed(1)
  }));

  const emotionDistribution = trends.length > 0
    ? Object.entries(trends[0].emotion_distribution || {}).map(([emotion, value]) => ({
        name: emotion,
        value: value
      }))
    : [];

  const avgWellness = trends.length > 0
    ? (trends.reduce((sum, t) => sum + t.wellness_score, 0) / trends.length * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Wellness Analytics</span>
          </h1>
          <p className="text-lg text-gray-400">
            Track your mental wellness trends and patterns
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Time Period</label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-all"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTrends}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? '🔄 Loading...' : '📊 Load Analytics'}
              </button>
            </div>
          </div>
        </div>

        {trends.length > 0 && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card text-center">
                <div className="text-5xl mb-3">💯</div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Average Wellness</h3>
                <p className="text-4xl font-bold gradient-text">{avgWellness}%</p>
              </div>
              <div className="card text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Dominant Emotion</h3>
                <p className={`text-3xl font-bold capitalize emotion-badge emotion-${trends[0]?.dominant_emotion || 'neutral'} inline-block`}>
                  {trends[0]?.dominant_emotion || 'N/A'}
                </p>
              </div>
              <div className="card text-center">
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Sessions Analyzed</h3>
                <p className="text-4xl font-bold text-purple-400">{trends.length}</p>
              </div>
            </div>

            {/* Wellness Trend Chart */}
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Wellness Score Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wellnessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" label={{ value: 'Wellness Score (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                  <Bar dataKey="score" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Emotion Distribution */}
            {emotionDistribution.length > 0 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6">Emotion Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emotionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emotionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={emotionColors[entry.name] || '#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '8px',
                        color: '#fff'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {!loading && trends.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-xl text-gray-400">No wellness data available.</p>
            <p className="text-sm text-gray-500 mt-2">Start analyzing videos to track your wellness trends.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WellnessAnalytics;
