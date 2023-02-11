import { createServer, IncomingMessage, ServerResponse } from 'http';
import formidable from 'formidable';
import dotenv from 'dotenv';
import {
  Collection, Db, Document, MongoClient,
} from 'mongodb';

dotenv.config();

interface Doc {
  id?: string, done?: boolean, name?: string, description?: string, date?: string,
}

type Commands = '/fetch' | '/new' | '/update' | '/delete';
type Url<T extends Commands> = `/database${T}`;

const port = process.env.PORT!;
const mongoUrl = process.env.MONGO_URL!;
const client = new MongoClient(mongoUrl);

// The database to use
const dbName = 'help-desk';

/**
 * A function which deals with MongoDB: creates documents, updates them,
 * deletes and fetches them all depending on a request url
 * @param url
 * @param document
 */
const crud = async (url: Url<Commands>, document: Doc) => {
  try {
    await client.connect();
    console.log('Connected correctly to server');
    const db: Db = client.db(dbName);

    // Use the collection "items"
    const col: Collection = db.collection('items');

    switch (url) {
      case '/database/new': {
        await col.insertOne(document);
        return { status: 'Added', data: '' };
      }
      case '/database/update': {
        if (document.done) {
          await col.updateOne({ id: document.id }, { $set: { done: document.done } });
        } else {
          await col.updateOne(
            { id: document.id },
            { $set: { name: document.name, description: document.description } },
          );
        }
        return { status: 'Updated', data: '' };
      }
      case '/database/delete': {
        await col.deleteOne({ id: document.id });
        return { status: 'Removed', data: '' };
      }
      default: {
        // eslint-disable-next-line no-case-declarations
        const data: Array<Document> = await col.find().toArray();
        return {
          status: 'Fetched',
          // DB stores boolean values as strings. It is needed to get them back
          data: data.map((item) => ({ ...item, done: (item.done === 'true') })),
        };
      }
    }
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
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.setHeader('Access-Control-Max-Age', 2592000);

  const method = req.method!.toLowerCase();

  if (method === 'options') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (['get', 'post', 'put', 'delete'].includes(method)) {
    const form = formidable();
    form.parse(req, async (err, fields) => {
      const result = await crud(req.url as Url<Commands>, fields);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(result));
    });
  }
});

server.listen(parseInt(port, 10), () => { console.log('Server is listening on %s', port); });
