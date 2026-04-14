# Copyright (c) 2024 Hindavi Shewale
# MindEcho — Trimodal Emotion Fusion Model
# Original work: Cross-Modal Attention Fusion for Emotion Recognition
# All rights reserved.

import torch
import torch.nn as nn
import torch.nn.functional as F


class CrossModalAttention(nn.Module):
    """
    Each modality attends to the other two — learns which modality
    to trust more depending on the input context.
    Query: one modality (e.g. face)
    Context: the other two modalities (e.g. voice + text)
    """
    def __init__(self, dim, num_heads=4):
        super().__init__()
        self.attn  = nn.MultiheadAttention(dim, num_heads, dropout=0.1, batch_first=True)
        self.norm  = nn.LayerNorm(dim)
        self.ff    = nn.Sequential(
            nn.Linear(dim, dim * 2),
            nn.GELU(),
            nn.Linear(dim * 2, dim)
        )
        self.norm2 = nn.LayerNorm(dim)

    def forward(self, query, context):
        # context shape: (B, 2, dim) — the other two modalities
        out, _ = self.attn(query.unsqueeze(1), context, context)
        x = self.norm(query + out.squeeze(1))   # residual + norm
        x = self.norm2(x + self.ff(x))          # feed-forward + norm
        return x


class ModalityGate(nn.Module):
    """
    Learns to suppress unreliable modalities (e.g. noisy audio, dark face).
    Uses a sigmoid gate: output = norm(x * sigmoid(W2(relu(W1(x)))))
    """
    def __init__(self, dim):
        super().__init__()
        self.gate = nn.Sequential(
            nn.Linear(dim, dim),
            nn.ReLU(),
            nn.Linear(dim, dim),
            nn.Sigmoid()
        )
        self.norm = nn.LayerNorm(dim)

    def forward(self, x):
        return self.norm(x * self.gate(x))


class TemporalContextEncoder(nn.Module):
    """
    Encodes temporal context within a single modality embedding
    using a lightweight self-attention block.
    """
    def __init__(self, dim):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(dim, num_heads=2, dropout=0.1, batch_first=True)
        self.norm      = nn.LayerNorm(dim)

    def forward(self, x):
        # x: (B, dim) — treat as single token
        x_seq = x.unsqueeze(1)
        out, _ = self.self_attn(x_seq, x_seq, x_seq)
        return self.norm(x + out.squeeze(1))


class MultimodalEmotionFusion(nn.Module):
    """
    MindEcho Trimodal Fusion Model
    --------------------------------
    Input  : face(128-d) + voice(128-d) + text(128-d) embeddings
    Output : 7 unified emotion logits + per-modality attention weights

    Pipeline:
        1. Project each modality → 256-d
        2. Temporal context encoding (self-attention per modality)
        3. Modality gating (suppress weak/noisy modality)
        4. Cross-modal attention (each modality attends to other two)
        5. Learned softmax weights over 3 modalities
        6. Weighted sum → fused vector
        7. FC classifier → 7 emotions
    """
    def __init__(self, face_embedding_dim=128, voice_embedding_dim=128,
                 text_embedding_dim=128, fusion_dim=256, num_classes=7):
        super().__init__()

        # 1. Project each modality to fusion_dim
        self.face_proj  = nn.Sequential(nn.Linear(face_embedding_dim,  fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())
        self.voice_proj = nn.Sequential(nn.Linear(voice_embedding_dim, fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())
        self.text_proj  = nn.Sequential(nn.Linear(text_embedding_dim,  fusion_dim), nn.LayerNorm(fusion_dim), nn.GELU())

        # 2. Temporal context encoder per modality
        self.face_tce  = TemporalContextEncoder(fusion_dim)
        self.voice_tce = TemporalContextEncoder(fusion_dim)
        self.text_tce  = TemporalContextEncoder(fusion_dim)

        # 3. Gating — suppress weak modalities
        self.face_gate  = ModalityGate(fusion_dim)
        self.voice_gate = ModalityGate(fusion_dim)
        self.text_gate  = ModalityGate(fusion_dim)

        # 4. Cross-modal attention — each modality attends to the other two
        self.face_cross  = CrossModalAttention(fusion_dim)
        self.voice_cross = CrossModalAttention(fusion_dim)
        self.text_cross  = CrossModalAttention(fusion_dim)

        # 5. Learned attention weights over 3 modalities
        self.modality_attn = nn.Sequential(
            nn.Linear(fusion_dim * 3, 64),
            nn.ReLU(),
            nn.Linear(64, 3),
            nn.Softmax(dim=1)
        )

        # 6. Classifier head
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
        # Step 1: Project
        f = self.face_proj(face_emb)
        v = self.voice_proj(voice_emb)
        t = self.text_proj(text_emb)

        # Step 2: Temporal context encoding
        f = self.face_tce(f)
        v = self.voice_tce(v)
        t = self.text_tce(t)

        # Step 3: Gate
        f = self.face_gate(f)
        v = self.voice_gate(v)
        t = self.text_gate(t)

        # Step 4: Cross-modal attention
        f_out = self.face_cross(f,  torch.stack([v, t], dim=1))
        v_out = self.voice_cross(v, torch.stack([f, t], dim=1))
        t_out = self.text_cross(t,  torch.stack([f, v], dim=1))

        # Step 5: Weighted fusion
        concat  = torch.cat([f_out, v_out, t_out], dim=1)  # (B, dim*3)
        weights = self.modality_attn(concat)                 # (B, 3)
        fused   = (weights[:, 0:1] * f_out +
                   weights[:, 1:2] * v_out +
                   weights[:, 2:3] * t_out)                 # (B, dim)

        # Step 6: Classify from fused + cross-attended concat
        out = self.classifier(torch.cat([fused, v_out, t_out], dim=1))

        return out, weights.unsqueeze(1)  # (B, num_classes), (B, 1, 3)


UNIFIED_EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
