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
import type { MongoClient } from 'mongodb';
import performCrudOperation from './performCrudOperation';
import { type Action, type App, applications, type Url } from './types/generic';
import { validateRequest } from './validation/validateRequest';

export default function createServer(client: MongoClient) {
  return createNodeHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const [, app, action] = (req.url as Url<Action, App>).slice(1).split('/');

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

    const method = req.method?.toLowerCase();

    if (method === 'options') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (method && ['get', 'post', 'put', 'delete'].includes(method)) {
      console.log('Request to %s detected', req.url);
      const form = formidable({});
      form.use(json);
      form.parse(req, async (_err, fieldsMultiple) => {
        // formidable parses fields and groups them if they have the same name
        const fieldsSingle = firstValues(form, fieldsMultiple);

        // Validate request data
        const validationResult = validateRequest(app as App, action as Action, fieldsSingle);

        if (validationResult !== true) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.writeHead(400);
          res.end(JSON.stringify(validationResult));
          return;
        }

        const result = await performCrudOperation(
          client,
          app as App,
          action as Action,
          fieldsSingle,
        );

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.writeHead(200);
        res.end(JSON.stringify(result));
      });
    }
  });
}
