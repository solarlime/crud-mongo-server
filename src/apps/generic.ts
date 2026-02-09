import type { Collection, Document } from 'mongodb';
import type { Action, Delete } from '../types/generic';
import type { New as HelpDeskLegacyNew } from '../types/helpDeskLegacy';
import type { New as LikeATrelloNew } from '../types/likeATrello';

/**
 * Fetches all documents from the collection
 * @param col - The collection to fetch documents from
 * @return An object containing the status and data of the fetch operation
 */
const fetchHandler = async (col: Collection) => {
  const data: Array<Document> = await col.find().toArray();
  return {
    status: 'Fetched',
    // DB stores boolean values as strings. It is needed to get them back
    // Upd. 12.12.24: MongoDB now stores boolean values as boolean.
    // Fallback is left for backwards compatibility
    data: data.map((item) => {
      const { _id, ...rest } = item;
      return {
        ...rest,
        done: typeof item.done === 'boolean' ? item.done : item.done === 'true',
      };
    }),
  };
};

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

export { fetchHandler, performGenericAction };
