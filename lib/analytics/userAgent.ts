import { PLATFORM_CODE } from './codes';

// os, browser and platform from the user agent, the same on /ingest and trackServer
// (common.csv; spec D4). Only the sheet's values: anything unrecognised is "other".

export type Os = 'android' | 'ios' | 'windows' | 'mac' | 'other';
export type Browser = 'chrome' | 'safari' | 'instagram_in_app' | 'whatsapp_in_app' | 'other';

export function osFor(userAgent: string): Os {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/windows/i.test(userAgent)) return 'windows';
  if (/macintosh|mac os x/i.test(userAgent)) return 'mac';
  return 'other';
}

export function browserFor(userAgent: string): Browser {
  // In-app browsers first: they also carry Chrome / Safari tokens.
  if (/instagram/i.test(userAgent)) return 'instagram_in_app';
  if (/whatsapp/i.test(userAgent)) return 'whatsapp_in_app';
  if (/edg\/|edga\/|edgios\/|opr\/|samsungbrowser|firefox|fxios|yabrowser|ucbrowser/i.test(userAgent)) {
    return 'other';
  }
  if (/chrome\/|crios\/|chromium\//i.test(userAgent)) return 'chrome';
  if (/safari\//i.test(userAgent) && !/android/i.test(userAgent)) return 'safari';
  return 'other';
}

/** For server events without the analytics cookie: "Mobi" in the user agent is mobile. */
export function platformFor(userAgent: string): (typeof PLATFORM_CODE)[keyof typeof PLATFORM_CODE] {
  return /mobi/i.test(userAgent) ? PLATFORM_CODE.mobile : PLATFORM_CODE.desktop;
}
