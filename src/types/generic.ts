import type { InferOutput } from 'valibot';
import type { deleteSchema } from '../validation/schemas';

export const applications = ['help-desk', 'like-a-trello'] as const;

export type App = (typeof applications)[number];
export type Action = 'fetch' | 'new' | 'update' | 'delete' | 'batch';
export type Url<T extends Action, U extends App> = `/database/${U}/${T}`;

export type Delete = InferOutput<typeof deleteSchema>;
