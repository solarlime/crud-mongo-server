import type { Collection } from 'mongodb';
import type { Action } from '../../types/generic';
import type { LikeATrelloUpdateContent, LikeATrelloUpdateMove } from '../../types/likeATrello';

/**
 * Deals with Like-a-Trello's specific requests
 *
 * @param col - The collection to perform the CRUD operations on
 * @param action - The action to perform on the collection
 * @param document - The document to perform the action on
 * @return A promise that resolves to an object representing the status and data of the CRUD operation
 */
async function performAction(
  col: Collection,
  action: Action,
  document: LikeATrelloUpdateContent | LikeATrelloUpdateMove,
) {
  switch (action) {
    case 'update': {
      if ('move' in document) {
        // Like-a-Trello order/column update
        await Promise.all(
          document.move.map(async (doc) =>
            col.updateOne({ id: doc.id }, { $set: { order: doc.order, column: doc.column } }),
          ),
        );
      } else {
        // Like-a-Trello content update
        await col.updateOne(
          { id: document.id },
          { $set: { name: document.name, files: document.files } },
        );
      }
      return { status: 'Updated', data: '' };
    }
    default:
      throw Error(`Action ${action} is not found`);
  }
}

export { performAction };
