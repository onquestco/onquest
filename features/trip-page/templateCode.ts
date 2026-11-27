import { TEMPLATE_CODE } from '@/lib/analytics/codes';
import type { TemplateId } from '@/templates/registry';

// Every template has a code: a new template that isn't in codes.ts fails the type check here.
const TEMPLATE_CODES: Record<TemplateId, number> = TEMPLATE_CODE;

/** quest_viewed.template. An unknown id renders as Beach (getTemplate), so it is counted as Beach. */
export function templateCode(templateId: string): number {
  return Object.hasOwn(TEMPLATE_CODES, templateId)
    ? TEMPLATE_CODES[templateId as TemplateId]
    : TEMPLATE_CODES.beach;
}
