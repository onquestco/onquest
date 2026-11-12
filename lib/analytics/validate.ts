import type { PropertyRule } from './taxonomyFromCsv';

export type EventProperties = Record<string, string | number | boolean | undefined>;

/** What's wrong with an event's properties against its taxonomy rules ([] = valid). */
export function propertyProblems(rules: Record<string, PropertyRule>, properties: EventProperties): string[] {
  const problems: string[] = [];
  for (const [name, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    const rule = rules[name];
    if (!rule) {
      problems.push(`${name}: not in the taxonomy`);
      continue;
    }
    if (rule.type === 'BOOL' && typeof value !== 'boolean') problems.push(`${name}: not a boolean`);
    if ((rule.type === 'INT64' || rule.type === 'FLOAT64') && typeof value !== 'number') {
      problems.push(`${name}: not a number`);
    }
    if (rule.type === 'INT64' && typeof value === 'number' && !Number.isInteger(value)) {
      problems.push(`${name}: not a whole number`);
    }
    if (typeof value === 'number' && rule.min !== undefined && rule.max !== undefined) {
      if (value < rule.min || value > rule.max)
        problems.push(`${name}: ${value} outside ${rule.min}–${rule.max}`);
    }
    if (rule.type === 'STRING' && typeof value !== 'string') problems.push(`${name}: not a string`);
    if (rule.values && !rule.values.includes(String(value))) problems.push(`${name}: "${value}" not allowed`);
    if (
      rule.list &&
      String(value)
        .split(',')
        .some((part) => !rule.list?.includes(part))
    ) {
      problems.push(`${name}: "${value}" not allowed`);
    }
  }
  for (const [name, rule] of Object.entries(rules)) {
    if (rule.required && properties[name] === undefined) problems.push(`${name}: missing`);
  }
  return problems;
}

/** Only the event's own properties survive (spec A §3.9 allowlist), never undefined ones. */
export function keepAllowed(
  rules: Record<string, PropertyRule>,
  properties: EventProperties,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, string | number | boolean] => entry[0] in rules && entry[1] !== undefined,
    ),
  );
}
