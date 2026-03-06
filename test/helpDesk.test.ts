import assert from 'node:assert';
import { after, before, describe, test } from 'node:test';
import createServer from '../src/createServer';
import { testClient } from './setup';
import { assertJsonResponse, HttpClient } from './utils/httpClient';

describe('Help-Desk Integration Tests', () => {
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

  test('should create new document via HTTP', async () => {
    const testDocument = {
      id: 'http-test-1',
      name: 'HTTP Test Ticket',
      description: 'Test description via HTTP',
      done: 'true',
      date: '2024-01-01',
    };

    const response = await httpClient.post(
      '/database/help-desk/new',
      JSON.stringify(testDocument),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Added');
  });

  test('should fetch documents via HTTP', async () => {
    // First create a test document
    const testDocument = {
      id: 'http-fetch-test',
      name: 'Fetch Test',
      description: 'Test fetch',
      done: 'false',
      date: '2024-01-02',
    };

    await testClient.db('help-desk').collection('items').insertOne(testDocument);

    const response = await httpClient.get('/database/help-desk/fetch', {
      origin: 'http://localhost:3000',
    });

    const result = assertJsonResponse(response);
    assert.ok(Array.isArray(result.data));
    assert.ok(result.data.length > 0);

    // Verify that the created document is in the response
    const fetchedDoc = result.data.find((item: any) => item.id === testDocument.id);
    assert.ok(fetchedDoc, 'Created document should be in fetch response');
    assert.strictEqual(fetchedDoc.name, testDocument.name);
    assert.strictEqual(fetchedDoc.description, testDocument.description);
    // Note: Database stores done as boolean, even though we create it as string
    assert.strictEqual(fetchedDoc.done, false);
    assert.strictEqual(fetchedDoc.date, testDocument.date);
  });

  test('should update document via HTTP (hot schema)', async () => {
    // Setup test data
    await testClient.db('help-desk').collection('items').insertOne({
      id: 'http-update-hot',
      name: 'Original Name',
      description: 'Original description',
      done: 'true',
      date: '2024-01-01',
    });

    const updateData = {
      id: 'http-update-hot',
      done: 'false',
    };

    const response = await httpClient.post(
      '/database/help-desk/update',
      JSON.stringify(updateData),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Updated');
  });

  test('should delete document via HTTP', async () => {
    // Setup test data
    await testClient.db('help-desk').collection('items').insertOne({
      id: 'http-delete-test',
      name: 'To Delete',
      description: 'To delete description',
      done: 'true',
      date: '2024-01-01',
    });

    const deleteData = { id: 'http-delete-test' };

    const response = await httpClient.post(
      '/database/help-desk/delete',
      JSON.stringify(deleteData),
      { origin: 'http://localhost:3000' },
    );

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Removed');
  });

  test('should handle batch operations via HTTP', async () => {
    // Setup: Create initial items in database
    const initialItems = [
      {
        id: 'initial-item-1',
        name: 'Initial Item 1',
        description: 'Initial Description 1',
        done: 'false', // Legacy schema expects string
        date: '2024-01-01',
      },
      {
        id: 'initial-item-2',
        name: 'Initial Item 2',
        description: 'Initial Description 2',
        done: 'true', // Legacy schema expects string
        date: '2024-01-02',
      },
    ];

    // Create initial items
    for (const item of initialItems) {
      await httpClient.post('/database/help-desk/new', JSON.stringify(item), {
        origin: 'http://localhost:3000',
      });
    }

    // Batch operations: create 2 new items, update 1 existing item, delete 1 existing item
    const batchData = {
      operations: {
        create: [
          {
            id: 'batch-new-1',
            name: 'Batch New Item 1',
            description: 'New Description 1',
            done: true,
            date: '2024-01-03',
          },
          {
            id: 'batch-new-2',
            name: 'Batch New Item 2',
            description: 'New Description 2',
            done: false,
            date: '2024-01-04',
          },
        ],
        update: [
          {
            id: 'initial-item-1',
            name: 'Updated Item 1',
            description: 'Updated Description 1',
            done: true, // Changed from false to true
            date: '2024-01-01', // Add required date field
          },
        ],
        delete: [
          {
            id: 'initial-item-2',
          },
        ],
      },
    };

    const response = await httpClient.post('/database/help-desk/batch', JSON.stringify(batchData), {
      origin: 'http://localhost:3000',
    });

    const result = assertJsonResponse(response);
    assert.strictEqual(result.status, 'Batch applied');

    // Verify that data field matches the batchData exactly
    assert.deepStrictEqual(result.data, batchData);

    // Optional: Verify the final state by fetching all items
    const fetchResponse = await httpClient.get('/database/help-desk/fetch', {
      origin: 'http://localhost:3000',
    });
    const fetchResult = assertJsonResponse(fetchResponse);

    // Should have: initial-item-1 (updated), batch-new-1, batch-new-2
    // Should NOT have: initial-item-2 (deleted)
    const itemIds = fetchResult.data.map((item: any) => item.id);
    assert.ok(itemIds.includes('initial-item-1'));
    assert.ok(itemIds.includes('batch-new-1'));
    assert.ok(itemIds.includes('batch-new-2'));
    assert.ok(!itemIds.includes('initial-item-2'));

    // Verify the updated item has correct values
    const updatedItem = fetchResult.data.find((item: any) => item.id === 'initial-item-1');
    assert.strictEqual(updatedItem.done, true);
    assert.strictEqual(updatedItem.name, 'Updated Item 1');
  });
});
