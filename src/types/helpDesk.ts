import type { Basic } from './basic';

/**
 * Help desk request variants:
 * batch: {
 *          operations: {
 *              create: [{ ... }, { ... }],
 *              update: [{ ... }, { ... }],
 *              delete: [{ ... }, { ... }]
 *          }
 *        }
 * fetch: {}
 */

type CreatedOrUpdatedRow = Basic & {
  name: string;
  description: string;
  date: string;
  done: boolean;
};
type DeletedRow = Basic;

type MultipleUpdate = {
  operations: {
    create: Array<CreatedOrUpdatedRow>;
    update: Array<CreatedOrUpdatedRow>;
    delete: Array<DeletedRow>;
  };
};

export type HelpDesk = MultipleUpdate;
