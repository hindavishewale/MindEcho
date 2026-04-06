import torch
import torch.nn as nn
import torch.nn.functional as F

class CrossModalAttention(nn.Module):
    """
    Each modality attends to the other two — learns which modality
    to trust more depending on the input context.
    """
    def __init__(self, dim, num_heads=4):
        super().__init__()
        self.attn = nn.MultiheadAttention(dim, num_heads, dropout=0.1, batch_first=True)
        self.norm = nn.LayerNorm(dim)

    def forward(self, query, context):
        # context: (B, 2, dim) — the other two modalities
        out, _ = self.attn(query.unsqueeze(1), context, context)
        return self.norm(query + out.squeeze(1))  # residual


class ModalityGate(nn.Module):
    """
    Learns to suppress unreliable modalities (e.g. noisy audio, dark face).
    """
    def __init__(self, dim):
        super().__init__()
        self.gate = nn.Sequential(
            nn.Linear(dim, dim),
            nn.Sigmoid()
        )

    def forward(self, x):
        return x * self.gate(x)


class MultimodalEmotionFusion(nn.Module):
    def __init__(self, face_embedding_dim=128, voice_embedding_dim=128,
                 text_embedding_dim=128, fusion_dim=256, num_classes=7):
        super().__init__()

        # Project each modality to fusion_dim
        self.face_proj  = nn.Sequential(nn.Linear(face_embedding_dim,  fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())
        self.voice_proj = nn.Sequential(nn.Linear(voice_embedding_dim, fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())
        self.text_proj  = nn.Sequential(nn.Linear(text_embedding_dim,  fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())

        # Gating — suppress weak modalities
        self.face_gate  = ModalityGate(fusion_dim)
        self.voice_gate = ModalityGate(fusion_dim)
        self.text_gate  = ModalityGate(fusion_dim)

        # Cross-modal attention — each modality attends to the other two
        self.face_cross  = CrossModalAttention(fusion_dim)
        self.voice_cross = CrossModalAttention(fusion_dim)
        self.text_cross  = CrossModalAttention(fusion_dim)

        # Learned attention weights over 3 modalities
        self.modality_attn = nn.Sequential(
            nn.Linear(fusion_dim * 3, 3),
            nn.Softmax(dim=1)
        )

        # Classifier head
        self.classifier = nn.Sequential(
            nn.Linear(fusion_dim * 3, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )

    def forward(self, face_emb, voice_emb, text_emb):
        # Project
        f = self.face_proj(face_emb)
        v = self.voice_proj(voice_emb)
        t = self.text_proj(text_emb)

        # Gate
        f = self.face_gate(f)
        v = self.voice_gate(v)
        t = self.text_gate(t)

        # Cross-modal attention
        f = self.face_cross(f,  torch.stack([v, t], dim=1))
        v = self.voice_cross(v, torch.stack([f, t], dim=1))
        t = self.text_cross(t,  torch.stack([f, v], dim=1))

        # Weighted fusion
        concat = torch.cat([f, v, t], dim=1)                    # (B, dim*3)
        weights = self.modality_attn(concat)                     # (B, 3)
        fused = (weights[:, 0:1] * f +
                 weights[:, 1:2] * v +
                 weights[:, 2:3] * t)                            # (B, dim)

        # Classify from both fused + concat for richer representation
        out = self.classifier(torch.cat([fused, v, t], dim=1))  # (B, num_classes)

        # Return attention weights for visualization
        attn_weights = weights.unsqueeze(1)                      # (B, 1, 3)
        return out, attn_weights

UNIFIED_EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
