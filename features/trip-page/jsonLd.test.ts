import { describe, expect, it } from 'vitest';
import { goaTrip } from '@/lib/demo/goaTrip';
import { serializeJsonLd, tripJsonLd } from './jsonLd';

describe('tripJsonLd', () => {
  const data = tripJsonLd(goaTrip);

  it('describes the trip as a blog post by the traveler', () => {
    expect(data['@type']).toBe('BlogPosting');
    expect(data.headline).toBe(goaTrip.title);
    expect(data.author.name).toBe('Alex Morgan');
  });

  it('lists every place in order', () => {
    const items = data.about.itinerary.itemListElement;
    expect(items).toHaveLength(goaTrip.places.length);
    expect(items[0]).toMatchObject({ position: 1, item: { name: 'Panjim' } });
  });

  it('leaves out non-http images such as demo data URIs', () => {
    expect(data.image).toBeUndefined();
  });
});

describe('serializeJsonLd', () => {
  it('cannot be broken out of with a closing script tag', () => {
    const json = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json).headline).toBe('</script><script>alert(1)</script>');
  });
});
