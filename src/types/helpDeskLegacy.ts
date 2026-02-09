import type { Basic } from './generic';

/**
 * Help desk Legacy request variants:
 * new: { id, done, name, description, date }
 * update: { id, done } или { id, name, description }
 * delete: { id }
 * fetch: {}
 */

type UpdateHot = Basic & { done: boolean };
type UpdateFull = Basic & { name: string; description: string };
export type Update = UpdateHot | UpdateFull;

export type New = UpdateHot & UpdateFull & { date: string };
