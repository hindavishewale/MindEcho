"""
EmotionAnalyzer — 100% HuggingFace pretrained models, zero training needed.

Models used:
  Face  : trpakov/vit-face-expression          (~85% accuracy, 7 emotions)
  Voice : superb/wav2vec2-base-superb-er                                    (~80% accuracy, 4 emotions)
  Text  : j-hartmann/emotion-english-distilroberta-base             (~80% accuracy, 7 emotions)
  STT   : openai/whisper-base
"""
import os, sys, torch, numpy as np, librosa, soundfile as sf, tempfile
from transformers import (
    pipeline,
    AutoFeatureExtractor, AutoModelForImageClassification,
    AutoModelForAudioClassification,
)
import whisper
from PIL import Image

sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from models.fusion.fusion_model import MultimodalEmotionFusion, UNIFIED_EMOTION_LABELS

# ── Unified label map ─────────────────────────────────────────────────────────
UNIFIED = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

FACE_TO_UNIFIED = {
    'angry': 'angry', 'disgust': 'disgust', 'fear': 'fear',
    'happy': 'happy', 'sad': 'sad', 'surprise': 'surprise', 'neutral': 'neutral',
    'contempt': 'disgust'
}
VOICE_TO_UNIFIED = {
    'angry': 'angry', 'ang': 'angry',
    'disgust': 'disgust',
    'fearful': 'fear', 'fear': 'fear',
    'happy': 'happy', 'hap': 'happy',
    'sad': 'sad',
    'surprised': 'surprise', 'surprise': 'surprise',
    'neutral': 'neutral', 'neu': 'neutral', 'calm': 'neutral'
}
TEXT_TO_UNIFIED = {
    'anger': 'angry', 'disgust': 'disgust', 'fear': 'fear',
    'joy': 'happy', 'sadness': 'sad', 'surprise': 'surprise', 'neutral': 'neutral'
}


class EmotionAnalyzer:
    def __init__(self, model_path: str = 'models'):
        self.device     = 0 if torch.cuda.is_available() else -1
        self.device_str = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Device: {self.device_str}")

        print("Loading Face model  (trpakov/vit-face-expression)...")
        self.face_extractor = AutoFeatureExtractor.from_pretrained('trpakov/vit-face-expression')
        self.face_model     = AutoModelForImageClassification.from_pretrained('trpakov/vit-face-expression')
        self.face_model.eval()

        print("Loading Voice model (superb/wav2vec2-base-superb-er)...")
        self.voice_processor = AutoFeatureExtractor.from_pretrained('superb/wav2vec2-base-superb-er')
        self.voice_model     = AutoModelForAudioClassification.from_pretrained('superb/wav2vec2-base-superb-er')
        self.voice_model.eval()

        print("Loading Text model  (j-hartmann/emotion-english-distilroberta-base)...")
        self.text_pipeline = pipeline(
            'text-classification',
            model='j-hartmann/emotion-english-distilroberta-base',
            top_k=None,
            device=self.device
        )

        print("Loading Whisper STT (base)...")
        self.whisper_model = whisper.load_model('base')

        # Fusion model (lightweight, uses embeddings from above)
        base = os.path.dirname(os.path.abspath(__file__))
        fusion_path = os.path.abspath(os.path.join(base, '..', '..', '..', model_path, 'fusion_model.pth'))
        self.fusion_model = self._load_fusion(fusion_path)

        print("[OK] All models loaded - no training needed!")

    # ── Fusion ────────────────────────────────────────────────────────────────
    def _load_fusion(self, path):
        model = MultimodalEmotionFusion(
            face_embedding_dim=128, voice_embedding_dim=128,
            text_embedding_dim=128, fusion_dim=256, num_classes=7
        )
        if os.path.exists(path):
            model.load_state_dict(torch.load(path, map_location='cpu'), strict=False)
            print("[OK] Fusion model loaded")
        else:
            print("[WARN] Fusion model not found - using attention fusion with random weights")
        model.eval()
        return model

    # ── Face ──────────────────────────────────────────────────────────────────
    def analyze_face(self, face_image: np.ndarray):
        """face_image: 48x48 grayscale numpy array (0-255)"""
        # Convert grayscale → RGB PIL for ViT
        img = Image.fromarray(face_image.astype(np.uint8)).convert('RGB').resize((224, 224))
        inputs = self.face_extractor(images=img, return_tensors='pt')

        with torch.inference_mode():
            logits = self.face_model(**inputs).logits
            probs  = torch.softmax(logits, dim=1)[0]

        id2label   = self.face_model.config.id2label
        prob_dict  = {id2label[i].lower(): float(probs[i]) for i in range(len(probs))}
        top_label  = max(prob_dict, key=prob_dict.get)
        confidence = prob_dict[top_label]
        unified    = FACE_TO_UNIFIED.get(top_label, 'neutral')

        # 128-dim embedding from last hidden state
        with torch.inference_mode():
            embedding = self.face_model.vit(**inputs).last_hidden_state[:, 0, :].squeeze()
            embedding = embedding[:128].cpu().numpy()

        return {
            'emotion': unified,
            'confidence': confidence,
            'embedding': embedding,
            'probabilities': {FACE_TO_UNIFIED.get(k, 'neutral'): v for k, v in prob_dict.items()}
        }

    # ── Voice ─────────────────────────────────────────────────────────────────
    def analyze_voice(self, audio_path: str):
        audio, sr = librosa.load(audio_path, sr=16000)  # wav2vec2 needs 16kHz

        inputs = self.voice_processor(audio, sampling_rate=16000, return_tensors='pt', padding=True)

        with torch.inference_mode():
            logits    = self.voice_model(**inputs).logits
            probs     = torch.softmax(logits, dim=1)[0]
            hidden    = self.voice_model.wav2vec2(**inputs).last_hidden_state.mean(dim=1).squeeze()
            embedding = hidden[:128].cpu().numpy()

        id2label   = self.voice_model.config.id2label
        prob_dict  = {id2label[i].lower(): float(probs[i]) for i in range(len(probs))}
        top_label  = max(prob_dict, key=prob_dict.get)
        confidence = prob_dict[top_label]
        unified    = VOICE_TO_UNIFIED.get(top_label, 'neutral')

        return {
            'emotion': unified,
            'confidence': confidence,
            'embedding': embedding,
            'probabilities': {VOICE_TO_UNIFIED.get(k, 'neutral'): v for k, v in prob_dict.items()}
        }

    # ── Text ──────────────────────────────────────────────────────────────────
    def analyze_text(self, text: str):
        if not text.strip():
            return {
                'emotion': 'neutral', 'confidence': 0.5,
                'embedding': np.zeros(128),
                'probabilities': {'neutral': 1.0}
            }

        results   = self.text_pipeline(text[:512])[0]
        prob_dict = {r['label'].lower(): r['score'] for r in results}
        top_label = max(prob_dict, key=prob_dict.get)
        unified   = TEXT_TO_UNIFIED.get(top_label, 'neutral')

        # Simple deterministic embedding from prob vector
        embedding = np.zeros(128)
        for i, (k, v) in enumerate(prob_dict.items()):
            embedding[i * 18: (i + 1) * 18] = v

        return {
            'emotion': unified,
            'confidence': prob_dict[top_label],
            'embedding': embedding,
            'probabilities': {TEXT_TO_UNIFIED.get(k, 'neutral'): v for k, v in prob_dict.items()}
        }

    # ── Whisper STT ───────────────────────────────────────────────────────────
    def transcribe_audio(self, audio_path: str):
        return self.whisper_model.transcribe(audio_path, word_timestamps=True)

    def get_segment_transcription(self, whisper_result: dict, start: float, end: float) -> str:
        words = []
        for seg in whisper_result.get('segments', []):
            for w in seg.get('words', []):
                if w.get('start', 0) < end and w.get('end', 0) > start:
                    words.append(w.get('word', '').strip())
        return ' '.join(words).strip()

    # ── Fusion ────────────────────────────────────────────────────────────────
    def fuse_emotions(self, face_emb: np.ndarray, voice_emb: np.ndarray, text_emb: np.ndarray):
        f = torch.tensor(face_emb[:128],  dtype=torch.float32).unsqueeze(0)
        v = torch.tensor(voice_emb[:128], dtype=torch.float32).unsqueeze(0)
        t = torch.tensor(text_emb[:128],  dtype=torch.float32).unsqueeze(0)

        with torch.inference_mode():
            out, attn = self.fusion_model(f, v, t)
            probs     = torch.softmax(out, dim=1)[0]
            predicted = probs.argmax().item()

        return {
            'emotion': UNIFIED_EMOTION_LABELS[predicted],
            'confidence': float(probs[predicted]),
            'attention_weights': {
                'face':  float(attn[0][0]),
                'voice': float(attn[0][1]),
                'text':  float(attn[0][2])
            },
            'probabilities': {label: float(probs[i]) for i, label in enumerate(UNIFIED_EMOTION_LABELS)}
        }
