import { describe, expect, it } from 'vitest';
import { lineParts, type LinePart } from './linkParts';
import { blogPlainText, parseBlogBody, parseBlogLine, type BlogBlock, type BlogInline } from './markdown';
import { toParagraphs } from './toBlogData';

// The blog formatting grammar (blogs-editor spec §4.1): every row of the table, what stays text,
// hostile input, and old plain bodies reading exactly as they did before formatting existed.

const text = (value: string, from: number, to = from + value.length): BlogInline => ({
  kind: 'text',
  text: value,
  from,
  to,
});

/** A line as a short readable string, so the grammar tests read like the grammar table. */
function show(nodes: BlogInline[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'text') return node.text;
      if (node.kind === 'code') return `code(${node.text})`;
      if (node.kind === 'link') return `link<${node.href}>(${show(node.children)})`;
      return `${node.kind}(${show(node.children)})`;
    })
    .join('|');
}
const line = (source: string) => show(parseBlogLine(source));

describe('parseBlogLine: inline syntax', () => {
  it('reads bold, italic, strikethrough, spoiler and code', () => {
    expect(line('**Day 1** was long')).toBe('bold(Day 1)| was long');
    expect(line('so *very* good')).toBe('so |italic(very)| good');
    expect(line('~~₹2,000~~ ₹1,200')).toBe('strike(₹2,000)| ₹1,200');
    expect(line('The ending: >!he was the guide!<')).toBe('The ending: |spoiler(he was the guide)');
    expect(line('run `npm i` first')).toBe('run |code(npm i)| first');
  });

  it('gives every node its range in the line, markers included', () => {
    expect(parseBlogLine('a **b *c*** d')).toEqual([
      text('a ', 0),
      {
        kind: 'bold',
        from: 2,
        to: 11,
        children: [text('b ', 4), { kind: 'italic', from: 6, to: 9, children: [text('c', 7)] }],
      },
      text(' d', 11),
    ]);
    expect(parseBlogLine('`x` [Goa](https://goa.example.in)')).toEqual([
      { kind: 'code', text: 'x', from: 0, to: 3 },
      text(' ', 3),
      { kind: 'link', href: 'https://goa.example.in', from: 4, to: 33, children: [text('Goa', 5)] },
    ]);
  });

  it('nests markers inside each other', () => {
    expect(line('**bold *and italic* inside**')).toBe('bold(bold |italic(and italic)| inside)');
    expect(line('*italic **and bold** inside*')).toBe('italic(italic |bold(and bold)| inside)');
    expect(line('***both***')).toBe('bold(italic(both))');
    expect(line('*a **b***')).toBe('italic(a |bold(b))');
    expect(line('~~**gone** too~~')).toBe('strike(bold(gone)| too)');
    expect(line('>!*who* did it!<')).toBe('spoiler(italic(who)| did it)');
    expect(line('[**Goa** guide](https://goa.example.in)')).toBe(
      'link<https://goa.example.in>(bold(Goa)| guide)',
    );
  });

  it('needs a non-space after the opener and before the closer, and something inside', () => {
    for (const source of [
      '** spaced**',
      '**spaced **',
      '2 * 3 * 4',
      '****',
      '~~ x~~',
      '>! x!<',
      '>!x !<',
      '``',
      '**',
    ]) {
      expect(line(source)).toBe(source);
    }
  });

  it('keeps unmatched markers as text', () => {
    expect(line('**never closed')).toBe('**never closed');
    expect(line('a ~~b')).toBe('a ~~b');
    expect(line('>!no closer')).toBe('>!no closer');
    expect(line('one ` tick')).toBe('one ` tick');
    expect(line('**a*')).toBe('*|italic(a)');
  });

  it('keeps markers within one line', () => {
    expect(parseBlogBody('**starts here\nends here**')).toEqual([
      { kind: 'paragraph', lines: [[text('**starts here', 0)], [text('ends here**', 0)]] },
    ]);
  });

  it("doesn't let markers overlap: the first closer wins and the rest is text", () => {
    expect(line('**a ~~b** c~~')).toBe('bold(a ~~b)| c~~');
  });

  it('keeps code literal, and markers in code never close anything outside it', () => {
    expect(line('`**not bold**`')).toBe('code(**not bold**)');
    expect(line('**`a**`**')).toBe('bold(code(a**))');
    expect(line('*a `b*` c*')).toBe('italic(a |code(b*)| c)');
    expect(line('`[x](https://a.example.com)`')).toBe('code([x](https://a.example.com))');
  });

  it('has no _ italics, so snake_case and old text stay as they were', () => {
    expect(line('my_file_name and _this_')).toBe('my_file_name and _this_');
  });

  it('has no backslash escapes', () => {
    expect(line('\\*not escaped*')).toBe('\\|italic(not escaped)');
  });

  it('links [text](url) only to web urls', () => {
    expect(line('[Goa](https://goa.example.in/stay?id=4)')).toBe(
      'link<https://goa.example.in/stay?id=4>(Goa)',
    );
    for (const source of [
      '[x](javascript:alert(1))',
      '[x](data:text/html,hi)',
      '[x](/relative/path)',
      '[x](https://localhost)',
    ]) {
      expect(parseBlogLine(source)).toEqual([text(source, 0)]);
    }
  });

  it('a [text](url) that breaks the syntax is text, with its url linked like any pasted link', () => {
    const pasted = 'link<https://a.example.com>(https://a.example.com)';
    expect(line('[x](https://a.example.com y)')).toBe(`[x](|${pasted}| y)`);
    expect(line('[](https://a.example.com)')).toBe(`[](|${pasted}|)`);
    expect(line('[x] (https://a.example.com)')).toBe(`[x] (|${pasted}|)`);
  });

  it('never makes an image: ![…](…) is text (its url is linked like any pasted link)', () => {
    expect(line('![cat](https://a.example.com/cat.png)')).toBe(
      '![cat](|link<https://a.example.com/cat.png>(https://a.example.com/cat.png)|)',
    );
  });

  it('links bare http(s) links as before, but never inside a link', () => {
    expect(line('see https://a.example.com and **https://b.example.com**')).toBe(
      'see |link<https://a.example.com>(https://a.example.com)| and |bold(link<https://b.example.com>(https://b.example.com))',
    );
    expect(line('[https://a.example.com](https://b.example.com)')).toBe(
      'link<https://b.example.com>(https://a.example.com)',
    );
  });

  it('reads typed HTML as text', () => {
    for (const source of [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<style>body{display:none}</style>',
      '<b>bold</b>',
    ]) {
      expect(parseBlogLine(source)).toEqual([text(source, 0)]);
    }
  });
});

describe('parseBlogBody: blocks', () => {
  it('reads headings (# to ###) as one line each, only with a space and text', () => {
    expect(parseBlogBody('# Day 1\n## Morning\n### **Breakfast**')).toEqual([
      { kind: 'heading', level: 1, line: [text('Day 1', 2)] },
      { kind: 'heading', level: 2, line: [text('Morning', 3)] },
      {
        kind: 'heading',
        level: 3,
        line: [{ kind: 'bold', from: 4, to: 17, children: [text('Breakfast', 6)] }],
      },
    ]);
    expect(parseBlogBody('#1 tip\n#goa\n#### four\n # indented\n## ')).toEqual([
      {
        kind: 'paragraph',
        lines: [
          [text('#1 tip', 0)],
          [text('#goa', 0)],
          [text('#### four', 0)],
          [text(' # indented', 0)],
          [text('## ', 0)],
        ],
      },
    ]);
  });

  it('a heading ends the paragraph before it and starts a new one after it', () => {
    expect(parseBlogBody('before\n# Title\nafter').map((block) => block.kind)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ]);
  });

  it('reads bullets (- or *) and numbered items into one list per kind', () => {
    expect(parseBlogBody('- Beach\n* **Fort**\n3. Market\n9. Church\nThen home')).toEqual([
      {
        kind: 'list',
        ordered: false,
        start: 1,
        items: [[text('Beach', 2)], [{ kind: 'bold', from: 2, to: 10, children: [text('Fort', 4)] }]],
      },
      { kind: 'list', ordered: true, start: 3, items: [[text('Market', 3)], [text('Church', 3)]] },
      { kind: 'paragraph', lines: [[text('Then home', 0)]] },
    ]);
  });

  it('a blank line ends a list, and only 1 to 9 digits make a number', () => {
    expect(parseBlogBody('- a\n\n- b').map((block) => block.kind)).toEqual(['list', 'list']);
    expect(parseBlogBody('123456789. ok')[0]).toMatchObject({ kind: 'list', start: 123456789 });
    expect(parseBlogBody('1234567890. no')[0]).toMatchObject({ kind: 'paragraph' });
    expect(parseBlogBody('1.no\n-no\n*no*\n  - nested\n- ')[0]).toMatchObject({ kind: 'paragraph' });
    expect(parseBlogBody('1.no\n-no\n*no*\n  - nested\n- ')).toHaveLength(1);
  });

  it('reads > lines into one quote, a bare > included, but never >!', () => {
    expect(parseBlogBody('> Slow down.\n>\n> It is Goa.\n>!twist!<')).toEqual([
      { kind: 'quote', lines: [[text('Slow down.', 2)], [text('It is Goa.', 2)]] },
      { kind: 'paragraph', lines: [[{ kind: 'spoiler', from: 0, to: 9, children: [text('twist', 2)] }]] },
    ]);
    expect(parseBlogBody('>\n>')).toEqual([]);
    expect(parseBlogBody('>no space')).toEqual([{ kind: 'paragraph', lines: [[text('>no space', 0)]] }]);
  });

  it('keeps the plain-text rules: blank lines split paragraphs, \\n is a line break, Windows endings too', () => {
    expect(parseBlogBody('a\r\nb\r\n\r\n  \nc')).toEqual([
      { kind: 'paragraph', lines: [[text('a', 0)], [text('b', 0)]] },
      { kind: 'paragraph', lines: [[text('c', 0)]] },
    ]);
    expect(parseBlogBody('')).toEqual([]);
    expect(parseBlogBody(' \n\n\t')).toEqual([]);
  });
});

/** The tree the blog page rendered before formatting: toParagraphs() lines through lineParts(). */
const oldTree = (body: string): LinePart[][][] => toParagraphs(body).map((lines) => lines.map(lineParts));

/** The same shape from the new parser: only plain paragraphs, text and pasted links. */
function newTree(blocks: BlogBlock[]): LinePart[][][] {
  return blocks.map((block) => {
    if (block.kind !== 'paragraph') throw new Error(`a plain body made a ${block.kind}`);
    return block.lines.map((nodes) =>
      nodes.map((node): LinePart => {
        if (node.kind === 'text') return { kind: 'text', text: node.text };
        const [child] = node.kind === 'link' ? node.children : [];
        if (node.kind !== 'link' || node.children.length !== 1 || child?.kind !== 'text') {
          throw new Error(`a plain body made a ${node.kind}`);
        }
        return { kind: 'link', text: child.text, href: node.href };
      }),
    );
  });
}

describe('old plain bodies', () => {
  const bodies = [
    'We stayed in Anjuna.\n\nScooters were ₹400 a day.',
    'First line\nsecond line\n\n\n  \nNext paragraph',
    // blogFixture's and blogCardFixture's text (features/blogs), which lib tests can't import.
    'We stayed in Anjuna and rented a scooter.',
    'Booked on https://example.com/stay?id=4 for ₹1,200.\n(see http://goa.example.in).',
    'Rain all day 🌧️🌧️ then sun.\n  indented line\n\nPrice: 2 * 3 = 6, file_name_here, C# and #goa #beach!',
    'Is it worth it? Yes!! <3 > maybe\n\n1st day: beach. 2nd day: fort.\n-30% off at the shack',
    '<script>alert(1)</script> <img src=x onerror=alert(1)> [not a link] (really)',
  ];

  it.each(bodies)('read exactly as before: %s', (body) => {
    expect(newTree(parseBlogBody(body))).toEqual(oldTree(body));
  });

  it('give the same plain text as the old description did', () => {
    for (const body of bodies) {
      expect(blogPlainText(body)).toBe(toParagraphs(body).flat().join(' ').replace(/\s+/g, ' ').trim());
    }
  });
});

describe('blogPlainText', () => {
  it('removes every marker and keeps the words', () => {
    expect(
      blogPlainText(
        '# Day 1\n- **Beach** and *fort*\n2. ~~old~~ `new`\n\n> [Goa](https://goa.example.in) at https://a.example.com',
      ),
    ).toBe('Day 1 Beach and fort old new Goa at https://a.example.com');
  });

  it('replaces spoilers with (spoiler)', () => {
    expect(blogPlainText('The ending: >!he was the guide!< wow')).toBe('The ending: (spoiler) wow');
    expect(blogPlainText('>!a!<>!b!<')).toBe('(spoiler) (spoiler)');
  });

  it('cut: an unclosed spoiler hides the rest, wherever it is', () => {
    expect(blogPlainText('Day 1 >!the twist is that he', { cut: true })).toBe('Day 1 (spoiler)');
    expect(blogPlainText('Day 1 >!the twist **is** that', { cut: true })).toBe('Day 1 (spoiler)');
    expect(blogPlainText('**a >!b** c', { cut: true })).toBe('a (spoiler)');
    expect(blogPlainText('Day 1 >!secret!', { cut: true })).toBe('Day 1 (spoiler)');
    // Not cut: an unclosed >! is just text.
    expect(blogPlainText('Day 1 >!the twist')).toBe('Day 1 >!the twist');
    // Spaced, it was never an opener; in code, it is code.
    expect(blogPlainText('a >! b `>!c`', { cut: true })).toBe('a >! b >!c');
  });
});

describe('hostile bodies', () => {
  const hostile = [
    '*a '.repeat(3333),
    '**'.repeat(5000),
    '**'.repeat(2500) + 'a' + '**'.repeat(2499),
    `${'['.repeat(5000)}](${'x'.repeat(4990)}`,
    '[a](https://a.example.com'.repeat(380),
    '`'.repeat(10_000),
    '>!'.repeat(5000),
    '~~a '.repeat(2500),
    '*'.repeat(4999) + 'a' + '*'.repeat(5000),
    '# '.repeat(5000),
    '- *\n'.repeat(2500),
    'https://a.example.com/'.repeat(450),
  ];

  it('parse 10,000 characters in under 50 ms', () => {
    // Warm up once, so the timings measure the parser and not the JIT compiling it.
    for (const body of hostile) blogPlainText(body, { cut: true });
    for (const body of hostile) {
      expect(body.length).toBeLessThanOrEqual(10_000);
      const start = performance.now();
      parseBlogBody(body);
      blogPlainText(body, { cut: true });
      expect(performance.now() - start).toBeLessThan(50);
    }
  });
});
