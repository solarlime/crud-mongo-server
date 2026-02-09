import type { Collection } from 'mongodb';
import type { Action } from '../../types/generic';
import type { Update as HelpDeskLegacyUpdate } from '../../types/helpDeskLegacy';

/**
 * Deals with Help-Desk's (legacy) specific requests
 *
 * @param col - The collection to perform the CRUD operations on
 * @param action - The action to perform on the collection
 * @param document - The document to perform the action on
 * @return A promise that resolves to an object representing the status and data of the CRUD operation
 */
async function performAction(col: Collection, action: Action, document: HelpDeskLegacyUpdate) {
  switch (action) {
    case 'update': {
      if ('done' in document) {
        // Help desk hot update
        await col.updateOne({ id: document.id }, { $set: { done: document.done } });
      } else {
        // Help desk full update
        await col.updateOne(
          { id: document.id },
          { $set: { name: document.name, description: document.description } },
        );
      }
      return { status: 'Updated', data: '' };
    }
    default:
      throw Error(`Action ${action} is not found`);
  }
}

export { performAction };
