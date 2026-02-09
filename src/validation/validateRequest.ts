import { type GenericSchema, parse } from 'valibot';
import type { Action, App } from '../types/generic';
import {
  getValidationSchema,
  helpDeskLegacyUpdateFullSchema,
  helpDeskLegacyUpdateHotSchema,
  likeATrelloUpdateContentSchema,
  likeATrelloUpdateMoveSchema,
} from './schemas';

export interface ValidationError {
  status: 'ValidationError';
  message: string;
  issues: Array<{
    path: string[];
    message: string;
  }>;
}

function validateWithMultipleSchemas(
  data: unknown,
  schemas: GenericSchema[],
): true | ValidationError {
  const errors: ValidationError[] = [];

  for (const schema of schemas) {
    try {
      parse(schema, data);
      return true; // Successfully validated with at least one schema
    } catch (error) {
      errors.push({
        status: 'ValidationError',
        message: 'Validation failed',
        issues: (error as { issues?: Array<{ path: string[]; message: string }> }).issues || [],
      });
    }
  }

  // If we get here, none of the schemas matched
  return {
    status: 'ValidationError',
    message: 'Data does not match any of the expected schemas',
    issues: errors.flatMap((e) => e.issues),
  };
}

export function validateRequest(app: App, action: Action, data: unknown): true | ValidationError {
  // Skip validation for fetch requests (GET requests)
  if (action === 'fetch') {
    return true;
  }

  // Handle special cases with multiple schemas
  if (app === 'help-desk' && action === 'update') {
    return validateWithMultipleSchemas(data, [
      helpDeskLegacyUpdateHotSchema,
      helpDeskLegacyUpdateFullSchema,
    ]);
  }

  if (app === 'like-a-trello' && action === 'update') {
    return validateWithMultipleSchemas(data, [
      likeATrelloUpdateMoveSchema,
      likeATrelloUpdateContentSchema,
    ]);
  }

  // Handle single schema cases
  const schema = getValidationSchema(app, action);

  if (!schema) {
    return {
      status: 'ValidationError',
      message: `No validation schema found for app: ${app}, action: ${action}`,
      issues: [],
    };
  }

  try {
    parse(schema, data);
    return true;
  } catch (error) {
    return {
      status: 'ValidationError',
      message: 'Validation failed',
      issues: (error as { issues?: Array<{ path: string[]; message: string }> }).issues || [],
    };
  }
}
