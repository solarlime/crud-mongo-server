import type { Collection, Db, MongoClient } from 'mongodb';
import { fetchHandler, performGenericAction } from './apps/generic';
import { performAction as performHelpDeskAction } from './apps/helpDesk/helpDesk';
import { performAction as performHelpDeskLegacyAction } from './apps/helpDesk/helpDeskLegacy';
import { performAction as performLikeATrelloAction } from './apps/likeATrello/likeATrello';
import type { Action, App, Delete } from './types/generic';
import type { HelpDeskMultipleUpdate } from './types/helpDesk';
import type {
  HelpDeskLegacyNew,
  HelpDeskLegacyUpdateFull,
  HelpDeskLegacyUpdateHot,
} from './types/helpDeskLegacy';
import type {
  LikeATrelloNew,
  LikeATrelloUpdateContent,
  LikeATrelloUpdateMove,
} from './types/likeATrello';

/**
 * A function which deals with MongoDB: creates documents, updates them,
 * deletes and fetches them all depending on a request url
 *
 * @param client
 * @param dbName - A database name
 * @param action - The action to perform on the collection
 * @param document - Depends on a project
 * @return A promise that resolves to an object representing the status and data of the CRUD operation
 */
export default async function performCrudOperation(
  client: MongoClient,
  dbName: App,
  action: Action,
  document:
    | HelpDeskMultipleUpdate
    | HelpDeskLegacyUpdateHot
    | HelpDeskLegacyUpdateFull
    | HelpDeskLegacyNew
    | Delete
    | LikeATrelloUpdateMove
    | LikeATrelloUpdateContent
    | LikeATrelloNew,
) {
  try {
    const db: Db = client.db(dbName);

    // Use the collection "items"
    const col: Collection = db.collection('items');

    switch (dbName) {
      case 'help-desk': {
        switch (action) {
          case 'fetch':
            return fetchHandler(col);
          case 'batch':
            return await performHelpDeskAction(col, action, document as HelpDeskMultipleUpdate);
          case 'new':
          case 'delete':
            return await performGenericAction(col, action, document as HelpDeskLegacyNew | Delete);
          case 'update':
            return await performHelpDeskLegacyAction(
              col,
              action,
              document as HelpDeskLegacyUpdateFull | HelpDeskLegacyUpdateHot,
            );
          default:
            throw Error(`Action ${action} is not found`);
        }
      }
      case 'like-a-trello': {
        switch (action) {
          case 'fetch':
            return fetchHandler(col);
          case 'new':
          case 'delete':
            return await performGenericAction(col, action, document as LikeATrelloNew | Delete);
          case 'update':
            return await performLikeATrelloAction(
              col,
              action,
              document as LikeATrelloUpdateContent | LikeATrelloUpdateMove,
            );
        }
      }
    }
  } catch (err) {
    console.error(err);
    return {
      status: 'Error',
      data: (err as Error).message,
    };
  }
}
