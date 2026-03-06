import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { Action, App } from '../src/types/generic';
import { type ValidationError, validateRequest } from '../src/validation/validateRequest';

describe('Validation Tests', () => {
  test('should validate valid help-desk fetch request', () => {
    const result = validateRequest('help-desk', 'fetch', {});
    assert.strictEqual(result, true);
  });

  test('should validate valid help-desk new request', () => {
    const validData = {
      id: 'ticket-1',
      name: 'Test Ticket',
      description: 'Test description',
      done: 'true', // Legacy schema expects string 'true'/'false'
      date: '2024-01-01',
    };

    const result = validateRequest('help-desk', 'new', validData);
    assert.strictEqual(result, true);
  });

  test('should reject invalid help-desk new request (missing required fields)', () => {
    const invalidData = {
      name: 'Test Ticket',
      // Missing id, done, description, date
    };

    const result = validateRequest('help-desk', 'new', invalidData);
    assert.notStrictEqual(result, true);
    assert.ok(typeof result === 'object');
  });

  test('should validate valid help-desk update request (hot schema)', () => {
    const validData = {
      id: 'ticket-1',
      done: 'false', // Legacy schema expects string 'true'/'false'
    };

    const result = validateRequest('help-desk', 'update', validData);
    assert.strictEqual(result, true);
  });

  test('should validate valid help-desk update request (full schema)', () => {
    const validData = {
      id: 'ticket-1',
      name: 'Updated Ticket',
      description: 'Updated description',
    };

    const result = validateRequest('help-desk', 'update', validData);
    assert.strictEqual(result, true);
  });

  test('should reject help-desk update request without id', () => {
    const invalidData = {
      name: 'Updated Ticket',
      description: 'Updated description',
      // Missing id
    };

    const result = validateRequest('help-desk', 'update', invalidData);
    assert.notStrictEqual(result, true);
  });

  test('should validate valid help-desk delete request', () => {
    const validData = {
      id: 'ticket-1',
    };

    const result = validateRequest('help-desk', 'delete', validData);
    assert.strictEqual(result, true);
  });

  test('should reject help-desk delete request without id', () => {
    const invalidData = {};

    const result = validateRequest('help-desk', 'delete', invalidData);
    assert.notStrictEqual(result, true);
  });

  test('should validate valid like-a-trello move request', () => {
    const validData = {
      move: [
        { id: 'card-1', column: 'todo', order: 1 },
        { id: 'card-2', column: 'doing', order: 2 },
      ],
    };

    const result = validateRequest('like-a-trello', 'update', validData);
    assert.strictEqual(result, true);
  });

  test('should validate valid like-a-trello content update request', () => {
    const validData = {
      id: 'card-1',
      name: 'Updated Card Name',
      files: [],
    };

    const result = validateRequest('like-a-trello', 'update', validData);
    assert.strictEqual(result, true);
  });

  test('should validate valid like-a-trello new request', () => {
    const validData = {
      id: 'card-1',
      name: 'New Card',
      order: 1,
      column: 'todo',
      files: [],
    };

    const result = validateRequest('like-a-trello', 'new', validData);
    assert.strictEqual(result, true);
  });

  test('should reject invalid application', () => {
    const result = validateRequest('invalid-app' as App, 'new', {});
    assert.notStrictEqual(result, true);
  });

  test('should reject invalid action', () => {
    const result = validateRequest('help-desk', 'invalid-action' as Action, {});
    assert.notStrictEqual(result, true);
  });

  test('should reject help-desk update request that matches no schema', () => {
    const invalidData = {
      id: 'ticket-1',
      someRandomField: 'value',
      // Doesn't match either hot or full schema
    };

    const result = validateRequest('help-desk', 'update', invalidData);
    assert.notStrictEqual(result, true);
    assert.ok(typeof result === 'object');
    assert.strictEqual((result as ValidationError).status, 'ValidationError');
  });
});
