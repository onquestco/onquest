import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { isWebUrl, type LinePart } from '@/lib/blog/linkParts';
import { parseBlogBody } from '@/lib/blog/markdown';
import { toParagraphs } from '@/lib/blog/toBlogData';
import { blogCardFixture } from './blogCardFixture';
import { BlogBody } from './BlogBody';
import { blogFixture } from './blogFixture';

const render = (body: string) =>
  renderToStaticMarkup(createElement(BlogBody, { blocks: parseBlogBody(body) }));

const LINK = 'target="_blank" rel="nofollow ugc noopener" class="break-all text-brand-strong underline"';

/**
 * lineParts() as it was on main before BL-06, frozen (as in lib/blog/markdown.test.ts) so plain
 * bodies are compared with what live blogs render today, not with the new code.
 */
function liveLineParts(line: string): LinePart[] {
  const parts: LinePart[] = [];
  let index = 0;
  for (const match of line.matchAll(/https?:\/\/[^\s<>"]+/gi)) {
    const start = match.index;
    const trailing = match[0].match(/[.,;:!?'’”)\]]+$/)?.[0] ?? '';
    const url = match[0].slice(0, match[0].length - trailing.length);
    if (!isWebUrl(url)) continue;
    if (start > index) parts.push({ kind: 'text', text: line.slice(index, start) });
    parts.push({ kind: 'link', text: url, href: url });
    index = start + url.length;
  }
  if (index < line.length) parts.push({ kind: 'text', text: line.slice(index) });
  return parts;
}

/** The blog body as it rendered before formatting (BL-03): the backward-compatibility oracle. */
function renderBeforeFormatting(body: string): string {
  const paragraphs = toParagraphs(body);
  if (paragraphs.length === 0) return '';
  const paragraph = (lines: string[], index: number) =>
    createElement(
      'p',
      { key: index, className: 'break-words' },
      lines.map((line, lineIndex) =>
        createElement(
          Fragment,
          { key: lineIndex },
          lineIndex > 0 && createElement('br'),
          liveLineParts(line).map((part, partIndex) =>
            part.kind === 'link'
              ? createElement(
                  'a',
                  {
                    key: partIndex,
                    href: part.href,
                    target: '_blank',
                    rel: 'nofollow ugc noopener',
                    className: 'break-all text-brand-strong underline',
                  },
                  part.text,
                )
              : createElement(Fragment, { key: partIndex }, part.text),
          ),
        ),
      ),
    );
  return renderToStaticMarkup(
    createElement('div', { className: 'flex flex-col gap-4 text-body text-ink' }, paragraphs.map(paragraph)),
  );
}

describe('BlogBody: plain text, as before', () => {
  it('renders paragraphs on blank lines and keeps line breaks', () => {
    expect(render('Day one.\nBeach.\n\nDay two.')).toBe(
      '<div class="flex flex-col gap-4 text-body text-ink"><p class="break-words">Day one.<br/>Beach.</p><p class="break-words">Day two.</p></div>',
    );
  });

  it.each([
    ['the blog fixture', 'We stayed in Anjuna.\n\nScooters were ₹400 a day.'],
    ['the card fixture excerpt', blogCardFixture(1).excerpt],
    [
      'links, emoji and Windows endings',
      'Stay: https://example.com/a?b=1.\r\nThen 🌊\r\n\r\n\r\nhttp://goa.example.in, ok',
    ],
    [
      'text that only looks like syntax',
      '#goa #1 tip\n2 * 3 = 6\nsnake_case_name\n-not a list\n1.5 km\n>not a quote',
    ],
    ['typed HTML', '<b>bold</b> & <i>"quotes"</i>'],
    ['whitespace-only lines', 'a\n   \nb\n\t\n\nc'],
  ])('%s renders exactly as before formatting', (_name, body) => {
    expect(render(body)).toBe(renderBeforeFormatting(body));
  });

  it('the fixture blog renders as before', () => {
    const blog = blogFixture();
    expect(renderToStaticMarkup(createElement(BlogBody, { blocks: blog.blocks }))).toBe(
      renderBeforeFormatting('We stayed in Anjuna.\n\nScooters were ₹400 a day.'),
    );
  });

  it('renders nothing for an empty body', () => {
    expect(render('')).toBe('');
    expect(render('\n\n  \n')).toBe('');
  });
});

describe('BlogBody: formatting', () => {
  it('headings start at h2, under the page title', () => {
    const html = render('# One\n## Two\n### Three');
    expect(html).toContain('<h2 class="text-title break-words text-ink">One</h2>');
    expect(html).toContain('<h3 class="text-lead font-bold break-words text-ink">Two</h3>');
    expect(html).toContain('<h4 class="text-body font-bold break-words text-ink">Three</h4>');
    expect(html).not.toContain('<h1');
  });

  it('bullets and numbered lists, with the first number as start', () => {
    const html = render('- Beach\n* Fort\n\n3. Pack\n4. Go');
    expect(html).toMatch(/<ul class="[^"]*list-disc[^"]*"><li[^>]*>Beach<\/li><li[^>]*>Fort<\/li><\/ul>/);
    expect(html).toMatch(
      /<ol start="3" class="[^"]*list-decimal[^"]*"><li[^>]*>Pack<\/li><li[^>]*>Go<\/li><\/ol>/,
    );
  });

  it('quotes keep their line breaks', () => {
    expect(render('> Line one\n> Line two')).toMatch(/<blockquote[^>]*>Line one<br\/>Line two<\/blockquote>/);
  });

  it('bold, italic, strikethrough and code, nested', () => {
    const html = render('**bold *both*** ~~gone~~ `**not bold**`');
    expect(html).toContain('<strong class="font-bold">bold <em>both</em></strong>');
    expect(html).toContain('<s>gone</s>');
    expect(html).toMatch(/<code[^>]*>\*\*not bold\*\*<\/code>/);
  });

  it('[text](url) links open in a new tab with nofollow ugc noopener', () => {
    expect(render('See [the **map**](https://goa.example.in/map)')).toContain(
      `<a href="https://goa.example.in/map" ${LINK}>the <strong class="font-bold">map</strong></a>`,
    );
    expect(render('Stay: https://example.com')).toContain(
      `<a href="https://example.com" ${LINK}>https://example.com</a>`,
    );
  });

  it('a spoiler is a covered button with its text in the HTML', () => {
    const html = render('The ending: >!he was the guide!<');
    expect(html).toMatch(
      /<button type="button" aria-expanded="false" aria-label="Spoiler. Tap to reveal"[^>]*><span data-nosnippet="true">he was the guide<\/span><\/button>/,
    );
  });

  it('a covered spoiler stays out of search snippets and stays covered in forced-colours mode', () => {
    const html = render('The ending: >!he was the guide!< and [the >!secret!< place](https://casa.example.in)');
    expect(html.match(/data-nosnippet="true"/g)).toHaveLength(2);
    expect(html.match(/forced-color-adjust-none/g)).toHaveLength(2);
  });

  it('a link inside a spoiler is text until it is revealed (no <a> in a button)', () => {
    const html = render('>!stay at [Casa](https://casa.example.in)!<');
    expect(html).toMatch(/<button[^>]*><span data-nosnippet="true">stay at <span class="underline">Casa<\/span><\/span><\/button>/);
    expect(html).not.toContain('<a ');
  });

  it('a spoiler inside a link stays covered without a button (no button in an <a>)', () => {
    const html = render('[the >!secret!< place](https://casa.example.in)');
    expect(html).toMatch(
      /<a [^>]*>the <span aria-hidden="true" data-nosnippet="true" class="[^"]*bg-ink[^"]*">secret<\/span><span class="sr-only">\(spoiler\)<\/span> place<\/a>/,
    );
    expect(html).not.toContain('<button');
  });
});

describe('BlogBody: only the safe subset', () => {
  it('shows typed markup as text, never as HTML', () => {
    const html = render(
      '<script>alert(1)</script> <img src=x onerror=alert(1)> <style>*{display:none}</style>\n## <b>bold</b>\n- **<iframe src=x>**',
    );
    for (const tag of ['<script', '<img', '<style', '<b>', '<iframe']) expect(html).not.toContain(tag);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;iframe src=x&gt;');
  });

  it.each([
    '[x](javascript:alert(1))',
    '[x](data:text/html,hi)',
    '[x](/relative)',
    '[x](http://localhost)',
    '![x](https://goa.example.in/a.png)',
  ])('%s is not a link to anything but the web', (body) => {
    const html = render(body);
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain('href="data');
    expect(html).not.toContain('href="/');
    expect(html).not.toContain('href="http://localhost');
    expect(html).not.toContain('<img');
  });

  it("a link with a quote in it can't break out of its attribute", () => {
    expect(render('https://example.com/"onmouseover="alert(1)')).not.toContain('onmouseover="alert');
    expect(render('[x](https://example.com/"onmouseover="alert(1))')).not.toContain('onmouseover="alert');
  });
});
