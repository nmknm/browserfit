import type { QuizDef } from '../data/quizzes';
import { readLocal, writeLocal } from './store';
import type { AnswerMap } from './quizEngine';

const KEY = 'bf-profile';

/** Answers that describe the visitor rather than one quiz, so a later quiz can start from them. */
export const SHARED_QIDS = ['devices', 'aiTolerance', 'syncPhone', 'passwordQ', 'openSource', 'maker', 'telemetryQ', 'price', 'stability', 'comfort', 'engine', 'blockVsCompat'];

type Profile = AnswerMap;

/** Remember the visitor's own answers to the shared questions. Presets and skipped answers are not remembered. */
export function saveProfile(answers: AnswerMap) {
  const next: Profile = { ...readLocal<Profile>(KEY, {}) };
  for (const id of SHARED_QIDS) {
    const a = answers[id];
    if (!a || a.preset || a.value == null || a.value === 'skip') continue;
    next[id] = { value: a.value, ...(a.must ? { must: true } : {}) };
  }
  writeLocal(KEY, next);
}

/** Earlier answers this quiz asks about, marked so the runner can show them and skip the question. */
export function profileAnswers(def: QuizDef): AnswerMap {
  const saved = readLocal<Profile>(KEY, {});
  const out: AnswerMap = {};
  for (const id of SHARED_QIDS) {
    if (!def.questions.includes(id) || def.preset?.[id] || !saved[id]) continue;
    out[id] = { ...saved[id], preset: true, earlier: true };
  }
  return out;
}
