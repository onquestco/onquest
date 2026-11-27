import { describe, expect, it } from 'vitest';
import { nextButton, oneAtATime } from './nextButton';

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

describe('oneAtATime', () => {
  function deferred() {
    let resolve: (value: boolean) => void = () => undefined;
    const promise = new Promise<boolean>((done) => (resolve = done));
    return { promise, resolve };
  }

  it('ignores taps while the first one is running', async () => {
    const pending = deferred();
    let calls = 0;
    const run = oneAtATime(() => {
      calls += 1;
      return pending.promise;
    });
    const first = run();
    expect(await run()).toBe('ignored');
    expect(await run()).toBe('ignored');
    pending.resolve(true);
    expect(await first).toBe(true);
    expect(calls).toBe(1);
  });

  it('stays locked after it succeeds', async () => {
    let calls = 0;
    const run = oneAtATime(async () => {
      calls += 1;
      return true;
    });
    await run();
    expect(await run()).toBe('ignored');
    expect(calls).toBe(1);
  });

  it('can be tapped again after it fails or throws', async () => {
    let calls = 0;
    const run = oneAtATime(async () => {
      calls += 1;
      if (calls === 1) return false;
      if (calls === 2) throw new Error('offline');
      return true;
    });
    expect(await run()).toBe(false);
    expect(await run()).toBe(false);
    expect(await run()).toBe(true);
    expect(calls).toBe(3);
  });
});
