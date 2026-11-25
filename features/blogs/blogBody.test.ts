import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { toParagraphs } from '@/lib/blog/toBlogData';
import { BlogBody } from './BlogBody';

const render = (body: string) => renderToStaticMarkup(createElement(BlogBody, { paragraphs: toParagraphs(body) }));

describe('BlogBody', () => {
  it('renders paragraphs on blank lines and keeps line breaks', () => {
    expect(render('Day one.\nBeach.\n\nDay two.')).toBe(
      '<div class="flex flex-col gap-4 text-body text-ink"><p class="break-words">Day one.<br/>Beach.</p><p class="break-words">Day two.</p></div>',
    );
  });

  it('links open in a new tab with nofollow ugc noopener', () => {
    const html = render('Stay: https://example.com');
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="nofollow ugc noopener"');
  });

  it('shows typed markup as text, never as HTML', () => {
    const html = render('<script>alert(1)</script> <img src=x onerror=alert(1)> <b>bold</b>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('a link with a quote in it can\'t break out of its attribute', () => {
    const html = render('https://example.com/"onmouseover="alert(1)');
    expect(html).not.toContain('onmouseover="alert');
  });

  it('renders nothing for an empty body', () => {
    expect(render('')).toBe('');
  });
});
