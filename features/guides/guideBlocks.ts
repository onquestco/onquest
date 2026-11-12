// Guide bodies (spec C §3.6): paragraphs and "## " subheadings only.

export type GuideBlock = { kind: 'heading' | 'paragraph'; text: string };

export function guideBlocks(body: string): GuideBlock[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block.startsWith('## ')
        ? { kind: 'heading' as const, text: block.slice(3).trim() }
        : { kind: 'paragraph' as const, text: block.replace(/\s*\r?\n\s*/g, ' ') },
    );
}
