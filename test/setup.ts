import { after, before } from 'node:test';
import type { MongoClient } from 'mongodb';
// @ts-expect-error
import { MockMongoClient } from './mocks/mongodb';

let testClient: MongoClient;

before(async () => {
  // Use mock MongoDB client for testing
  testClient = new MockMongoClient();
  await testClient.connect();

  console.log('Mock MongoDB client setup completed');
});

after(async () => {
  if (testClient) {
    await testClient.close();
    console.log('Mock MongoDB client connection closed');
  }
});

export { testClient };
