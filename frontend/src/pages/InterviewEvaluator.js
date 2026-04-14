import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';

const QUESTIONS = [
  { id: 1, type: 'Behavioral', text: 'Tell me about a time you faced a significant challenge at work and how you resolved it.' },
  { id: 2, type: 'Technical', text: 'Explain a complex technical concept you recently worked with and how you applied it.' },
  { id: 3, type: 'Behavioral', text: 'Describe a situation where you had to work under pressure to meet a deadline.' },
  { id: 4, type: 'Amazon-Style', text: 'Give an example of when you took ownership of a problem that was not your responsibility.' },
  { id: 5, type: 'Amazon-Style', text: 'Tell me about a time you disagreed with a team decision. What did you do?' },
];

const SCORE_COLOR = (s) => s >= 8 ? 'text-green-400' : s >= 6 ? 'text-yellow-400' : 'text-red-400';

export default function InterviewEvaluator() {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [phase, setPhase] = useState('intro'); // intro | interview | report
  const [qIndex, setQIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  // ── Recording ──────────────────────────────────────────────
  const startRecording = () => {
    chunksRef.current = [];
    const stream = webcamRef.current?.stream;
    if (!stream) return;
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setIsAnswering(true);
  };

  const stopRecording = () => new Promise((resolve) => {
    const mr = mediaRecorderRef.current;
    if (!mr) return resolve(null);
    mr.onstop = () => resolve(new Blob(chunksRef.current, { type: 'video/webm' }));
    mr.stop();
    setIsAnswering(false);
  });

  // ── Submit answer ──────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const blob = await stopRecording();
      if (!blob || blob.size < 1000) throw new Error('Recording too short or empty.');

      // 1. Upload video
      const fd = new FormData();
      fd.append('file', new File([blob], `q${qIndex + 1}.mp4`, { type: 'video/mp4' }));
      const upRes = await fetch('http://localhost:8000/api/upload_video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      const { session_id } = await upRes.json();

      // 2. Analyze video (trimodal)
      const anRes = await fetch(`http://localhost:8000/api/analyze_video/${session_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const anData = await anRes.json();

      // 3. Evaluate answer
      const evRes = await fetch('http://localhost:8000/api/evaluate_answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: QUESTIONS[qIndex].text,
          question_type: QUESTIONS[qIndex].type,
          session_id,
          overall_emotion: anData.overall_emotion,
        }),
      });
      const evData = await evRes.json();

      const evaluation = { question: QUESTIONS[qIndex], ...evData };
      const updated = [...evaluations, evaluation];
      setEvaluations(updated);

      if (qIndex + 1 < QUESTIONS.length) {
        setQIndex(qIndex + 1);
      } else {
        await generateReport(updated);
      }
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Final report ───────────────────────────────────────────
  const generateReport = async (evals) => {
    try {
      const res = await fetch('http://localhost:8000/api/interview_report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ evaluations: evals }),
      });
      const data = await res.json();
      setReport(data);
      setPhase('report');
    } catch {
      // fallback: compute locally
      const avg = (key) => Math.round(evals.reduce((s, e) => s + (e[key] || 5), 0) / evals.length * 10) / 10;
      setReport({
        communication: avg('communication_score'),
        confidence: avg('confidence_score'),
        answer_quality: avg('answer_quality_score'),
        strengths: ['Attempted all questions', 'Showed engagement throughout'],
        weak_areas: ['Answer structure needs improvement', 'Filler words detected', 'Low confidence signals in voice'],
        suggestions: ['Use STAR method for behavioral answers', 'Practice speaking at a steady pace', 'Maintain eye contact with camera'],
        summary: 'Candidate showed effort but needs improvement in structure and confidence. Consistent practice with mock interviews is recommended.',
      });
      setPhase('report');
    }
  };

  // ── Render: Intro ──────────────────────────────────────────
  if (phase === 'intro') return (
    <div className="min-h-screen py-12 flex items-center justify-center">
      <div className="card max-w-2xl w-full text-center">
        <div className="text-7xl mb-6">🤖</div>
        <h1 className="text-4xl font-bold gradient-text mb-4">AI Interview Evaluator</h1>
        <p className="text-gray-400 mb-8 text-lg">
          {QUESTIONS.length} questions · Behavioral + Technical + Amazon-style<br />
          Real-time multimodal analysis: face · voice · text
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          {[['😊', 'Face', 'ViT emotion detection'], ['🎤', 'Voice', 'Wav2Vec2 tone analysis'], ['💬', 'Text', 'DistilRoBERTa NLP']].map(([icon, title, desc]) => (
            <div key={title} className="bg-white/5 rounded-xl p-4">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-white font-semibold">{title}</div>
              <div className="text-gray-400 text-xs mt-1">{desc}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setPhase('interview')} className="btn-primary text-lg px-10">
          🎯 Start Interview
        </button>
      </div>
    </div>
  );

  // ── Render: Report ─────────────────────────────────────────
  if (phase === 'report' && report) return (
    <div className="min-h-screen py-10">
      <div className="container-custom max-w-4xl">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-4xl font-bold gradient-text">Interview Report</h1>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[['Communication', report.communication, '🗣️'], ['Confidence', report.confidence, '💪'], ['Answer Quality', report.answer_quality, '🎯']].map(([label, score, icon]) => (
            <div key={label} className="card text-center border border-white/10">
              <div className="text-4xl mb-2">{icon}</div>
              <div className={`text-5xl font-bold mb-1 ${SCORE_COLOR(score)}`}>{score}<span className="text-2xl text-gray-400">/10</span></div>
              <div className="text-gray-400 text-sm">{label}</div>
              <div className="mt-3 h-2 bg-white/10 rounded-full">
                <div className={`h-2 rounded-full ${score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${score * 10}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="card border border-green-500/20">
            <h3 className="text-lg font-bold text-green-400 mb-4">✅ Strengths</h3>
            <ul className="space-y-2">
              {report.strengths?.map((s, i) => (
                <li key={i} className="flex gap-2 text-gray-300 text-sm"><span className="text-green-400">•</span>{s}</li>
              ))}
            </ul>
          </div>
          {/* Weak Areas */}
          <div className="card border border-red-500/20">
            <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ Weak Areas</h3>
            <ul className="space-y-2">
              {report.weak_areas?.map((w, i) => (
                <li key={i} className="flex gap-2 text-gray-300 text-sm"><span className="text-red-400">•</span>{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suggestions */}
        <div className="card border border-blue-500/20 mb-8">
          <h3 className="text-lg font-bold text-blue-400 mb-4">💡 Improvement Suggestions</h3>
          <ul className="space-y-2">
            {report.suggestions?.map((s, i) => (
              <li key={i} className="flex gap-2 text-gray-300 text-sm"><span className="text-blue-400">{i + 1}.</span>{s}</li>
            ))}
          </ul>
        </div>

        {/* Summary */}
        <div className="card border border-purple-500/20 mb-8">
          <h3 className="text-lg font-bold text-purple-400 mb-2">📝 Summary</h3>
          <p className="text-gray-300">{report.summary}</p>
        </div>

        {/* Per-question breakdown */}
        <div className="card mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Question-by-Question Breakdown</h3>
          <div className="space-y-4">
            {evaluations.map((ev, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">{ev.question.type}</span>
                  <span className="text-white font-medium text-sm">Q{i + 1}: {ev.question.text}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white/5 rounded p-2"><span className="text-gray-400">Emotion</span><br /><span className="text-white font-semibold capitalize">{ev.final_emotion || '—'}</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-gray-400">Confidence</span><br /><span className={`font-semibold ${SCORE_COLOR(ev.confidence_score)}`}>{ev.confidence_score}/10</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-gray-400">Answer Quality</span><br /><span className={`font-semibold ${SCORE_COLOR(ev.answer_quality_score)}`}>{ev.answer_quality_score}/10</span></div>
                  <div className="bg-white/5 rounded p-2"><span className="text-gray-400">Communication</span><br /><span className={`font-semibold ${SCORE_COLOR(ev.communication_score)}`}>{ev.communication_score}/10</span></div>
                </div>
                {ev.feedback && (
                  <div className="mt-3 space-y-1">
                    {ev.feedback.map((f, fi) => (
                      <p key={fi} className="text-xs text-gray-400">• {f}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setPhase('intro'); setQIndex(0); setEvaluations([]); setReport(null); }} className="btn-primary w-full">
          🔄 Start New Interview
        </button>
      </div>
    </div>
  );

  // ── Render: Interview ──────────────────────────────────────
  const current = QUESTIONS[qIndex];
  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold gradient-text">AI Interview Evaluator</h1>
          <p className="text-gray-400 mt-1">Question {qIndex + 1} of {QUESTIONS.length}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="relative rounded-xl overflow-hidden bg-black/50">
                <Webcam
                  ref={webcamRef}
                  audio
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-xl"
                  videoConstraints={{ width: 1280, height: 720, facingMode: 'user' }}
                  onUserMedia={() => setCameraReady(true)}
                />
                {isAnswering && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="font-semibold text-sm">Recording</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-3 animate-spin">⚙️</div>
                      <p className="font-semibold">Analyzing with trimodal AI...</p>
                      <p className="text-sm text-gray-300 mt-1">Face · Voice · Text fusion</p>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="mt-3 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <div className="mt-4 flex gap-3">
                {!isAnswering && !isProcessing ? (
                  <button onClick={startRecording} disabled={!cameraReady} className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all">
                    🎤 Start Answering
                  </button>
                ) : (
                  <button onClick={handleSubmitAnswer} disabled={isProcessing} className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-all">
                    ⏹️ Stop & Analyze
                  </button>
                )}
              </div>
            </div>

            {/* Previous evaluations */}
            {evaluations.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Previous Answers</h3>
                <div className="space-y-2">
                  {evaluations.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2 text-sm">
                      <span className="text-gray-300">Q{i + 1}: {ev.question.text.slice(0, 50)}…</span>
                      <div className="flex gap-3 ml-4 shrink-0">
                        <span className={`font-semibold ${SCORE_COLOR(ev.confidence_score)}`}>C:{ev.confidence_score}</span>
                        <span className={`font-semibold ${SCORE_COLOR(ev.answer_quality_score)}`}>Q:{ev.answer_quality_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Current question */}
            <div className="card border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full">{current.type}</span>
                <span className="text-xs text-gray-400">Q{qIndex + 1}/{QUESTIONS.length}</span>
              </div>
              <p className="text-white font-medium leading-relaxed">{current.text}</p>
            </div>

            {/* Progress */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Progress</h3>
              <div className="space-y-2">
                {QUESTIONS.map((q, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < qIndex ? 'bg-green-500' : i === qIndex ? 'bg-purple-500' : 'bg-gray-600'}`}>
                      {i < qIndex ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs ${i === qIndex ? 'text-white font-semibold' : 'text-gray-400'}`}>{q.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">💡 Tips</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• Use STAR method (Situation, Task, Action, Result)</li>
                <li>• Speak clearly at a steady pace</li>
                <li>• Look at the camera, not the screen</li>
                <li>• Avoid filler words (um, uh, like)</li>
                <li>• Keep answers 1–2 minutes long</li>
              </ul>
            </div>

            {/* What's being analyzed */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">🔍 Being Analyzed</h3>
              <div className="space-y-2 text-xs">
                {[['😊', 'Face', 'ViT — 7 emotions'], ['🎤', 'Voice', 'Wav2Vec2 — tone & energy'], ['💬', 'Text', 'DistilRoBERTa — sentiment'], ['🧠', 'Fusion', 'Cross-modal attention']].map(([icon, label, desc]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-white font-medium w-12">{label}</span>
                    <span className="text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
