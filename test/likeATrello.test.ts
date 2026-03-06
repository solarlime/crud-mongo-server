import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import createServer from '../src/createServer';
import { testClient } from './setup';
import { assertJsonResponse, HttpClient } from './utils/httpClient';

describe('Like-A-Trello Integration Tests', () => {
  let server: any;
  let httpClient: HttpClient;

  before(() => {
    server = createServer(testClient);
    httpClient = new HttpClient(server);
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('should create new card via HTTP', async () => {
    const cardData = {
      id: 'http-card-1',
      name: 'HTTP Test Card',
      column: 'todo',
      order: 1,
      files: [],
    };

    const response = await httpClient.post(
      '/database/like-a-trello/new',
      JSON.stringify(cardData),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Added');
  });

  test('should fetch cards via HTTP', async () => {
    // Setup test data
    const testCard = {
      id: 'http-fetch-card',
      name: 'Fetch Test Card',
      column: 'done',
      order: 1,
      files: [],
    };

    await testClient.db('like-a-trello').collection('items').insertOne(testCard);

    const response = await httpClient.get('/database/like-a-trello/fetch', {
      origin: 'http://localhost:3000',
    });

    const result = assertJsonResponse(response);
    assert.ok(Array.isArray(result.data));
    assert.ok(result.data.length > 0);

    // Verify that the created card is in the response
    const fetchedCard = result.data.find((item: any) => item.id === testCard.id);
    assert.ok(fetchedCard, 'Created card should be in fetch response');
    assert.strictEqual(fetchedCard.name, testCard.name);
    assert.strictEqual(fetchedCard.column, testCard.column);
    assert.strictEqual(fetchedCard.order, testCard.order);
    assert.deepStrictEqual(fetchedCard.files, testCard.files);
  });

  test('should handle move operations via HTTP', async () => {
    // Setup test cards
    await testClient
      .db('like-a-trello')
      .collection('items')
      .insertMany([
        { id: 'http-move-1', name: 'Card 1', column: 'todo', order: 1 },
        { id: 'http-move-2', name: 'Card 2', column: 'todo', order: 2 },
      ]);

    const moveData = {
      move: [
        { id: 'http-move-1', column: 'doing', order: 1 },
        { id: 'http-move-2', column: 'done', order: 1 },
      ],
    };

    const response = await httpClient.post(
      '/database/like-a-trello/update',
      JSON.stringify(moveData),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Updated');
  });

  test('should delete card via HTTP', async () => {
    // Setup test card
    const testCard = {
      id: 'http-delete-card',
      name: 'To Delete Card',
      column: 'todo',
      order: 1,
      files: [],
    };

    await testClient.db('like-a-trello').collection('items').insertOne(testCard);

    const response = await httpClient.post(
      '/database/like-a-trello/delete',
      JSON.stringify({ id: testCard.id }),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Removed');

    // Verify the card is actually deleted
    const fetchResponse = await httpClient.get('/database/like-a-trello/fetch', {
      origin: 'http://localhost:3000',
    });
    const fetchResult = assertJsonResponse(fetchResponse);
    const deletedCard = fetchResult.data.find((item: any) => item.id === testCard.id);
    assert.ok(!deletedCard, 'Deleted card should not be in fetch response');
  });

  test('should update card content via HTTP', async () => {
    // Setup test card
    const testCard = {
      id: 'http-update-card',
      name: 'Original Name',
      column: 'todo',
      order: 1,
      files: [
        {
          name: 'test.txt',
          type: 'text/plain',
          lastModified: 1640995200000,
          link: 'https://example.com/test.txt',
        },
      ],
    };

    await testClient.db('like-a-trello').collection('items').insertOne(testCard);

    // Update card with new name and files
    const updateData = {
      id: testCard.id,
      name: 'Updated Name',
      files: [
        {
          name: 'updated.txt',
          type: 'text/plain',
          lastModified: 1640995300000,
          link: 'https://example.com/updated.txt',
        },
        {
          name: 'new-file.pdf',
          type: 'application/pdf',
          lastModified: 1640995400000,
          link: 'https://example.com/new-file.pdf',
        },
      ],
    };

    const response = await httpClient.post(
      '/database/like-a-trello/update',
      JSON.stringify(updateData),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Updated');

    // Verify the card is actually updated
    const fetchResponse = await httpClient.get('/database/like-a-trello/fetch', {
      origin: 'http://localhost:3000',
    });
    const fetchResult = assertJsonResponse(fetchResponse);
    const updatedCard = fetchResult.data.find((item: any) => item.id === testCard.id);
    assert.ok(updatedCard, 'Updated card should be in fetch response');
    assert.strictEqual(updatedCard.name, updateData.name);
    assert.strictEqual(updatedCard.column, testCard.column); // Should remain unchanged
    assert.strictEqual(updatedCard.order, testCard.order); // Should remain unchanged
    assert.deepStrictEqual(updatedCard.files, updateData.files);
  });
});
