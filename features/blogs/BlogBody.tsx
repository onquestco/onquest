import { Fragment } from 'react';
import { lineParts } from './linkParts';

// The blog's text: paragraphs in <p>, line breaks as <br>, web links as links (spec §3.7). Built
// from text nodes only: no dangerouslySetInnerHTML, so nothing a writer types becomes markup.

type Props = {
  /** Paragraphs → lines, from toParagraphs() (lib/blog/toBlogData.ts). */
  paragraphs: string[][];
};

export function BlogBody({ paragraphs }: Props) {
  if (paragraphs.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 text-body text-ink">
      {paragraphs.map((lines, paragraphIndex) => (
        <p key={paragraphIndex} className="break-words">
          {lines.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {lineParts(line).map((part, partIndex) =>
                part.kind === 'link' ? (
                  <a
                    key={partIndex}
                    href={part.href}
                    target="_blank"
                    rel="nofollow ugc noopener"
                    className="break-all text-brand-strong underline"
                  >
                    {part.text}
                  </a>
                ) : (
                  <Fragment key={partIndex}>{part.text}</Fragment>
                ),
              )}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
