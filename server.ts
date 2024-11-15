import { createServer, IncomingMessage, ServerResponse } from 'http';
// 24.06.23: types for formidable are not fully compatible with formidable@v3.
// TypeScript throws an error about json & firstValues. Ignoring it.
// @ts-ignore
import formidable, { json } from 'formidable';
// @ts-ignore
// eslint-disable-next-line import/extensions
import { firstValues } from 'formidable/src/helpers/firstValues.js';
import dotenv from 'dotenv';
import {
  Collection, Db, Document, MongoClient,
} from 'mongodb';

const applications = ['help-desk', 'like-a-trello'] as const;

namespace Types {
  export type Apps = typeof applications[number];
  export type Actions = 'fetch' | 'new' | 'update' | 'delete';
  export type Url<T extends Actions, U extends Apps> = `/database/${U}/${T}`;

  type Basic = { id?: string };
  export namespace HelpDesk {
    /**
     * Help desk request variants:
     * new: { id, done, name, description, date }
     * update: { id, done } или { id[], done[], isBulk } или { id, name, description }
     * delete: { id }
     * get: {}
     */
    export type MultipleUpdateHot = {
      id: Array<string>, done: Array<boolean>, isBulk: Array<true>,
    };
    export type UpdateHot = { id: string, done: boolean } | MultipleUpdateHot;
    type UpdateFull = { id: string, name: string, description: string };
    type Update = UpdateHot | UpdateFull;
    type New = UpdateHot & UpdateFull & { date: string };
    export type HelpDesk = Basic | Update | New;
  }
  export namespace LikeATrello {
    /**
     * Like a Trello request variants:
     * new: { id, order, column, name, files }
     * update: { 0 | 1: { id, order, column } } или { id, name, files }
     * delete: { id }
     * get: {}
     */
    type Column = 'todo' | 'doing' | 'done';
    type Order = { id: string, order: number, column: Column };
    type File = { name: string, type: string, lastModified: number, link: string };

    type Move = { move: Array<Order> };
    type Update = { id: string, name: string, files: Array<File> | File };
    interface New extends Order {
      name: string,
      files: Array<File> | File,
    }
    export type LikeATrello = Basic | Move | Update | New;
  }
}

dotenv.config();

const port = process.env.PORT!;
const mongoUrl = process.env.MONGO_URL!;
const client = new MongoClient(mongoUrl);

const switcher = async (
  col: Collection,
  actions: Types.Actions,
  document: Types.HelpDesk.HelpDesk | Types.LikeATrello.LikeATrello,
  // eslint-disable-next-line consistent-return
) => {
  switch (actions) {
    case 'new': {
      await col.insertOne(document);
      return { status: 'Added', data: '' };
    }
    case 'update': {
      if ('done' in document) {
        // Help desk hot update
        if (Array.isArray(document.id)) {
          // If we have a group of checkbox updates
          const { isBulk, ...rest } = document as Types.HelpDesk.MultipleUpdateHot;
          const documents: Array<any> = [];
          // Turning { id: ['1', '2'], done: ['3', '4'] }
          // into [ { id: '1', done: '3' }, { id: '2', done: '4' } ]
          Object.entries(rest).forEach((row, index) => {
            (row[1] as unknown as Array<string>).forEach((item, i) => {
              if (index === 0) {
                documents.push({ [row[0]]: item });
              } else {
                // @ts-ignore
                (documents[i] as Array<{}>)[row[0]] = item;
              }
            });
          });
          // Preparing an array with simultaneous actions for MongoDB
          const bulk = documents.map((item) => ({
            updateOne: {
              filter: { id: item.id },
              update: { $set: { done: item.done } },
            },
          }));
          await col.bulkWrite(bulk, { ordered: false });
        } else {
          // If we have only one checkbox updated
          await col.updateOne({ id: document.id }, { $set: { done: document.done } });
        }
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
        await Promise.all(document.move.map(async (doc) => col.updateOne(
          { id: doc.id },
          { $set: { order: doc.order, column: doc.column } },
        )));
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
      // eslint-disable-next-line no-case-declarations
      const data: Array<Document> = await col.find().toArray();
      return {
        status: 'Fetched',
        // DB stores boolean values as strings. It is needed to get them back
        data: data.map((item) => {
          const { _id, ...rest } = item;
          return { ...rest, done: (item.done === 'true') };
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
 * @param dbName - a database name
 * @param actions - see Actions
 * @param document - depends on a project
 */
const crud = async (
  dbName: Types.Apps,
  actions: Types.Actions,
  document: Types.HelpDesk.HelpDesk | Types.LikeATrello.LikeATrello,
) => {
  try {
    await client.connect();
    console.log('Connected correctly to server');
    const db: Db = client.db(dbName);

    // Use the collection "items"
    const col: Collection = db.collection('items');

    return await switcher(col, actions, document);
  } catch (err) {
    console.log(err);
    return {
      status: 'Error',
      data: (err as Error).message,
    };
  } finally {
    await client.close();
  }
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  console.log('Request to %s detected', req.url);
  const [, app, action] = (req.url as Types.Url<Types.Actions, Types.Apps>).slice(1).split('/');

  // Setting Access-Control-Allow-Origin depending on an origin header
  if (req.headers.origin && applications
    .flatMap((item) => ([
      `https://${item}-solarlime.vercel.app`,
      `https://${item}.solarlime.dev`,
    ]))
    .find((item) => item === req.headers.origin)) {
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
    form.parse(req, async (err, fieldsMultiple) => {
      // formidable parses fields and groups them if they have the same name
      let result;
      if (fieldsMultiple.isBulk) {
        result = await crud(app as Types.Apps, action as Types.Actions, fieldsMultiple);
      } else {
        const fieldsSingle = firstValues(form, fieldsMultiple);
        result = await crud(app as Types.Apps, action as Types.Actions, fieldsSingle);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.writeHead(200);
      res.end(JSON.stringify(result));
    });
  }
});

server.listen(parseInt(port, 10), () => { console.log('Server is listening on %s', port); });
