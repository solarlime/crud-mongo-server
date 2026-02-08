export const applications = ['help-desk', 'like-a-trello'] as const;

export type Apps = (typeof applications)[number];
export type Actions = 'fetch' | 'new' | 'update' | 'delete' | 'batch';
export type Url<T extends Actions, U extends Apps> = `/database/${U}/${T}`;

export type Basic = { id: string };
