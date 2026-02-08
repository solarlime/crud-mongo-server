import {
  createServer as createNodeHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
// 24.06.23: types for formidable are not fully compatible with formidable@v3.
// TypeScript throws an error about json & firstValues. Ignoring it.
// @ts-expect-error
import formidable, { json } from 'formidable';
// @ts-expect-error
import { firstValues } from 'formidable/src/helpers/firstValues.js';
import type { Collection, Db, Document, MongoClient } from 'mongodb';
import { type Actions, type Apps, applications, type Url } from './types/basic';
import type { HelpDesk } from './types/helpDesk';
import type { HelpDeskLegacy } from './types/helpDeskLegacy';
import type { LikeATrello } from './types/likeATrello';

const switcher = async (
  col: Collection,
  actions: Actions,
  document: HelpDesk | HelpDeskLegacy | LikeATrello,
) => {
  switch (actions) {
    case 'batch': {
      if ('operations' in document) {
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
      throw Error(`No 'operations' field in ${document}`);
    }
    case 'new': {
      await col.insertOne(document);
      return { status: 'Added', data: '' };
    }
    case 'update': {
      if ('done' in document) {
        // Help desk hot update
        await col.updateOne({ id: document.id }, { $set: { done: document.done } });
      } else if ('description' in document) {
        // Help desk full update
        await col.updateOne(
          { id: document.id },
          { $set: { name: document.name, description: document.description } },
        );
      } else if ('files' in document && !('order' in document)) {
        // Like-a-Trello full update
        await col.updateOne(
          { id: document.id },
          { $set: { name: document.name, files: document.files } },
        );
      } else if ('move' in document) {
        // Like-a-Trello order/column update
        await Promise.all(
          document.move.map(async (doc) =>
            col.updateOne({ id: doc.id }, { $set: { order: doc.order, column: doc.column } }),
          ),
        );
      }
      return { status: 'Updated', data: '' };
    }
    case 'delete': {
      if ('id' in document) {
        await col.deleteOne({ id: document.id });
        return { status: 'Removed', data: '' };
      }
      break;
    }
    case 'fetch': {
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
    }
    default: {
      throw Error('No action was requested');
    }
  }
};

/**
 * A function which deals with MongoDB: creates documents, updates them,
 * deletes and fetches them all depending on a request url
 * @param client
 * @param dbName - a database name
 * @param actions - see Actions
 * @param document - depends on a project
 */
const crud = async (
  client: MongoClient,
  dbName: Apps,
  actions: Actions,
  document: HelpDesk | LikeATrello,
) => {
  try {
    const db: Db = client.db(dbName);

    // Use the collection "items"
    const col: Collection = db.collection('items');

    return await switcher(col, actions, document);
  } catch (err) {
    console.error(err);
    return {
      status: 'Error',
      data: (err as Error).message,
    };
  }
};

export default function createServer(client: MongoClient) {
  return createNodeHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    console.log('Request to %s detected', req.url);
    const [, app, action] = (req.url as Url<Actions, Apps>).slice(1).split('/');

    // Setting Access-Control-Allow-Origin depending on an origin header
    if (
      req.headers.origin
      && applications
        .flatMap((item) => [
          `https://${item}-solarlime.vercel.app`,
          `https://${item}-legacy.solarlime.dev`,
          `https://${item}.solarlime.dev`,
        ])
        .find((item) => item === req.headers.origin)
    ) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    } else if (req.headers.origin?.includes('http://localhost:')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.writeHead(403);
      res.end('Forbidden to access this page');
      return;
    }

    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Content-Type');
    res.setHeader('Access-Control-Max-Age', 2592000);

    const method = req.method!.toLowerCase();

    if (method === 'options') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (['get', 'post', 'put', 'delete'].includes(method)) {
      const form = formidable({});
      form.use(json);
      form.parse(req, async (_err, fieldsMultiple) => {
        // formidable parses fields and groups them if they have the same name
        const fieldsSingle = firstValues(form, fieldsMultiple);
        const result = await crud(client, app as Apps, action as Actions, fieldsSingle);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.writeHead(200);
        res.end(JSON.stringify(result));
      });
    }
  });
}
