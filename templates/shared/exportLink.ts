/** "onquest.in/@riya/goa-trip": the Quest's link as it's printed on Instagram images. */
export function shownLink(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
}
