import type { Basic } from './generic';

/**
 * Like a Trello request variants:
 * new: { id, order, column, name, files }
 * update: { { id, order, column }[] } или { id, name, files }
 * delete: { id }
 * fetch: {}
 */

type Column = 'todo' | 'doing' | 'done';
type Order = Basic & { order: number; column: Column };
type File = { name: string; type: string; lastModified: number; link: string };
type UpdateMove = { move: Array<Order> };
type UpdateContent = Basic & { name: string; files: Array<File> | File };
export type Update = UpdateMove | UpdateContent;

export interface New extends Order {
  name: string;
  files: Array<File> | File;
}
