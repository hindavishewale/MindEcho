# MindEcho: A Trimodal AI Framework for Emotion-Aware Interview Analysis

🚀 **Production-Ready AI System** for analyzing human emotions through trimodal inputs (face, voice, text) with a modern dark-theme UI.

![Status](https://img.shields.io/badge/Status-Ready-success)
![Models](https://img.shields.io/badge/HuggingFace-4%20Models-blue)
![UI](https://img.shields.io/badge/UI-React%20+%20Tailwind-purple)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)

**GitHub:** https://github.com/hindavishewale/MindEcho

---

## ✨ Features

### AI Capabilities
- 😊 **Face Emotion Detection** — Vision Transformer (ViT), 7 emotions, ~85% accuracy
- 🎤 **Voice Emotion Detection** — Wav2Vec2, 4 emotions, ~80% accuracy
- 💬 **Text Emotion Detection** — DistilRoBERTa, 7 emotions, ~80% accuracy
- 🔊 **Speech-to-Text** — OpenAI Whisper (word-level timestamps)
- 🧠 **Trimodal Fusion** — Cross-modal attention fusion, ~72% accuracy

### Application Pages
- 📹 **Live Interview** — Real-time webcam emotion tracking
- 📤 **Upload Video** — Analyze recorded interviews (MP4, AVI, WebM, max 150MB)
- 📊 **Emotion Timeline** — Interactive per-second emotion chart with confidence scores
- 🔍 **Emotion Search** — Find specific emotions within an analyzed video
- 🤖 **Models Info** — Architecture details and evaluation metrics for all 4 models

---

## 🚀 Quick Start

### Step 1 — Clone the repo
```bash
git clone https://github.com/hindavishewale/MindEcho.git
cd MindEcho
```

### Step 2 — Install dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Step 3 — Start all 3 services (3 terminals)

**Terminal 1 — MongoDB**
```bash
mongod --dbpath C:\data\db
```

**Terminal 2 — Backend**
```bash
cd backend
python main.py
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm start
```

**Open:** http://localhost:3000

---

## 📋 Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| MongoDB | 7.0+ |
| FFmpeg | Any (for audio extraction) |
| CUDA | Optional (GPU acceleration) |

> **Note:** All AI models are downloaded automatically from HuggingFace on first run. No training required.

---

## 🧠 AI Models

### 1. Face Emotion — Vision Transformer (ViT)
| Property | Detail |
|---|---|
| HuggingFace Model | `trpakov/vit-face-expression` |
| Architecture | ViT-Base/16 — 12 transformer layers, 12 attention heads |
| Parameters | 86M |
| Input | 224×224 RGB face image (196 patches of 16×16) |
| Output | 7 emotions: angry, disgust, fear, happy, sad, surprise, neutral |
| Accuracy | ~85% |
| Embedding | 128-d CLS token vector → sent to Fusion model |

### 2. Voice Emotion — Wav2Vec2
| Property | Detail |
|---|---|
| HuggingFace Model | `superb/wav2vec2-base-superb-er` |
| Architecture | 7-layer CNN extractor + 12 transformer layers |
| Parameters | 95M |
| Input | Raw audio waveform at 16kHz (1-second slices) |
| Output | 4 emotions: neutral, happy, angry, sad |
| Accuracy | ~80% |
| Embedding | 128-d mean-pooled hidden state → sent to Fusion model |

### 3. Text Emotion — DistilRoBERTa
| Property | Detail |
|---|---|
| HuggingFace Model | `j-hartmann/emotion-english-distilroberta-base` |
| Architecture | DistilRoBERTa — 6 transformer layers, 12 attention heads |
| Parameters | 82M |
| Input | Text transcribed by Whisper (per-second segments) |
| Output | 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise |
| Accuracy | ~80% |
| Embedding | 128-d probability vector → sent to Fusion model |

### 4. Trimodal Fusion — Cross-Modal Attention
| Property | Detail |
|---|---|
| Architecture | Custom PyTorch — projection + gating + cross-modal attention + MLP |
| Parameters | ~1M |
| Input | 3 × 128-d embeddings (face + voice + text) |
| Output | 7 unified emotions + attention weights (face%, voice%, text%) |
| Accuracy | ~72% |

**Fusion pipeline:**
```
face(128) + voice(128) + text(128)
    ↓
Project each → 256-d
    ↓
Modality Gating (suppress noisy/missing modality)
    ↓
Cross-Modal Attention:
  face  ← attends to [voice, text]
  voice ← attends to [face,  text]
  text  ← attends to [face,  voice]
    ↓
Learned weights: softmax([e_face, e_voice, e_text])
    ↓
Weighted sum → 256-d fused vector
    ↓
FC(768→512→256→7) → final emotion
```

---

## 📊 System Architecture

```
User (Browser)
    ↓
React Frontend (port 3000)
    ↓  HTTP/REST
FastAPI Backend (port 8000)
    ├── Face:  ViT (trpakov/vit-face-expression)
    ├── Voice: Wav2Vec2 (superb/wav2vec2-base-superb-er)
    ├── Text:  DistilRoBERTa (j-hartmann/emotion-english-distilroberta-base)
    ├── STT:   Whisper (openai/whisper-base)
    └── Fusion: MultimodalEmotionFusion (custom)
    ↓
MongoDB (port 27017)
```

---

## 🎓 How It Works

1. User uploads a video (MP4/AVI/WebM)
2. FFmpeg extracts audio track → WAV
3. Whisper transcribes full audio with word-level timestamps
4. OpenCV extracts frames at 1 FPS
5. For each second of video:
   - Haar Cascade detects face → ViT predicts face emotion + 128-d embedding
   - 1-second audio slice → Wav2Vec2 predicts voice emotion + 128-d embedding
   - Words spoken that second → DistilRoBERTa predicts text emotion + 128-d embedding
   - All 3 embeddings → Fusion model → final unified emotion + attention weights
6. Results saved to MongoDB
7. Emotion timeline displayed in React frontend

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, receive JWT token |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/upload_video` | Upload video file |
| POST | `/api/analyze_video/{session_id}` | Run trimodal analysis |
| GET | `/api/emotion_timeline/{session_id}` | Get per-second emotion timeline |
| POST | `/api/emotion_search` | Search by emotion within a session |
| POST | `/api/start_live_interview` | Start live webcam session |
| GET | `/api/health` | Health check |

---

## 📁 Project Structure

```
MindEcho/
├── backend/
│   ├── app/
│   │   ├── api/auth.py              # JWT authentication
│   │   ├── core/                    # Config, database, security
│   │   ├── models/schemas.py        # Pydantic schemas
│   │   └── services/
│   │       ├── emotion_analyzer.py  # All 3 models + fusion
│   │       └── video_processor.py   # Frame & audio extraction
│   ├── main.py                      # FastAPI app + all endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/Navbar.js
│   │   ├── context/AuthContext.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── LiveInterview.js
│   │   │   ├── UploadVideo.js
│   │   │   ├── EmotionTimeline.js
│   │   │   ├── EmotionSearch.js
│   │   │   └── ModelsInfo.js
│   │   └── services/api.js
│   └── package.json
├── models/
│   ├── face/face_model.py           # Custom CNN architecture (reference)
│   ├── voice/voice_model.py         # Custom LSTM architecture (reference)
│   ├── text/text_model.py           # Custom BERT architecture (reference)
│   ├── fusion/fusion_model.py       # Trimodal fusion (used in production)
│   └── fusion_model.pth             # Fusion model weights
├── .gitignore
├── README.md
└── RESEARCH_PAPER.md
```

---

## 🔧 Troubleshooting

### Backend won't start
- Make sure MongoDB is running: `mongod --dbpath C:\data\db`
- Check port 8000 is free: `netstat -ano | findstr :8000`
- Kill existing process: `taskkill /PID <pid> /F`

### Models downloading slowly
- First run downloads ~1.5GB of HuggingFace models
- They are cached at `C:\Users\<user>\.cache\huggingface\`
- Subsequent runs load from cache instantly

### Frontend errors
- Run `npm install` inside `frontend/` folder
- Make sure backend is running on port 8000

### Timeline shows no data
- Make sure video analysis completed (check backend terminal)
- Copy the exact Session ID from the Upload page

---

## 📈 Performance

| Model | Accuracy | Parameters |
|---|---|---|
| Face ViT | ~85% | 86M |
| Voice Wav2Vec2 | ~80% | 95M |
| Text DistilRoBERTa | ~80% | 82M |
| Fusion | ~72% | ~1M |
| Processing speed | ~3-5 min/min video (CPU) | — |

---

## 🚀 Future Enhancements

- [ ] GPU acceleration (CUDA) for real-time processing
- [ ] Export PDF reports
- [ ] Mobile app (iOS/Android)
- [ ] Multi-language speech support
- [ ] Cloud deployment (AWS / Render)

---

## 🎉 System Status

- Backend: FastAPI on port 8000
- Frontend: React on port 3000
- Database: MongoDB on port 27017
- Face Model: trpakov/vit-face-expression (HuggingFace)
- Voice Model: superb/wav2vec2-base-superb-er (HuggingFace)
- Text Model: j-hartmann/emotion-english-distilroberta-base (HuggingFace)
- STT: openai/whisper-base
- Fusion Model: Custom cross-modal attention

---

## 📄 Research Paper

See [RESEARCH_PAPER.md](RESEARCH_PAPER.md) for full technical details, model architectures, evaluation metrics, and references.

**GitHub:** https://github.com/hindavishewale/MindEcho
