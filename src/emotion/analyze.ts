// Local lexicon fallback. This is NOT an AI model. Replaceable: a future
// in-browser model can implement the same interface.
//
// Privacy: this module is pure text-in/tone-out. It never logs, transmits, or
// persists the input text. Callers must keep journal text off the network,
// out of console output, and out of URLs.
//
// UI copy rule: present results as a "suggestion" / "possible interpretation".
// Never as AI, never as a diagnosis.

import type { ToneKey } from '../config';

export interface EmotionResult {
  tones: { tone: ToneKey; score: number }[];
  method: 'lexicon';
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

export const ANALYSIS_NOTE = "A possible interpretation — change it if it doesn't feel right.";

// Curated word lists. Each entry is matched word-by-word (exact token match);
// multi-word phrases ("burned out") are matched on the normalized raw text.
const JOY = [
  'joy', 'joyful', 'happy', 'happiness', 'glad', 'delighted', 'excited', 'excitement',
  'love', 'loved', 'lovely', 'wonderful', 'amazing', 'great', 'awesome', 'fantastic',
  'fun', 'laugh', 'laughed', 'laughing', 'smile', 'smiled', 'grateful', 'thankful',
  'proud', 'celebrat', 'party', 'win', 'won', 'beautiful', 'sunny', 'bright',
];
const CALM = [
  'calm', 'peaceful', 'peace', 'relaxed', 'relax', 'restful', 'rest', 'quiet',
  'serene', 'gentle', 'soft', 'slow', 'unhurried', 'content', 'ease', 'easy',
  'balanced', 'grounded', 'mindful', 'breathe', 'breathing', 'nap', 'sleepy',
  'cozy', 'warm', 'steady', 'still', 'meditat',
];
const SADNESS = [
  'sad', 'sadness', 'cry', 'cried', 'crying', 'tears', 'lonely', 'alone',
  'miss', 'missed', 'missing', 'grief', 'grieving', 'loss', 'lost', 'empty',
  'down', 'blue', 'heavy', 'heartbreak', 'hurt', 'painful', 'sorrow', 'melancholy',
  'disappointed', 'hopeless', 'tired', 'weary', 'exhausted',
];
const ANXIETY = [
  'anxious', 'anxiety', 'worry', 'worried', 'worrying', 'nervous', 'stress',
  'stressed', 'stressful', 'panic', 'panicked', 'fear', 'afraid', 'scared',
  'overwhelm', 'overwhelmed', 'overwhelming', 'tense', 'restless', 'uneasy',
  'dread', 'doubt', 'uncertain', 'uncertainty', 'insomnia', 'racing',
];
const FRUSTRATION = [
  'frustrat', 'annoyed', 'annoying', 'irritat', 'angry', 'anger', 'mad',
  'furious', 'rage', 'upset', 'bothered', 'unfair', 'stuck', 'argued',
  'argument', 'fight', 'blamed', 'hate', 'hated', 'ugh', 'ridiculous',
  'waste', 'blocked', 'delay', 'late', 'broke', 'broken', 'fail', 'failed',
];

// Bigrams carry more weight because they are more specific than single tokens.
const BIGRAMS: Record<string, ScoredTone> = {
  'burned out': 'sadness',
  'burnt out': 'sadness',
  'good day': 'joy',
  'great day': 'joy',
  'bad day': 'sadness',
  'rough day': 'frustration',
  'long day': 'frustration',
  'stressed out': 'anxiety',
  'fed up': 'frustration',
  'pissed off': 'frustration',
  'calm down': 'calm',
  'deeply grateful': 'joy',
  'so proud': 'joy',
  'cheer up': 'joy',
  'fell apart': 'sadness',
  'could not sleep': "anxiety",
  "couldn't sleep": 'anxiety',
  'peace of mind': 'calm',
  'at ease': 'calm',
};

type ScoredTone = 'joy' | 'calm' | 'sadness' | 'anxiety' | 'frustration';
const SCORED_TONES: ScoredTone[] = ['joy', 'calm', 'sadness', 'anxiety', 'frustration'];

const WORDLISTS: Record<ScoredTone, string[]> = {
  joy: JOY,
  calm: CALM,
  sadness: SADNESS,
  anxiety: ANXIETY,
  frustration: FRUSTRATION,
};

const BIGRAM_WEIGHT = 3;
const WORD_WEIGHT = 1;

/** Normalize: lowercase, keep letters/apostrophes/spaces for phrase matching. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z' ]/g, ' ');
}

export function analyzeTone(text: string): EmotionResult {
  const normalized = normalize(text);
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const totalWords = Math.max(tokens.length, 1);

  const scores: Record<ScoredTone, number> = {
    joy: 0,
    calm: 0,
    sadness: 0,
    anxiety: 0,
    frustration: 0,
  };

  // Word matching: some entries are stems (e.g. "frustrat") — match token
  // prefixes so "frustrated"/"frustrating" count.
  for (const token of tokens) {
    for (const tone of SCORED_TONES) {
      for (const word of WORDLISTS[tone]) {
        if (token === word || (word.length > 4 && token.startsWith(word))) {
          scores[tone] += WORD_WEIGHT;
          break; // one count per token per tone
        }
      }
    }
  }

  // Phrase matching on the normalized string.
  for (const [phrase, tone] of Object.entries(BIGRAMS)) {
    if (normalized.includes(phrase)) {
      scores[tone] += BIGRAM_WEIGHT;
    }
  }

  const ranked = SCORED_TONES.map((tone) => ({
    tone: tone as ToneKey,
    score: Math.min(1, scores[tone] / totalWords),
  }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return {
      tones: [{ tone: 'mixed', score: 0.2 }],
      method: 'lexicon',
      confidence: 'low',
      note: ANALYSIS_NOTE,
    };
  }

  const top = ranked[0].score;
  const confidence: 'high' | 'medium' | 'low' =
    top >= 0.5 ? 'high' : top >= 0.25 ? 'medium' : 'low';

  return { tones: ranked, method: 'lexicon', confidence, note: ANALYSIS_NOTE };
}
