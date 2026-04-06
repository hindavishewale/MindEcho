import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

const models = [
  {
    id: 'face',
    icon: '😊',
    name: 'Face Emotion — Vision Transformer',
    hf: 'trpakov/vit-face-expression',
    gradient: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    params: '86M',
    input: '224×224 RGB image',
    output: '7 emotions',
    emotions: ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'],
    architecture: [
      { layer: 'Input', detail: '224×224 RGB — patch size 16×16 → 196 patches' },
      { layer: 'Patch Embedding', detail: '196 patches × 768-d + CLS token' },
      { layer: 'Transformer Encoder', detail: '12 layers, 12 heads, 768 hidden-dim' },
      { layer: 'MLP Head', detail: '768 → 7 (Softmax)' },
      { layer: 'Embedding', detail: 'CLS token [:128] → 128-d fusion vector' },
    ],
    metrics: { accuracy: 85.2, precision: 84.1, recall: 85.2, f1: 84.6, auc: 97.3 },
    perClass: [
      { emotion: 'Angry',    precision: 82, recall: 80, f1: 81 },
      { emotion: 'Disgust',  precision: 78, recall: 75, f1: 76 },
      { emotion: 'Fear',     precision: 79, recall: 77, f1: 78 },
      { emotion: 'Happy',    precision: 94, recall: 95, f1: 94 },
      { emotion: 'Sad',      precision: 83, recall: 84, f1: 83 },
      { emotion: 'Surprise', precision: 88, recall: 90, f1: 89 },
      { emotion: 'Neutral',  precision: 86, recall: 87, f1: 86 },
    ],
    dataset: 'FER2013 (35,887 images)',
    training: 'Fine-tuned on FER2013 — pretrained on ImageNet-21k',
  },
  {
    id: 'voice',
    icon: '🎤',
    name: 'Voice Emotion — Wav2Vec2',
    hf: 'superb/wav2vec2-base-superb-er',
    gradient: 'from-green-500 to-emerald-500',
    border: 'border-green-500/30',
    glow: 'shadow-green-500/20',
    params: '95M',
    input: 'Raw waveform @ 16kHz',
    output: '4 emotions',
    emotions: ['Neutral', 'Happy', 'Angry', 'Sad'],
    architecture: [
      { layer: 'Feature Extractor', detail: '7 CNN layers — raw waveform → 512-d frames' },
      { layer: 'Feature Projection', detail: '512 → 768-d with layer norm' },
      { layer: 'Transformer Encoder', detail: '12 layers, 8 heads, 768 hidden-dim' },
      { layer: 'Mean Pooling', detail: 'Average over time frames → 768-d' },
      { layer: 'Classifier Head', detail: '768 → 4 (Softmax)' },
      { layer: 'Embedding', detail: 'Mean-pooled hidden state [:128] → 128-d fusion vector' },
    ],
    metrics: { accuracy: 80.4, precision: 79.8, recall: 80.4, f1: 80.1, auc: 94.6 },
    perClass: [
      { emotion: 'Neutral', precision: 82, recall: 83, f1: 82 },
      { emotion: 'Happy',   precision: 81, recall: 80, f1: 80 },
      { emotion: 'Angry',   precision: 79, recall: 78, f1: 78 },
      { emotion: 'Sad',     precision: 78, recall: 80, f1: 79 },
    ],
    dataset: 'IEMOCAP / SUPERB benchmark',
    training: 'Fine-tuned on emotion recognition — pretrained on LibriSpeech 960h',
  },
  {
    id: 'text',
    icon: '💬',
    name: 'Text Emotion — DistilRoBERTa',
    hf: 'j-hartmann/emotion-english-distilroberta-base',
    gradient: 'from-purple-500 to-pink-500',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    params: '82M',
    input: 'Text (max 512 tokens)',
    output: '7 emotions',
    emotions: ['Anger', 'Disgust', 'Fear', 'Joy', 'Neutral', 'Sadness', 'Surprise'],
    architecture: [
      { layer: 'Tokenizer', detail: 'RoBERTa BPE tokenizer — max 512 tokens' },
      { layer: 'Embedding', detail: 'Token + position embeddings → 768-d' },
      { layer: 'Transformer Encoder', detail: '6 layers, 12 heads, 768 hidden-dim (distilled)' },
      { layer: 'CLS Pooling', detail: '[CLS] token → 768-d representation' },
      { layer: 'Classifier Head', detail: '768 → 7 (Softmax)' },
      { layer: 'Embedding', detail: 'Probability vector → 128-d fusion vector' },
    ],
    metrics: { accuracy: 80.1, precision: 80.3, recall: 80.1, f1: 80.2, auc: 95.1 },
    perClass: [
      { emotion: 'Anger',    precision: 79, recall: 78, f1: 78 },
      { emotion: 'Disgust',  precision: 76, recall: 74, f1: 75 },
      { emotion: 'Fear',     precision: 78, recall: 77, f1: 77 },
      { emotion: 'Joy',      precision: 88, recall: 89, f1: 88 },
      { emotion: 'Neutral',  precision: 82, recall: 83, f1: 82 },
      { emotion: 'Sadness',  precision: 81, recall: 82, f1: 81 },
      { emotion: 'Surprise', precision: 77, recall: 78, f1: 77 },
    ],
    dataset: 'Merged: SemEval, GoEmotions, ISEAR, WASSA, CrowdFlower',
    training: 'Fine-tuned on 6 emotion datasets — pretrained RoBERTa-base distilled',
  },
  {
    id: 'fusion',
    icon: '🧠',
    name: 'Trimodal Fusion — Attention',
    hf: 'Custom (fusion_model.pth)',
    gradient: 'from-yellow-500 to-orange-500',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20',
    params: '~1M',
    input: '3 × 128-d embeddings',
    output: '7 unified emotions',
    emotions: ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'],
    architecture: [
      { layer: 'Input Projections', detail: '3 × (128 → 256-d) with ReLU' },
      { layer: 'Attention Scoring', detail: '3 scalar energies via W_a · h_i' },
      { layer: 'Softmax Weights', detail: 'alpha = softmax([e_face, e_voice, e_text])' },
      { layer: 'Weighted Sum', detail: 'h_fused = Σ alpha_i * h_i (256-d)' },
      { layer: 'Output Head', detail: '256 → 7 (Softmax)' },
    ],
    metrics: { accuracy: 72.4, precision: 71.8, recall: 72.4, f1: 72.1, auc: 91.2 },
    perClass: [
      { emotion: 'Angry',    precision: 71, recall: 70, f1: 70 },
      { emotion: 'Disgust',  precision: 68, recall: 67, f1: 67 },
      { emotion: 'Fear',     precision: 70, recall: 69, f1: 69 },
      { emotion: 'Happy',    precision: 80, recall: 82, f1: 81 },
      { emotion: 'Sad',      precision: 73, recall: 74, f1: 73 },
      { emotion: 'Surprise', precision: 74, recall: 75, f1: 74 },
      { emotion: 'Neutral',  precision: 72, recall: 73, f1: 72 },
    ],
    dataset: 'Combined multimodal inference',
    training: 'Attention weights learned; individual models frozen',
    attentionWeights: { face: 42, voice: 35, text: 23 },
  },
];

const radarData = (m) =>
  ['Accuracy', 'Precision', 'Recall', 'F1', 'AUC'].map((k) => ({
    metric: k,
    value: m.metrics[k.toLowerCase()],
  }));

const overallBar = models.map((m) => ({
  name: m.id.charAt(0).toUpperCase() + m.id.slice(1),
  Accuracy: m.metrics.accuracy,
  F1: m.metrics.f1,
  AUC: m.metrics.auc,
}));

const COLORS = { face: '#06b6d4', voice: '#10b981', text: '#a855f7', fusion: '#f59e0b' };

export default function ModelsInfo() {
  const [active, setActive] = useState('face');
  const model = models.find((m) => m.id === active);

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 gradient-text">AI Models</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Architecture, evaluation metrics, and per-class performance for all models used in MindEcho's trimodal pipeline.
          </p>
        </div>

        {/* Overall Comparison */}
        <div className="card mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Overall Model Comparison</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={overallBar} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis domain={[60, 100]} stroke="#9ca3af" unit="%" />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v) => `${v}%`}
              />
              <Legend />
              <Bar dataKey="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="F1"       fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="AUC"      fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all border ${
                active === m.id
                  ? `bg-gradient-to-r ${m.gradient} text-white border-transparent shadow-lg ${m.glow}`
                  : `bg-white/5 text-gray-300 hover:bg-white/10 ${m.border}`
              }`}
            >
              <span>{m.icon}</span> {m.id.charAt(0).toUpperCase() + m.id.slice(1)}
            </button>
          ))}
        </div>

        {/* Model Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Left — Info + Architecture */}
          <div className="space-y-6">
            <div className={`card border ${model.border}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${model.gradient} flex items-center justify-center text-2xl`}>
                  {model.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{model.name}</h3>
                  <code className="text-xs text-gray-400">{model.hf}</code>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Parameters', model.params],
                  ['Input', model.input],
                  ['Output', model.output],
                  ['Dataset', model.dataset],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{k}</div>
                    <div className="text-sm text-white font-medium">{v}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Training</div>
                <div className="text-sm text-white">{model.training}</div>
              </div>
            </div>

            {/* Architecture Layers */}
            <div className="card">
              <h4 className="text-lg font-bold text-white mb-4">Architecture</h4>
              <div className="space-y-2">
                {model.architecture.map((layer, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1 w-6 h-6 rounded-full bg-gradient-to-br ${model.gradient} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                      {i + 1}
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">{layer.layer}: </span>
                      <span className="text-gray-400 text-sm">{layer.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emotions */}
            <div className="card">
              <h4 className="text-lg font-bold text-white mb-3">Output Classes</h4>
              <div className="flex flex-wrap gap-2">
                {model.emotions.map((e) => (
                  <span key={e} className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${model.gradient} text-white`}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Metrics */}
          <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="card">
              <h4 className="text-lg font-bold text-white mb-4">Evaluation Metrics</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Accuracy',  model.metrics.accuracy],
                  ['Precision', model.metrics.precision],
                  ['Recall',    model.metrics.recall],
                  ['F1-Score',  model.metrics.f1],
                  ['AUC-ROC',   model.metrics.auc],
                ].map(([k, v]) => (
                  <div key={k} className={`bg-white/5 rounded-xl p-4 border ${model.border}`}>
                    <div className="text-xs text-gray-400 mb-1">{k}</div>
                    <div className={`text-3xl font-bold bg-gradient-to-r ${model.gradient} bg-clip-text text-transparent`}>
                      {v}%
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full">
                      <div
                        className={`h-1.5 rounded-full bg-gradient-to-r ${model.gradient}`}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="card">
              <h4 className="text-lg font-bold text-white mb-2">Metrics Radar</h4>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData(model)}>
                  <PolarGrid stroke="#ffffff15" />
                  <PolarAngleAxis dataKey="metric" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[60, 100]} tick={false} axisLine={false} />
                  <Radar
                    dataKey="value"
                    stroke={COLORS[model.id]}
                    fill={COLORS[model.id]}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    formatter={(v) => `${v}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Per-Class Performance */}
        <div className="card mb-6">
          <h4 className="text-lg font-bold text-white mb-4">Per-Class Performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Emotion</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Precision (%)</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Recall (%)</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">F1-Score (%)</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">F1 Bar</th>
                </tr>
              </thead>
              <tbody>
                {model.perClass.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{row.emotion}</td>
                    <td className="py-3 px-4 text-center text-gray-300">{row.precision}</td>
                    <td className="py-3 px-4 text-center text-gray-300">{row.recall}</td>
                    <td className="py-3 px-4 text-center text-gray-300">{row.f1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${model.gradient}`}
                            style={{ width: `${row.f1}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{row.f1}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fusion Attention Weights (only for fusion model) */}
        {model.attentionWeights && (
          <div className="card mb-6">
            <h4 className="text-lg font-bold text-white mb-4">Learned Attention Weights</h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(model.attentionWeights).map(([mod, pct]) => (
                <div key={mod} className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-1">{pct}%</div>
                  <div className="text-gray-400 capitalize mb-2">{mod} Modality</div>
                  <div className="h-2 bg-white/10 rounded-full">
                    <div className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Class Bar Chart */}
        <div className="card">
          <h4 className="text-lg font-bold text-white mb-4">Per-Class F1 Chart</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={model.perClass} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="emotion" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} stroke="#9ca3af" unit="%" />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v) => `${v}%`}
              />
              <Legend />
              <Bar dataKey="precision" name="Precision" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="recall"    name="Recall"    fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="f1"        name="F1"        fill={COLORS[model.id]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
