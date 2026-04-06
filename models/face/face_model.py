import torch
import torch.nn as nn
import torch.nn.functional as F

class SEBlock(nn.Module):
    """Squeeze-and-Excitation block — boosts important channels."""
    def __init__(self, channels, reduction=16):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.ReLU(),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid()
        )
    def forward(self, x):
        return x * self.se(x).view(x.size(0), x.size(1), 1, 1)

class ResBlock(nn.Module):
    """Residual block with SE attention."""
    def __init__(self, channels):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(channels, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(),
            nn.Conv2d(channels, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )
        self.se = SEBlock(channels)
        self.relu = nn.ReLU()

    def forward(self, x):
        return self.relu(x + self.se(self.block(x)))

class FaceEmotionCNN(nn.Module):
    def __init__(self, num_classes=7):
        super().__init__()
        # Stage 1
        self.stage1 = nn.Sequential(
            nn.Conv2d(1, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64), nn.ReLU(),
            ResBlock(64),
            nn.MaxPool2d(2), nn.Dropout2d(0.25)
        )
        # Stage 2
        self.stage2 = nn.Sequential(
            nn.Conv2d(64, 128, 3, padding=1, bias=False),
            nn.BatchNorm2d(128), nn.ReLU(),
            ResBlock(128),
            nn.MaxPool2d(2), nn.Dropout2d(0.25)
        )
        # Stage 3
        self.stage3 = nn.Sequential(
            nn.Conv2d(128, 256, 3, padding=1, bias=False),
            nn.BatchNorm2d(256), nn.ReLU(),
            ResBlock(256),
            nn.MaxPool2d(2), nn.Dropout2d(0.25)
        )
        # Stage 4
        self.stage4 = nn.Sequential(
            nn.Conv2d(256, 512, 3, padding=1, bias=False),
            nn.BatchNorm2d(512), nn.ReLU(),
            ResBlock(512),
            nn.AdaptiveAvgPool2d(1)   # global avg pool → 512x1x1
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 256), nn.ReLU(), nn.Dropout(0.5),
            nn.Linear(256, 128), nn.ReLU(), nn.Dropout(0.3),
        )
        self.fc_out = nn.Linear(128, num_classes)

    def forward(self, x):
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.stage4(x)
        embedding = self.classifier(x)
        return self.fc_out(embedding), embedding

EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
