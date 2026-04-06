from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime
from typing import List, Dict
import shutil
import numpy as np

from app.core.config import settings
from app.core.database import connect_db, close_db, get_database
from app.services.video_processor import VideoProcessor
from app.services.emotion_analyzer import EmotionAnalyzer
from app.models.schemas import VideoAnalysis, UserSession, EmotionSegment
from app.api.auth import router as auth_router

app = FastAPI(title="MindEcho - Trimodal Emotion Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

video_processor = VideoProcessor()
emotion_analyzer = EmotionAnalyzer(settings.MODEL_PATH)

@app.on_event("startup")
async def startup_event():
    await connect_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()

@app.post("/api/upload_video")
async def upload_video(file: UploadFile = File(...)):
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > 150 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 150MB")
        
        session_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        video_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}{file_extension}")
        
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        db = get_database()
        session = UserSession(
            session_id=session_id,
            session_type="upload",
            status="processing"
        )
        await db.sessions.insert_one(session.model_dump(by_alias=True, exclude={'id'}))
        
        return {"session_id": session_id, "status": "uploaded", "message": "Video uploaded successfully"}
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze_video/{session_id}")
async def analyze_video(session_id: str):
    db = get_database()
    session = await db.sessions.find_one({"session_id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    video_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}.mp4")
    if not os.path.exists(video_path):
        video_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}.avi")
    if not os.path.exists(video_path):
        video_path = os.path.join(settings.UPLOAD_DIR, f"{session_id}.webm")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        print(f"\n=== Starting Trimodal Analysis ===")

        audio_path = video_path.replace('.mp4', '.wav').replace('.avi', '.wav').replace('.webm', '.wav')
        whisper_result = None

        try:
            video_processor.extract_audio(video_path, audio_path)
            print(f"Audio extracted: {audio_path}")
            if os.path.exists(audio_path):
                print("Transcribing audio with word timestamps...")
                whisper_result = emotion_analyzer.transcribe_audio(audio_path)
                print(f"Full transcription: {whisper_result.get('text', '')}")
        except Exception as audio_error:
            print(f"Audio processing failed: {audio_error}")
            audio_path = None

        frames = video_processor.extract_frames(video_path, fps=1)
        frame_interval = 1.0  # 1 frame per second, so each frame covers 1 second

        segments = []
        emotion_counts = {}

        for frame, timestamp in frames:
            faces = video_processor.extract_faces(frame)

            # Get only the words spoken in this 1-second window
            seg_start = timestamp
            seg_end   = timestamp + frame_interval
            seg_text  = ""
            if whisper_result:
                seg_text = emotion_analyzer.get_segment_transcription(whisper_result, seg_start, seg_end)

            segment_data = EmotionSegment(timestamp=timestamp, transcription=seg_text)

            if faces:
                # 1. FACE emotion
                face_result = emotion_analyzer.analyze_face(faces[0])
                if 'embedding' in face_result:
                    face_result['embedding'] = face_result['embedding'].tolist()
                segment_data.face_emotion = face_result

                # 2. VOICE emotion — analyse the 1-second audio slice
                voice_result = None
                if audio_path and os.path.exists(audio_path):
                    try:
                        import librosa, soundfile as sf, tempfile
                        audio, sr = librosa.load(audio_path, sr=22050,
                                                  offset=seg_start,
                                                  duration=frame_interval)
                        if len(audio) > 0:
                            tmp = audio_path.replace('.wav', f'_slice_{int(timestamp)}.wav')
                            sf.write(tmp, audio, sr)
                            voice_result = emotion_analyzer.analyze_voice(tmp)
                            os.remove(tmp)  # clean up slice
                            if 'embedding' in voice_result:
                                voice_result['embedding'] = voice_result['embedding'].tolist()
                            if 'probabilities' in voice_result:
                                voice_result['probabilities'] = {k: float(v) for k, v in voice_result['probabilities'].items()}
                            voice_result['confidence'] = float(voice_result['confidence'])
                            segment_data.voice_emotion = voice_result
                    except Exception as e:
                        print(f"Voice slice failed at {timestamp}s: {e}")

                # 3. TEXT emotion — only if there are words in this window
                text_result = None
                if seg_text:
                    try:
                        text_result = emotion_analyzer.analyze_text(seg_text)
                        if 'embedding' in text_result:
                            text_result['embedding'] = text_result['embedding'].tolist()
                        segment_data.text_emotion = text_result
                    except Exception as e:
                        print(f"Text analysis failed: {e}")
                        text_result = {'emotion': 'neutral', 'confidence': 0.5,
                                       'embedding': np.zeros(128).tolist()}

                # 4. TRIMODAL FUSION
                if face_result and voice_result and text_result:
                    try:
                        face_emb  = np.array(face_result['embedding'])
                        voice_emb = np.array(voice_result['embedding'])
                        text_emb  = np.array(text_result['embedding'])
                        fusion_result = emotion_analyzer.fuse_emotions(face_emb, voice_emb, text_emb)
                        segment_data.fused_emotion = fusion_result
                        emotion = fusion_result['emotion']
                        print(f"[{timestamp:.1f}s] Fusion={emotion} | Face={face_result['emotion']} | Voice={voice_result['emotion']} | Text={text_result['emotion']} | Words='{seg_text}'")
                    except Exception as e:
                        print(f"Fusion failed: {e}")
                        emotion = face_result['emotion']
                else:
                    emotion = face_result['emotion']
                    print(f"[{timestamp:.1f}s] Face={emotion} | Words='{seg_text}'")

                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

            segments.append(segment_data)
        
        overall_emotion = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else "neutral"
        
        # Debug: Print all detected emotions
        print(f"\n=== Emotion Distribution ===")
        for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"{emotion}: {count} frames ({count/len(segments)*100:.1f}%)")
        print(f"Overall: {overall_emotion}\n")
        
        analysis = VideoAnalysis(
            session_id=session_id,
            video_path=video_path,
            analysis_type="multimodal",
            segments=segments,
            overall_emotion={"emotion": overall_emotion, "distribution": emotion_counts}
        )
        
        await db.analyses.insert_one(analysis.model_dump(by_alias=True, exclude={'id'}))
        await db.sessions.update_one({"session_id": session_id}, {"$set": {"status": "completed"}})
        
        return {"session_id": session_id, "status": "completed", "overall_emotion": overall_emotion, "segments": len(segments)}
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/emotion_timeline/{session_id}")
async def get_emotion_timeline(session_id: str):
    db = get_database()
    analysis = await db.analyses.find_one({"session_id": session_id})
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    timeline = []
    for segment in analysis.get('segments', []):
        # Prioritize fused emotion, fallback to face emotion
        fused_emotion = segment.get('fused_emotion') or {}
        face_emotion = segment.get('face_emotion') or {}
        
        emotion = fused_emotion.get('emotion') or face_emotion.get('emotion', 'unknown')
        confidence = fused_emotion.get('confidence') or face_emotion.get('confidence', 0)
        
        timeline.append({
            'timestamp': segment.get('timestamp', 0),
            'emotion': emotion,
            'confidence': confidence,
            'transcription': segment.get('transcription', ''),
            'attention_weights': fused_emotion.get('attention_weights', {})
        })
    
    return {"session_id": session_id, "timeline": timeline}

@app.post("/api/emotion_search")
async def emotion_search(request: dict):
    emotion = request.get('emotion')
    session_id = request.get('session_id')
    db = get_database()

    if not emotion:
        raise HTTPException(status_code=400, detail="emotion is required")

    # If session_id provided, search only within that session
    query = {"session_id": session_id} if session_id else {}
    analyses = await db.analyses.find(query).to_list(length=100)

    results = []
    for analysis in analyses:
        for segment in analysis.get('segments', []):
            fused = segment.get('fused_emotion') or {}
            face  = segment.get('face_emotion')  or {}
            detected_emotion = fused.get('emotion') or face.get('emotion')
            confidence       = fused.get('confidence') or face.get('confidence', 0)
            if detected_emotion == emotion:
                results.append({
                    'session_id':   analysis['session_id'],
                    'timestamp':    segment.get('timestamp', 0),
                    'confidence':   confidence,
                    'transcription': segment.get('transcription', ''),
                    'face_emotion':  face.get('emotion', ''),
                    'voice_emotion': (segment.get('voice_emotion') or {}).get('emotion', ''),
                    'text_emotion':  (segment.get('text_emotion')  or {}).get('emotion', ''),
                })

    return {"emotion": emotion, "session_id": session_id, "results": results}

@app.post("/api/start_live_interview")
async def start_live_interview():
    session_id = str(uuid.uuid4())
    
    db = get_database()
    session = UserSession(
        session_id=session_id,
        session_type="live",
        status="active"
    )
    await db.sessions.insert_one(session.model_dump(by_alias=True, exclude={'id'}))
    
    return {"session_id": session_id, "status": "active", "message": "Live interview session started"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
