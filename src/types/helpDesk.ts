import type { InferOutput } from 'valibot';
import type { helpDeskMultipleUpdateSchema } from '../validation/schemas';

export type HelpDeskMultipleUpdate = InferOutput<typeof helpDeskMultipleUpdateSchema>;
