import { describe, expect, it } from 'vitest';
import { nextButton } from './nextButton';

describe('nextButton', () => {
  it('asks for more photos below the minimum', () => {
    expect(nextButton(['done', 'done'], false)).toEqual({
      label: 'Pick at least 3 photos',
      disabled: true,
      loading: false,
    });
  });

  it('shows how many photos are ready while some are still being prepared', () => {
    expect(nextButton(['done', 'processing', 'uploading', 'processing'], false)).toEqual({
      label: 'Preparing photos… 2 of 4',
      disabled: true,
      loading: true,
    });
  });

  it('is a plain Next once every photo is prepared, even while uploads continue', () => {
    expect(nextButton(['done', 'uploading', 'uploading'], false)).toEqual({
      label: 'Next',
      disabled: false,
      loading: false,
    });
  });

  it('counts uploaded photos once Next is tapped', () => {
    expect(nextButton(['done', 'done', 'uploading', 'uploading'], true)).toEqual({
      label: 'Uploading photos… 2 of 4',
      disabled: true,
      loading: true,
    });
  });

  it('says Preparing… after tapping Next when every photo is uploaded', () => {
    expect(nextButton(['done', 'done', 'done'], true).label).toBe('Preparing…');
  });

  it('leaves failed photos out of the counts', () => {
    expect(nextButton(['done', 'failed', 'uploading', 'done'], true).label).toBe(
      'Uploading photos… 2 of 3',
    );
    expect(nextButton(['done', 'failed', 'done', 'done'], true).label).toBe('Preparing…');
  });
});
