import type { ReactNode } from 'react';
import { guideBlocks } from './guideBlocks';

// Guide bodies (spec C §3.6): paragraphs and "## " subheadings only, turned into React elements.
// Anything else is shown as plain text: no HTML, no dangerouslySetInnerHTML.

export function renderGuide(body: string): ReactNode[] {
  return guideBlocks(body).map((block, index) =>
    block.kind === 'heading' ? (
      <h2 key={index} className="pt-2 text-lead font-semibold text-ink">
        {block.text}
      </h2>
    ) : (
      <p key={index} className="text-body text-ink">
        {block.text}
      </p>
    ),
  );
}
