import type { InferOutput } from 'valibot';
import type {
  helpDeskLegacyNewSchema,
  helpDeskLegacyUpdateFullSchema,
  helpDeskLegacyUpdateHotSchema,
} from '../validation/schemas';

export type HelpDeskLegacyUpdateHot = InferOutput<typeof helpDeskLegacyUpdateHotSchema>;
export type HelpDeskLegacyUpdateFull = InferOutput<typeof helpDeskLegacyUpdateFullSchema>;
export type HelpDeskLegacyNew = InferOutput<typeof helpDeskLegacyNewSchema>;
