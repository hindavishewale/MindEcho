import cv2
import numpy as np
import os
import subprocess
from typing import List, Tuple

class VideoProcessor:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def extract_frames(self, video_path: str, fps: int = 1) -> List[Tuple[np.ndarray, float]]:
        frames = []
        cap = cv2.VideoCapture(video_path)
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_interval = int(video_fps / fps)
        
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_interval == 0:
                timestamp = frame_count / video_fps
                frames.append((frame, timestamp))
            
            frame_count += 1
        
        cap.release()
        return frames
    
    def extract_faces(self, frame: np.ndarray) -> List[np.ndarray]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        face_images = []
        for (x, y, w, h) in faces:
            face = gray[y:y+h, x:x+w]
            face_resized = cv2.resize(face, (48, 48))
            face_images.append(face_resized)
        
        return face_images
    
    def extract_audio(self, video_path: str, output_path: str) -> str:
        audio_path = output_path.replace('.mp4', '.wav').replace('.avi', '.wav')
        
        command = [
            'ffmpeg', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le',
            '-ar', '22050', '-ac', '1',
            audio_path, '-y'
        ]
        
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return audio_path
    
    def segment_audio(self, audio_path: str, segment_duration: float = 3.0) -> List[Tuple[str, float]]:
        import librosa
        
        audio, sr = librosa.load(audio_path, sr=22050)
        segment_samples = int(segment_duration * sr)
        
        segments = []
        for i in range(0, len(audio), segment_samples):
            segment = audio[i:i+segment_samples]
            if len(segment) < segment_samples:
                segment = np.pad(segment, (0, segment_samples - len(segment)))
            
            segment_path = audio_path.replace('.wav', f'_segment_{i//segment_samples}.wav')
            import soundfile as sf
            sf.write(segment_path, segment, sr)
            
            timestamp = i / sr
            segments.append((segment_path, timestamp))
        
        return segments
