import { Fragment, type ReactNode } from 'react';
import type { BlogBlock, BlogInline, BlogLine } from '@/lib/blog/markdown';
import { BlogSpoiler, CoveredSpoiler } from './BlogSpoiler';

// The blog's text (blogs-editor spec §6.2): parseBlogBody()'s blocks turned into React elements.
// Every piece of the writer's text goes in as a text node and every href comes from the parser
// (http/https only), so nothing a writer types becomes markup: no dangerouslySetInnerHTML.
// Headings start at h2: the page's only h1 is the title (spec D4).

type Props = {
  /** From parseBlogBody() (lib/blog/markdown.ts), via toBlogData() or Preview. */
  blocks: BlogBlock[];
};

/**
 * Where a run sits. Inside a link, a spoiler can't be a button (no button in an <a>); inside a
 * covered spoiler, links are plain text until it's revealed (no <a> in a button).
 */
type Context = { inLink: boolean; covered: boolean };

const LINK = 'break-all text-brand-strong underline';

export function BlogBody({ blocks }: Props) {
  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 text-body text-ink">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="break-words">{lines(block.lines)}</p>;
    case 'heading': {
      const content = line(block.line);
      if (block.level === 1) return <h2 className="text-title break-words text-ink">{content}</h2>;
      if (block.level === 2) return <h3 className="text-lead font-bold break-words text-ink">{content}</h3>;
      return <h4 className="text-body font-bold break-words text-ink">{content}</h4>;
    }
    case 'quote':
      return (
        <blockquote className="break-words border-l-4 border-brand-tint pl-4 text-ink-muted">
          {lines(block.lines)}
        </blockquote>
      );
    case 'list': {
      const items = block.items.map((item, index) => (
        <li key={index} className="break-words pl-1">
          {line(item)}
        </li>
      ));
      return block.ordered ? (
        <ol start={block.start} className="flex list-decimal flex-col gap-1 pl-6">
          {items}
        </ol>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-6">{items}</ul>
      );
    }
  }
}

/** Lines of one block, with <br> between them (a single \n is a line break, as before). */
function lines(blockLines: BlogLine[]): ReactNode {
  return blockLines.map((blockLine, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line(blockLine)}
    </Fragment>
  ));
}

function line(nodes: BlogLine, context: Context = { inLink: false, covered: false }): ReactNode {
  return nodes.map((node, index) => <Fragment key={index}>{inline(node, context)}</Fragment>);
}

function inline(node: BlogInline, context: Context): ReactNode {
  switch (node.kind) {
    case 'text':
      return node.text;
    case 'code':
      return <code className="rounded-sm bg-brand-wash px-1 break-words">{node.text}</code>;
    case 'bold':
      return <strong className="font-bold">{line(node.children, context)}</strong>;
    case 'italic':
      return <em>{line(node.children, context)}</em>;
    case 'strike':
      return <s>{line(node.children, context)}</s>;
    case 'link': {
      const children = line(node.children, { ...context, inLink: true });
      if (context.covered) return <span className="underline">{children}</span>;
      return (
        <a href={node.href} target="_blank" rel="nofollow ugc noopener" className={LINK}>
          {children}
        </a>
      );
    }
    case 'spoiler': {
      const covered = line(node.children, { ...context, covered: true });
      if (context.inLink || context.covered) return <CoveredSpoiler>{covered}</CoveredSpoiler>;
      return <BlogSpoiler covered={covered} revealed={line(node.children, context)} />;
    }
  }
}
