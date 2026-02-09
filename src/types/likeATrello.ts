import type { InferOutput } from 'valibot';
import type {
  likeATrelloNewSchema,
  likeATrelloUpdateContentSchema,
  likeATrelloUpdateMoveSchema,
} from '../validation/schemas';

export type LikeATrelloUpdateMove = InferOutput<typeof likeATrelloUpdateMoveSchema>;
export type LikeATrelloUpdateContent = InferOutput<typeof likeATrelloUpdateContentSchema>;
export type LikeATrelloNew = InferOutput<typeof likeATrelloNewSchema>;
