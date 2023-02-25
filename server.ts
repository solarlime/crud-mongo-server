import { createServer, IncomingMessage, ServerResponse } from 'http';
import formidable from 'formidable';
import dotenv from 'dotenv';
import {
  Collection, Db, Document, MongoClient,
} from 'mongodb';

namespace Types {
  export type Apps = 'help-desk' | 'like-a-trello';
  export type Actions = 'fetch' | 'new' | 'update' | 'delete';
  export type Url<T extends Actions, U extends Apps> = `/database/${U}/${T}`;

  type Basic = { id?: string };
  export namespace HelpDesk {
    /**
     * Help desk request variants:
     * new: { id, done, name, description, date }
     * update: { id, done } или { id, name, description }
     * delete: { id }
     * get: {}
     */
    type UpdateHot = { id: string, done: boolean };
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

const { plugins } = formidable;
const port = process.env.PORT!;
const mongoUrl = process.env.MONGO_URL!;
const client = new MongoClient(mongoUrl);

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

    switch (actions) {
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
        throw Error('Another action was requested');
      }
    }
    throw Error('Switch was not triggered');
  } catch (err) {
    console.log(err);
    return {
      status: 'Error',
      data: err,
    };
  } finally {
    await client.close();
  }
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  console.log('Request to %s detected', req.url);
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    form.use(plugins.json);
    form.parse(req, async (err, fields) => {
      const [, app, action] = (req.url as Types.Url<Types.Actions, Types.Apps>).slice(1).split('/');

      const result = await crud(app as Types.Apps, action as Types.Actions, fields);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(result));
    });
  }
});

server.listen(parseInt(port, 10), () => { console.log('Server is listening on %s', port); });
