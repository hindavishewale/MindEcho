import torch
import torch.nn as nn
from transformers import BertModel, BertTokenizer

class TextEmotionBERT(nn.Module):
    def __init__(self, num_classes=28, embedding_dim=128):
        super(TextEmotionBERT, self).__init__()
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        self.dropout = nn.Dropout(0.3)
        self.fc1 = nn.Linear(768, embedding_dim)
        self.fc2 = nn.Linear(embedding_dim, num_classes)
        self.relu = nn.ReLU()
        
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        
        x = self.dropout(pooled_output)
        embedding = self.relu(self.fc1(x))
        x = self.dropout(embedding)
        x = self.fc2(x)
        
        return x, embedding

TEXT_EMOTION_LABELS = [
    'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring', 'confusion',
    'curiosity', 'desire', 'disappointment', 'disapproval', 'disgust', 'embarrassment',
    'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love', 'nervousness', 'optimism',
    'pride', 'realization', 'relief', 'remorse', 'sadness', 'surprise', 'neutral'
]
