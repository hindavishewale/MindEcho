import torch
import torch.nn as nn
import torch.nn.functional as F

class TemporalAttention(nn.Module):
    """Attention over time steps — focuses on emotionally rich frames."""
    def __init__(self, hidden_size):
        super().__init__()
        self.attn = nn.Linear(hidden_size * 2, 1)

    def forward(self, lstm_out):
        weights = torch.softmax(self.attn(lstm_out), dim=1)  # (B, T, 1)
        return (weights * lstm_out).sum(dim=1)               # (B, hidden*2)

class VoiceEmotionLSTM(nn.Module):
    def __init__(self, input_size=40, hidden_size=256, num_layers=2, num_classes=8):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers  = num_layers

        # CNN front-end to extract local patterns before LSTM
        self.cnn = nn.Sequential(
            nn.Conv1d(input_size, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64), nn.ReLU(),
            nn.Conv1d(64, input_size, kernel_size=3, padding=1),
            nn.BatchNorm1d(input_size), nn.ReLU(),
        )

        # Bidirectional LSTM — captures both past and future context
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers,
            batch_first=True, dropout=0.3, bidirectional=True
        )
        self.attention = TemporalAttention(hidden_size)

        self.fc1     = nn.Linear(hidden_size * 2, 128)
        self.dropout = nn.Dropout(0.4)
        self.fc2     = nn.Linear(128, num_classes)
        self.relu    = nn.ReLU()

    def forward(self, x):
        # x: (B, T, input_size)
        cnn_out = self.cnn(x.permute(0, 2, 1)).permute(0, 2, 1)  # CNN on feature dim
        lstm_out, _ = self.lstm(cnn_out)          # (B, T, hidden*2)
        attended    = self.attention(lstm_out)    # (B, hidden*2)
        embedding   = self.relu(self.fc1(attended))
        out         = self.fc2(self.dropout(embedding))
        return out, embedding

VOICE_EMOTION_LABELS = ['neutral', 'calm', 'happy', 'sad', 'angry', 'fearful', 'disgust', 'surprised']
