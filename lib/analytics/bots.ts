// Link-preview bots and crawlers never run our JavaScript, so they never send events; this is the
// second guard for headless browsers and the few that do (spec B §3.6).

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|preview|headless|lighthouse|pagespeed/i;

export function isBot(userAgent: string, webdriver: boolean): boolean {
  return webdriver || BOT_PATTERN.test(userAgent);
}
