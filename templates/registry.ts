import beach from './beach';
import type { Template } from './types';

// Every template, by id. To add one: create templates/<id>/ and add it here (see CLAUDE.md).
export const templates = { beach } satisfies Record<string, Template>;

export type TemplateId = keyof typeof templates;

export const isTemplateId = (id: string): id is TemplateId => id in templates;

/** Looks up a template, falling back to Beach for unknown ids (e.g. a template that was removed). */
export function getTemplate(id: string): Template {
  return isTemplateId(id) ? templates[id] : templates.beach;
}
