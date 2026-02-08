import type { Socket } from 'node:net';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import createServer from './createServer';
import handleShutdown from './handleShutdown';

dotenv.config();

const port = process.env.PORT;
const mongoUrl = process.env.MONGO_URL;

if (!port || !mongoUrl) {
  console.error('Port or MongoURL are not defined');
  process.exit(1);
}

const client = new MongoClient(mongoUrl);
await client.connect();
console.log('Connected correctly to MongoDB');

const server = createServer(client);

const sockets = new Set<Socket>();

server.on('connection', (socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, (signal: string) =>
    handleShutdown(
      signal,
      async () => {
        server.close(() => console.log('Server stopped'));
        // Closing existing connections
        setTimeout(() => {
          sockets.forEach((s) => {
            s.destroy();
          });
        }, 5000);
        await client.close();
        console.log('MongoDB connection closed');
      },
      (err: Error) => {
        console.error('Error:', err);
      },
    ),
  );
});

server.listen(parseInt(port, 10), () => {
  console.log('Server is listening on %s', port);
});
