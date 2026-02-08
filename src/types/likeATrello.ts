import type { Basic } from './basic';

/**
 * Like a Trello request variants:
 * new: { id, order, column, name, files }
 * update: { { id, order, column }[] } или { id, name, files }
 * delete: { id }
 * fetch: {}
 */

type Column = 'todo' | 'doing' | 'done';
type Delete = Basic;
type Order = { id: string; order: number; column: Column };
type File = { name: string; type: string; lastModified: number; link: string };
type Move = { move: Array<Order> };
type Update = { id: string; name: string; files: Array<File> | File };

interface New extends Order {
  name: string;
  files: Array<File> | File;
}

export type LikeATrello = Delete | Move | Update | New;
