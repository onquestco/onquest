import { describe, expect, it } from 'vitest';
import { browserFor, osFor, platformFor } from './userAgent';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101';
const WHATSAPP_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 WhatsApp/2.24';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';

describe('userAgent', () => {
  it('finds the os', () => {
    expect(osFor(IPHONE_SAFARI)).toBe('ios');
    expect(osFor(ANDROID_CHROME)).toBe('android');
    expect(osFor(WINDOWS_EDGE)).toBe('windows');
    expect(osFor(MAC_SAFARI)).toBe('mac');
    expect(osFor('curl/8.4')).toBe('other');
    expect(osFor('')).toBe('other');
  });

  it('finds the browser, in-app browsers first', () => {
    expect(browserFor(IPHONE_SAFARI)).toBe('safari');
    expect(browserFor(MAC_SAFARI)).toBe('safari');
    expect(browserFor(ANDROID_CHROME)).toBe('chrome');
    expect(browserFor(MAC_CHROME)).toBe('chrome');
    expect(browserFor(INSTAGRAM)).toBe('instagram_in_app');
    expect(browserFor(WHATSAPP_ANDROID)).toBe('whatsapp_in_app');
    expect(browserFor(WINDOWS_EDGE)).toBe('other');
    expect(browserFor('')).toBe('other');
  });

  it('platform: Mobi is mobile (0), anything else desktop (1)', () => {
    expect(platformFor(IPHONE_SAFARI)).toBe(0);
    expect(platformFor(ANDROID_CHROME)).toBe(0);
    expect(platformFor(MAC_CHROME)).toBe(1);
    expect(platformFor('')).toBe(1);
  });
});
