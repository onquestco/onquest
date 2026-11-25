import { describe, expect, it } from 'vitest';
import {
  activeFormats,
  continueList,
  toggleInline,
  toggleLine,
  type CommandResult,
  type Format,
  type Selection,
} from './formatCommands';
import { applyLink, cleanHref, linkAt, removeLink } from './linkCommands';

// The toolbar's text transforms (blogs-editor spec §6.1), written as before → after: "|" is the
// cursor and "{" … "}" a selection.

/** "Pack |light" or "Pack {light}" → the body and its selection. */
function marked(text: string): { body: string; selection: Selection } {
  const cursor = text.indexOf('|');
  if (cursor !== -1) return { body: text.replace('|', ''), selection: { start: cursor, end: cursor } };
  const start = text.indexOf('{');
  const end = text.indexOf('}') - 1;
  return { body: text.replace('{', '').replace('}', ''), selection: { start, end } };
}

/** The result written the same way, so a test reads as before → after. */
function show(result: CommandResult | null): string {
  if (!result) return 'native';
  if ('error' in result) return result.error;
  const { body, selection } = result;
  if (selection.start === selection.end)
    return `${body.slice(0, selection.start)}|${body.slice(selection.start)}`;
  return `${body.slice(0, selection.start)}{${body.slice(selection.start, selection.end)}}${body.slice(selection.end)}`;
}

const inline = (text: string, format: Parameters<typeof toggleInline>[2]) => {
  const { body, selection } = marked(text);
  return show(toggleInline(body, selection, format));
};
const line = (text: string, format: Parameters<typeof toggleLine>[2]) => {
  const { body, selection } = marked(text);
  return show(toggleLine(body, selection, format));
};
const enter = (text: string) => {
  const { body, selection } = marked(text);
  return show(continueList(body, selection.start));
};
const active = (text: string) => {
  const { body, selection } = marked(text);
  return [...activeFormats(body, selection)].sort();
};

describe('inline formats with a selection', () => {
  it.each([
    ['bold', 'Pack {light}', 'Pack **{light}**'],
    ['italic', 'Pack {light}', 'Pack *{light}*'],
    ['strike', 'Pack {light}', 'Pack ~~{light}~~'],
    ['code', 'Run {npm i}', 'Run `{npm i}`'],
    ['spoiler', 'It was {the guide}', 'It was >!{the guide}!<'],
  ] as const)('%s wraps the selection and keeps it selected', (format, before, after) => {
    expect(inline(before, format)).toBe(after);
  });

  it('trims spaces off the selection first, so the markers touch the words', () => {
    expect(inline('Pack{ light }now', 'bold')).toBe('Pack **{light}** now');
  });

  it('unwraps when the selection is the formatted text, from inside or with its markers', () => {
    expect(inline('Pack **{light}**', 'bold')).toBe('Pack {light}');
    expect(inline('Pack {**light**}', 'bold')).toBe('Pack {light}');
    expect(inline('a >!{b}!<', 'spoiler')).toBe('a {b}');
    expect(inline('a {`b`}', 'code')).toBe('a {b}');
    expect(inline('Pack *{*light*}*', 'bold')).toBe('Pack {light}');
  });

  it("italic doesn't take one star off bold text", () => {
    expect(inline('Pack **{light}**', 'italic')).toBe('Pack ***{light}***');
  });

  it('a selection across lines wraps each non-empty line', () => {
    expect(inline('{Beach\n\nFort}', 'bold')).toBe('{**Beach**\n\n**Fort**}');
    expect(inline('{- Beach\n- Fort}', 'italic')).toBe('{*- Beach*\n*- Fort*}');
  });

  it('and unwraps them when every line is already wrapped', () => {
    expect(inline('**{Beach**\n**Fort}**', 'bold')).toBe('{Beach\nFort}');
  });
});

describe('inline formats at the cursor', () => {
  it('inserts the pair with the cursor between', () => {
    expect(inline('Pack |', 'bold')).toBe('Pack **|**');
    expect(inline('|', 'spoiler')).toBe('>!|!<');
    expect(inline('a |b', 'code')).toBe('a `|`b');
  });

  it('pressing again on the empty pair takes it out', () => {
    expect(inline('Pack **|**', 'bold')).toBe('Pack |');
    expect(inline('~~|~~', 'strike')).toBe('|');
  });

  it('inside a run of that kind, removes its markers and keeps the cursor on the same letter', () => {
    expect(inline('Pack **li|ght** now', 'bold')).toBe('Pack li|ght now');
    expect(inline('Pack ~~light|~~', 'strike')).toBe('Pack light|');
    expect(inline('**a *b|c* d**', 'italic')).toBe('**a b|c d**');
    expect(inline('**a *b|c* d**', 'bold')).toBe('a *b|c* d');
  });

  it('just outside a run inserts a new pair', () => {
    expect(inline('**light**|', 'bold')).toBe('**light****|**');
  });
});

describe('line formats', () => {
  it.each([
    ['h1', 'Day 1|', '# Day 1|'],
    ['h2', 'Day 1|', '## Day 1|'],
    ['h3', 'D|ay 1', '### D|ay 1'],
    ['bullet', 'Beach|', '- Beach|'],
    ['numbered', 'Beach|', '1. Beach|'],
    ['quote', 'Beach|', '> Beach|'],
  ] as const)('%s adds its prefix to the line', (format, before, after) => {
    expect(line(before, format)).toBe(after);
  });

  it('toggles off when the line already has it', () => {
    expect(line('## Day 1|', 'h2')).toBe('Day 1|');
    expect(line('* Beach|', 'bullet')).toBe('Beach|');
    expect(line('7. Beach|', 'numbered')).toBe('Beach|');
    expect(line('>|', 'quote')).toBe('|');
  });

  it('replaces any other block prefix', () => {
    expect(line('# Day 1|', 'h3')).toBe('### Day 1|');
    expect(line('- Beach|', 'numbered')).toBe('1. Beach|');
    expect(line('> Beach|', 'bullet')).toBe('- Beach|');
  });

  it('a cursor inside the old prefix moves to just after the new one', () => {
    expect(line('#|# Day', 'bullet')).toBe('- |Day');
  });

  it('starts a list on an empty line', () => {
    expect(line('Intro\n\n|', 'bullet')).toBe('Intro\n\n- |');
  });

  it('applies to every line the selection touches, numbered 1, 2, 3, skipping blank lines', () => {
    expect(line('{Beach\nFort\n\nMarket}', 'numbered')).toBe('{1. Beach\n2. Fort\n\n3. Market}');
    expect(line('Be{ach\nFo}rt\nMarket', 'bullet')).toBe('{- Beach\n- Fort}\nMarket');
  });

  it('toggles off only when every touched line has it', () => {
    expect(line('{- Beach\n- Fort}', 'bullet')).toBe('{Beach\nFort}');
    expect(line('{- Beach\nFort}', 'bullet')).toBe('{- Beach\n- Fort}');
  });

  it("a selection ending at the start of a line doesn't touch that line", () => {
    expect(line('{Beach\n}Fort', 'quote')).toBe('> {Beach\n}Fort');
  });
});

describe('continueList on Enter', () => {
  it('continues a bulleted or numbered list', () => {
    expect(enter('- Beach|')).toBe('- Beach\n- |');
    expect(enter('* Beach|')).toBe('* Beach\n- |');
    expect(enter('9. Beach|')).toBe('9. Beach\n10. |');
  });

  it('splits an item where the cursor is', () => {
    expect(enter('- Beach| Fort')).toBe('- Beach\n- | Fort');
  });

  it('on an empty item, takes the marker off and leaves an empty line (the list ends)', () => {
    expect(enter('- Beach\n- |')).toBe('- Beach\n|');
    expect(enter('1. Beach\n2.  |')).toBe('1. Beach\n|');
  });

  it('anywhere else, Enter is native', () => {
    expect(enter('Beach|')).toBe('native');
    expect(enter('> Quote|')).toBe('native');
    expect(enter('-| Beach')).toBe('native');
  });
});

describe('activeFormats', () => {
  it('the runs around the cursor, and the line kind', () => {
    expect(active('## **Day *o|ne***')).toEqual<Format[]>(['bold', 'h2', 'italic']);
    expect(active('- [map](https://goa.example.in) and `co|de`')).toEqual<Format[]>(['bullet', 'code']);
    expect(active('[m|ap](https://goa.example.in)')).toEqual<Format[]>(['link']);
    expect(active('>!sec|ret!< ~~x~~')).toEqual<Format[]>(['spoiler']);
  });

  it('is off just outside a run, and inside markers that never close', () => {
    expect(active('**bold**|')).toEqual([]);
    expect(active('|**bold**')).toEqual([]);
    expect(active('**not bo|ld')).toEqual([]);
  });

  it('a selection is active when a run contains it', () => {
    expect(active('**{bold}**')).toEqual<Format[]>(['bold']);
    expect(active('{**bold**}')).toEqual<Format[]>(['bold']);
    expect(active('{a **bold**}')).toEqual([]);
  });

  it('a bare "- " or "## " counts, since the writer has just started it', () => {
    expect(active('- |')).toEqual<Format[]>(['bullet']);
    expect(active('## |')).toEqual<Format[]>(['h2']);
  });
});

describe('the 10,000-character limit (markers count, spec D6)', () => {
  const full = 'x'.repeat(9_999);

  it('refuses formatting that would go over it, and leaves the body alone', () => {
    expect(toggleInline(`${full}y`, { start: 0, end: 1 }, 'bold')).toEqual({ error: 'too_long' });
    expect(toggleLine(`${full}y`, { start: 0, end: 0 }, 'h1')).toEqual({ error: 'too_long' });
    expect(continueList(`- ${'x'.repeat(9_998)}`, 10_000)).toEqual({ error: 'too_long' });
    expect(applyLink(full, { start: 0, end: 1 }, null, { text: 'x', href: 'https://a.in' })).toEqual({
      error: 'too_long',
    });
  });

  it('allows what still fits, and anything that takes markers off', () => {
    expect(toggleInline(`${'x'.repeat(9_990)} y`, { start: 9_991, end: 9_992 }, 'bold')).not.toHaveProperty(
      'error',
    );
    const bold = `**${'x'.repeat(9_996)}**`;
    expect(toggleInline(bold, { start: 2, end: 9_998 }, 'bold')).not.toHaveProperty('error');
  });

  it('counts an emoji as one character, as the database does', () => {
    const emoji = '🌴'.repeat(9_996); // 19,992 UTF-16 units, 9,996 characters
    expect(toggleInline(emoji, { start: 0, end: 2 }, 'bold')).not.toHaveProperty('error');
  });
});

describe('links', () => {
  it('only http(s) addresses with a host, brackets encoded so the link stays whole', () => {
    expect(cleanHref(' https://goa.example.in/a ')).toBe('https://goa.example.in/a');
    expect(cleanHref('https://en.wikipedia.org/wiki/Goa_(state)')).toBe(
      'https://en.wikipedia.org/wiki/Goa_%28state%29',
    );
    for (const bad of [
      '',
      'goa.in',
      'javascript:alert(1)',
      'data:text/html,x',
      '/about',
      'http://localhost',
      'https://a b.in',
    ]) {
      expect(cleanHref(bad)).toBeNull();
    }
  });

  it('wraps the selection as [text](url) and puts the cursor after it', () => {
    const { body, selection } = marked('See {the map} here');
    expect(show(applyLink(body, selection, null, { text: 'the map', href: 'https://goa.example.in' }))).toBe(
      'See [the map](https://goa.example.in)| here',
    );
  });

  it('empty text uses the address; line breaks and square brackets are taken out of the text', () => {
    expect(show(applyLink('', { start: 0, end: 0 }, null, { text: '  ', href: 'https://a.in' }))).toBe(
      '[https://a.in](https://a.in)|',
    );
    expect(show(applyLink('', { start: 0, end: 0 }, null, { text: 'a\n[b]', href: 'https://a.in' }))).toBe(
      '[a b](https://a.in)|',
    );
  });

  it('finds the link around the cursor, with its text, and edits it in place', () => {
    const { body, selection } = marked('Stay at [**Casa** M|ar](https://casa.example.in) now');
    const link = linkAt(body, selection);
    expect(link).toEqual({
      from: 8,
      to: 47,
      text: '**Casa** Mar',
      href: 'https://casa.example.in',
      bracketed: true,
    });
    expect(
      show(applyLink(body, selection, link, { text: 'Casa Mar', href: 'https://casa.example.in/b' })),
    ).toBe('Stay at [Casa Mar](https://casa.example.in/b)| now');
  });

  it('"Remove link" keeps the text and its formatting', () => {
    const { body, selection } = marked('Stay at [**Casa**|](https://casa.example.in)');
    const link = linkAt(body, selection);
    expect(link).not.toBeNull();
    if (link) expect(show(removeLink(body, link))).toBe('Stay at {**Casa**}');
  });

  it('a pasted address is a link too, but not a bracketed one', () => {
    const { body, selection } = marked('Go to https://goa.exa|mple.in');
    expect(linkAt(body, selection)).toMatchObject({ href: 'https://goa.example.in', bracketed: false });
    expect(linkAt('no link |here', { start: 8, end: 8 })).toBeNull();
  });
});
