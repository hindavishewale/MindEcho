import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { startLiveInterview } from '../services/api';

const LiveInterview = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraReady(true);
    } catch (error) {
      alert('Camera permission denied. Please allow camera access.');
    }
  };

  const questions = [
    "Tell me about yourself and your background.",
    "What are your greatest strengths?",
    "Describe a challenging situation you faced and how you handled it.",
    "Where do you see yourself in 5 years?",
    "Why should we hire you for this position?"
  ];

  const emotionEmojis = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fear: '😨',
    surprise: '😲',
    disgust: '🤢',
    neutral: '😐'
  };

  const handleStartInterview = async () => {
    try {
      const result = await startLiveInterview();
      setSessionId(result.session_id);
      setIsRecording(true);
      setCurrentQuestion(0);
      setAnswers([]);
      setAnalysisResults(null);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview');
    }
  };

  const handleStartAnswer = () => {
    setIsAnswering(true);
    setRecordedChunks([]);
    
    if (webcamRef.current && webcamRef.current.stream) {
      // Try different codecs for better compatibility
      let options = { mimeType: 'video/webm;codecs=vp8,opus' };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
      
      const mediaRecorder = new MediaRecorder(webcamRef.current.stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      
      // Record in chunks every 100ms for better file integrity
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
    }
  };

  const handleStopAnswer = async () => {
    setIsAnswering(false);
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      
      setTimeout(async () => {
        // Create blob from webm
        const webmBlob = new Blob(recordedChunks, { type: 'video/webm' });
        
        // Convert to mp4 using File API (browser will handle it)
        const mp4File = new File([webmBlob], `question_${currentQuestion + 1}.mp4`, { type: 'video/mp4' });
        
        try {
          const formData = new FormData();
          formData.append('file', mp4File);
          
          const uploadResponse = await fetch('http://localhost:8000/api/upload_video', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });
          
          const uploadData = await uploadResponse.json();
          
          const analyzeResponse = await fetch(`http://localhost:8000/api/analyze_video/${uploadData.session_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          const analyzeData = await analyzeResponse.json();
          
          const newAnswer = {
            question: questions[currentQuestion],
            emotion: analyzeData.overall_emotion,
            questionNumber: currentQuestion + 1
          };
          
          const updatedAnswers = [...answers, newAnswer];
          setAnswers(updatedAnswers);
          
          if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
          } else {
            setIsRecording(false);
            calculateFinalResults(updatedAnswers);
          }
        } catch (error) {
          console.error('Error analyzing answer:', error);
          alert('Failed to analyze answer. Please try again.');
        }
      }, 1000);
    }
  };

  const calculateFinalResults = (finalAnswers) => {
    const emotionCounts = {};
    finalAnswers.forEach(answer => {
      const emotion = answer.emotion;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    setAnalysisResults({
      totalQuestions: questions.length,
      emotionDistribution: emotionCounts,
      answers: finalAnswers
    });
  };

  const handleStopInterview = () => {
    setIsRecording(false);
    setCurrentQuestion(0);
    setAnswers([]);
    setAnalysisResults(null);
  };

  if (analysisResults) {
    return (
      <div className="min-h-screen py-8">
        <div className="container-custom max-w-4xl">
          <div className="card">
            <h1 className="text-4xl font-bold mb-6 text-center gradient-text">
              Interview Complete! 🎉
            </h1>
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-500/20 p-4 rounded-lg">
                  <p className="text-gray-400">Questions Answered</p>
                  <p className="text-3xl font-bold">{analysisResults.totalQuestions}</p>
                </div>
                <div className="bg-blue-500/20 p-4 rounded-lg">
                  <p className="text-gray-400">Dominant Emotion</p>
                  <p className="text-3xl font-bold capitalize">
                    {Object.entries(analysisResults.emotionDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Question-by-Question Analysis</h2>
              <div className="space-y-4">
                {analysisResults.answers.map((answer, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-lg">
                    <p className="text-purple-400 font-semibold mb-2">Q{answer.questionNumber}: {answer.question}</p>
                    <p className="text-gray-300">
                      Detected Emotion: <span className={`emotion-badge emotion-${answer.emotion} ml-2`}>{answer.emotion}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Live Interview</span> Analysis
          </h1>
          <p className="text-lg text-gray-400">
            AI-powered interview with real-time emotion detection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="relative rounded-xl overflow-hidden bg-black/50">
                <Webcam
                  ref={webcamRef}
                  audio={true}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-xl"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                  }}
                  onUserMedia={() => setCameraReady(true)}
                  onUserMediaError={(error) => console.error('Camera error:', error)}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📷</div>
                      <p>Loading camera...</p>
                    </div>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="font-semibold">Recording</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-4">
                {!cameraReady ? (
                  <button
                    onClick={requestCameraPermission}
                    className="btn-primary flex-1 text-lg"
                  >
                    📷 Enable Camera & Microphone
                  </button>
                ) : !isRecording ? (
                  <button
                    onClick={handleStartInterview}
                    className="btn-primary flex-1 text-lg"
                  >
                    🎥 Start Interview
                  </button>
                ) : (
                  <>
                    {!isAnswering ? (
                      <button
                        onClick={handleStartAnswer}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-all"
                      >
                        🎤 Start Answering
                      </button>
                    ) : (
                      <button
                        onClick={handleStopAnswer}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all"
                      >
                        ⏹️ Stop Answer
                      </button>
                    )}
                    <button
                      onClick={handleStopInterview}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                    >
                      End Interview
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isRecording && (
              <div className="card">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">
                  Question {currentQuestion + 1} of {questions.length}
                </h3>
                <p className="text-xl text-white font-medium">
                  {questions[currentQuestion]}
                </p>
                {isAnswering && (
                  <div className="mt-4 flex items-center gap-2 text-red-400">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Recording your answer...</span>
                  </div>
                )}
              </div>
            )}

            {isRecording && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Progress</h3>
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                        idx < currentQuestion ? 'bg-green-500' :
                        idx === currentQuestion ? 'bg-purple-500' :
                        'bg-gray-600'
                      }`}>
                        {idx < currentQuestion ? '✓' : idx + 1}
                      </div>
                      <span className={`text-sm ${
                        idx === currentQuestion ? 'text-white font-semibold' : 'text-gray-400'
                      }`}>
                        Question {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card text-center">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Current Emotion</h3>
              <div className="text-7xl mb-4">
                {emotionEmojis[currentEmotion]}
              </div>
              <p className={`text-2xl font-bold capitalize emotion-badge emotion-${currentEmotion} inline-block`}>
                {currentEmotion}
              </p>
            </div>

            {sessionId && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Session Info</h3>
                <p className="text-sm text-gray-400 break-all">
                  <span className="font-semibold text-white">ID:</span> {sessionId}
                </p>
              </div>
            )}

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Instructions</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Ensure good lighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Position face in center</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Speak clearly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Answer each question fully</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">•</span>
                  <span>Be natural and confident</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveInterview;
