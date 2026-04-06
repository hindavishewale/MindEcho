import React, { useState } from 'react';
import { uploadVideo, analyzeVideo } from '../services/api';

const UploadVideo = () => {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    try {
      const uploadResult = await uploadVideo(file);
      setSessionId(uploadResult.session_id);
      setStatus('uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
    }
  };

  const handleAnalyze = async () => {
    if (!sessionId) return;
    setStatus('analyzing');
    try {
      const analysisResult = await analyzeVideo(sessionId);
      setResult(analysisResult);
      setStatus('completed');
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-4xl">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-5xl font-bold mb-4">
            Upload Video for <span className="gradient-text">Analysis</span>
          </h1>
          <p className="text-xl text-gray-400">
            Upload your video and let our AI analyze emotions frame by frame
          </p>
        </div>

        <div className="card">
          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-600 hover:border-purple-500/50'
            }`}
          >
            <div className="text-6xl mb-6">🎥</div>
            <h3 className="text-2xl font-semibold text-white mb-3">
              {file ? file.name : 'Drop your video here'}
            </h3>
            <p className="text-gray-400 mb-6">
              {file
                ? `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
                : 'or click to browse (MP4, AVI supported)'}
            </p>
            <input
              type="file"
              accept="video/mp4,video/avi"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="btn-secondary cursor-pointer inline-block"
            >
              📁 Browse Files
            </label>
          </div>

          {/* Upload Button */}
          {file && status === 'idle' && (
            <button
              onClick={handleUpload}
              className="btn-primary w-full mt-6 text-lg"
            >
              ⬆️ Upload Video
            </button>
          )}

          {/* Upload Progress */}
          {status === 'uploading' && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-300 text-lg">Uploading video...</p>
            </div>
          )}

          {/* Analyze Button */}
          {sessionId && status === 'uploaded' && (
            <div className="mt-6">
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
                <p className="text-green-400 font-semibold">✓ Video uploaded successfully!</p>
              </div>
              <button
                onClick={handleAnalyze}
                className="btn-primary w-full text-lg"
              >
                🧠 Start AI Analysis
              </button>
            </div>
          )}

          {/* Analyzing */}
          {status === 'analyzing' && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-300 text-lg">Analyzing emotions...</p>
              <p className="text-gray-500 text-sm mt-2">This may take a few minutes</p>
            </div>
          )}

          {/* Results */}
          {status === 'completed' && result && (
            <div className="mt-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-white mb-4">✨ Analysis Complete!</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Session ID:</span>
                  <span className="text-white font-mono text-sm">{result.session_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Overall Emotion:</span>
                  <span className={`emotion-badge emotion-${result.overall_emotion}`}>
                    {result.overall_emotion}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Segments Analyzed:</span>
                  <span className="text-white font-semibold">{result.segments}</span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = `/emotion-timeline?session=${result.session_id}`}
                className="btn-primary w-full mt-6"
              >
                📊 View Emotion Timeline
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400">⚠️ An error occurred. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;
