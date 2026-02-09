import { array, boolean, number, object, string, union } from 'valibot';
import type { App } from '../types/generic';

// Basic schema for id field
const basicSchema = object({
  id: string(),
});

// Delete schema
export const deleteSchema = basicSchema;

// Help Desk Legacy schemas
const updateHotSchema = object({
  id: string(),
  done: union([string('true'), string('false')]), // don't ask me why I did it years ago
});

const updateFullSchema = object({
  id: string(),
  name: string(),
  description: string(),
});

export const helpDeskLegacyUpdateHotSchema = updateHotSchema;

export const helpDeskLegacyUpdateFullSchema = updateFullSchema;

export const helpDeskLegacyNewSchema = object({
  id: string(),
  done: union([string('true'), string('false')]), // and here too
  name: string(),
  description: string(),
  date: string(),
});

// Help Desk schemas
const createdOrUpdatedRowSchema = object({
  id: string(),
  name: string(),
  description: string(),
  date: string(),
  done: boolean(),
});

const deletedRowSchema = basicSchema;

export const helpDeskMultipleUpdateSchema = object({
  operations: object({
    create: array(createdOrUpdatedRowSchema),
    update: array(createdOrUpdatedRowSchema),
    delete: array(deletedRowSchema),
  }),
});

// Like a Trello schemas
const fileSchema = object({
  name: string(),
  type: string(),
  lastModified: number(),
  link: string(),
});

const orderSchema = object({
  id: string(),
  order: number(),
  column: union([string('todo'), string('doing'), string('done')]),
});

const updateMoveSchema = object({
  move: array(orderSchema),
});

const updateContentSchema = object({
  id: string(),
  name: string(),
  files: union([array(fileSchema), fileSchema]),
});

export const likeATrelloUpdateMoveSchema = updateMoveSchema;

export const likeATrelloUpdateContentSchema = updateContentSchema;

export const likeATrelloNewSchema = object({
  id: string(),
  order: number(),
  column: union([string('todo'), string('doing'), string('done')]),
  name: string(),
  files: union([array(fileSchema), fileSchema]),
});

// Schema mapping
export const validationSchemas = {
  'help-desk': {
    new: helpDeskLegacyNewSchema,
    delete: deleteSchema,
    batch: helpDeskMultipleUpdateSchema,
  },
  'like-a-trello': {
    new: likeATrelloNewSchema,
    delete: deleteSchema,
  },
};

export function getValidationSchema(app: App, action: string) {
  if (app === 'help-desk') {
    if (action === 'new' || action === 'delete' || action === 'batch') {
      return validationSchemas[app]?.[action];
    }
  }
  if (app === 'like-a-trello') {
    if (action === 'new' || action === 'delete') {
      return validationSchemas[app]?.[action];
    }
  }
  return undefined;
}
