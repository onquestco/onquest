import { describe, expect, it } from 'vitest';
import { guideBlocks } from './guideBlocks';

describe('guideBlocks', () => {
  it('splits headings and paragraphs, joining wrapped lines', () => {
    expect(guideBlocks('## Day one\n\nStart in\nPanjim.\n\n<b>Not HTML</b>')).toEqual([
      { kind: 'heading', text: 'Day one' },
      { kind: 'paragraph', text: 'Start in Panjim.' },
      { kind: 'paragraph', text: '<b>Not HTML</b>' },
    ]);
  });
});
