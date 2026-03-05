import type { Collection } from 'mongodb';
import type { Action, Delete } from '../types/generic';
import type { HelpDeskLegacyNew } from '../types/helpDeskLegacy';
import type { LikeATrelloNew } from '../types/likeATrello';

/**
 * Performs a generic action on the collection
 * @param col - The collection to perform the action on
 * @param action - The action to perform. Can be 'new' or 'delete'
 * @param document - The document to perform the action on
 * @return An object containing the status and data of the action
 */
const performGenericAction = async (
  col: Collection,
  action: Action,
  document: HelpDeskLegacyNew | LikeATrelloNew | Delete,
) => {
  switch (action) {
    case 'new': {
      await col.insertOne(document);
      return { status: 'Added', data: '' };
    }
    case 'delete': {
      await col.deleteOne({ id: document.id });
      return { status: 'Removed', data: '' };
    }
    default:
      throw Error(`Action ${action} is not found`);
  }
};

export { performGenericAction };
