export const applications = ['help-desk', 'like-a-trello'] as const;

export type App = (typeof applications)[number];
export type Action = 'fetch' | 'new' | 'update' | 'delete' | 'batch';
export type Url<T extends Action, U extends App> = `/database/${U}/${T}`;

export type Basic = { id: string };
export type Delete = Basic;
