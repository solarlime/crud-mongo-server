import type { Basic } from './basic';

/**
 * Help desk Legacy request variants:
 * new: { id, done, name, description, date }
 * update: { id, done } или { id, name, description }
 * delete: { id }
 * fetch: {}
 */

type Delete = Basic;
type UpdateHot = Basic & { done: boolean };
type UpdateFull = Basic & { name: string; description: string };
type Update = UpdateHot | UpdateFull;
type New = UpdateHot & UpdateFull & { date: string };

export type HelpDeskLegacy = Delete | Update | New;
