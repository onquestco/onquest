import alpine from './alpine';
import beach from './beach';
import coastal from './coastal';
import mountain from './mountain';
import type { Template } from './types';

// Every template, by id. To add one: create templates/<id>/ and add it here (see CLAUDE.md).
// Ids are stored in Quests, so an id is never removed or reused: an old look is `retired` instead.
export const templates = { beach, mountain, coastal, alpine } satisfies Record<string, Template>;

export type TemplateId = keyof typeof templates;

/** The look a new Quest starts with. The database's own default stays 'beach' for rollbacks. */
export const DEFAULT_TEMPLATE_ID: TemplateId = 'coastal';

export const isTemplateId = (id: string): id is TemplateId => id in templates;

/** Looks up a template, falling back to Beach for unknown ids (e.g. a template that was removed). */
export function getTemplate(id: string): Template {
  return isTemplateId(id) ? templates[id] : templates.beach;
}

/**
 * What the template picker offers: every live template, plus the Quest's current template when it
 * is retired, so a draft that chose Beach or the old Mountain keeps it until the writer picks another.
 */
export function pickableTemplates(currentId: string): Template[] {
  const live: Template[] = Object.values(templates).filter((template) => template.status === 'live');
  const current = isTemplateId(currentId) ? templates[currentId] : undefined;
  return current?.status === 'retired' ? [...live, current] : live;
}
