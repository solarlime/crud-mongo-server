import type { Basic } from './generic';

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

export type MultipleUpdate = {
  operations: {
    create: Array<CreatedOrUpdatedRow>;
    update: Array<CreatedOrUpdatedRow>;
    delete: Array<DeletedRow>;
  };
};
