import type { Collection } from 'mongodb';
import type { Action } from '../../types/generic';
import type { MultipleUpdate as HelpDeskMultipleUpdate } from '../../types/helpDesk';

/**
 * Deals with Help-Desk's specific requests
 *
 * @param col - The collection to perform the CRUD operations on
 * @param action - The action to perform on the collection
 * @param document - The document to perform the action on
 * @return A promise that resolves to an object representing the status and data of the CRUD operation
 */
async function performAction(col: Collection, action: Action, document: HelpDeskMultipleUpdate) {
  switch (action) {
    case 'batch': {
      // MongoDB mutates document adding _id property
      const documentCopy = structuredClone(document);
      const bulk = Object.entries(document.operations).flatMap((operation) =>
        operation[1].map((item) => {
          switch (operation[0]) {
            case 'create': {
              return {
                insertOne: {
                  document: item,
                },
              };
            }
            case 'update': {
              if ('name' in item) {
                return {
                  updateOne: {
                    filter: { id: item.id },
                    update: {
                      $set: { name: item.name, description: item.description, done: item.done },
                    },
                  },
                };
              }
              throw Error(`No 'name' field in ${item}`);
            }
            case 'delete': {
              return {
                deleteOne: {
                  filter: { id: item.id },
                },
              };
            }
            default: {
              throw Error(`Unknown operation ${operation[0]}`);
            }
          }
        }),
      );
      await col.bulkWrite(bulk, { ordered: false });
      return { status: 'Batch applied', data: documentCopy };
    }
    default:
      throw Error(`Action ${action} is not found`);
  }
}

export { performAction };
