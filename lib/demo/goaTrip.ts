import { formatDateRange } from '@/lib/dates';
import { absoluteUrl } from '@/lib/site';
import { formatStats } from '@/lib/trip/stats';
import type { Day, Photo, Place, TripData } from '@/lib/trip/types';
import { placeholderImage, type Scene } from './placeholderImages';

// The Goa sample trip from the reference design, as TripData.
// Used by /demo and as the visual baseline for the Beach template.

const photo = (scene: Scene, variant: number, caption?: string): Photo => {
  const src = placeholderImage(scene, variant);
  return { id: `${scene}-${variant}`, thumb: src, display: src, width: 600, height: 750, caption };
};

const place = (id: string, name: string, lat: number, lng: number, image: Photo, note: string): Place => ({
  id,
  name,
  lat,
  lng,
  photo: image,
  note,
});

const panjim = place(
  'panjim',
  'Panjim',
  15.4909,
  73.8278,
  photo('church', 1),
  'Coffee on a balcony while the city woke up around me. The white church steps were my favourite spot to people-watch.',
);
const fontainhas = place(
  'fontainhas',
  'Fontainhas',
  15.496,
  73.833,
  photo('street', 1),
  'Every wall a different colour and I stopped counting the doors. Come in the morning before the tour groups, wander with no map, and say yes to the small bakery.',
);
const anjuna = place(
  'anjuna',
  'Anjuna Beach',
  15.5736,
  73.7413,
  photo('cove', 1),
  'Red rocks, loud music far away, and one very good prawn curry.',
);
const vagator = place(
  'vagator',
  'Vagator Beach',
  15.6006,
  73.7377,
  photo('beach', 1),
  'We climbed down to the quiet cove and had it almost to ourselves. Walk past the main stretch and find the stairs at the far end. The sandy shoes are worth it.',
);
const chapora = place(
  'chapora',
  'Chapora Fort',
  15.606,
  73.7366,
  photo('palm', 1),
  'The wind was so strong I had to hold my hat the whole way up. Go early, when the ramparts are empty and you can hear the sea.',
);
const morjim = place(
  'morjim',
  'Morjim Beach',
  15.631,
  73.739,
  photo('bonfire', 1),
  'Wide, empty, and full of tiny crabs racing the tide. We stayed for the golden hour and the first bonfire of the night.',
);
const palolem = place(
  'palolem',
  'Palolem Beach',
  15.01,
  74.023,
  photo('beach', 3),
  'A crescent of calm water and a sunrise worth setting an alarm for. If you only go south once, go here and go early, and walk to the quiet end.',
);

const places = [panjim, fontainhas, anjuna, vagator, chapora, morjim, palolem];

const days: Day[] = [
  {
    number: 1,
    title: 'Arrival and Colorful Streets',
    quote: 'Getting lost was the plan.',
    story:
      'The taxi dropped me in Panjim just after noon, sticky and slightly lost. Ten minutes into Fontainhas I didn’t care. I wandered with no plan, ate a bebinca on a doorstep, and let the afternoon go slowly.',
    places: [panjim, fontainhas],
    photos: [
      photo('street', 2, 'Fontainhas, before the light turned gold'),
      photo('church', 2, 'Panjim church steps'),
      photo('street', 3, 'Doorway number whatever'),
    ],
  },
  {
    number: 2,
    title: 'Chasing the Northern Coast',
    quote: 'Two wheels, one hat, no schedule.',
    story:
      'I rented a scooter, which my mother does not need to know about. The road north smelled of frangipani and diesel. Anjuna was loud, Vagator was better, and by evening my feet were the colour of the red cliffs.',
    places: [anjuna, vagator],
    photos: [
      photo('cove', 2, 'Anjuna, mid-morning'),
      photo('beach', 2, 'The quiet cove at Vagator'),
      photo('palm', 2, 'Scooter shadow'),
    ],
  },
  {
    number: 3,
    title: 'Cliffs, Cafés, and Golden Hours',
    quote: 'The best café had no sign.',
    story:
      'Chapora Fort at eight in the morning is a different place: empty, windy, and quiet enough to hear the sea from the ramparts. I spent the afternoon in a café in Morjim doing very little, then walked the beach at golden hour with a cold coconut.',
    places: [chapora, morjim],
    photos: [
      photo('palm', 3, 'Up on the ramparts'),
      photo('bonfire', 2, 'Morjim, golden hour'),
      photo('beach', 4, 'Coconut o’clock'),
    ],
  },
  {
    number: 4,
    title: 'The Road to South Goa',
    quote: 'The long way round was the right way.',
    story:
      'We left early and drove south for nearly three hours, windows down, with a playlist that got worse as it got better. Rice fields, tiny churches, a roadside stop for fresh cashews. Palolem appeared all at once, a curve of calm blue water.',
    places: [palolem],
    photos: [
      photo('beach', 5, 'First look at Palolem'),
      photo('church', 3, 'Tiny church, somewhere on NH66'),
      photo('cove', 3, 'Cashew stop'),
    ],
  },
  {
    number: 5,
    title: 'One Last Sunrise',
    quote: 'I didn’t want to leave.',
    story:
      'I set an alarm for 5:40 and, for once, got up. The beach was empty apart from a few fishermen and one very serious dog. I sat there until the sun cleared the hills, then bought chai from a man who’d been up much longer than me.',
    places: [palolem],
    photos: [
      photo('beach', 6, '5:52 a.m.'),
      photo('cove', 4, 'Fishing boats, still asleep'),
      photo('palm', 4, 'One last look back'),
    ],
  },
];

const startDate = '2026-02-12';
const endDate = '2026-02-16';

export const goaTrip: TripData = {
  id: 'demo-goa',
  templateId: 'beach',
  url: absoluteUrl('/demo'),
  seed: 20260212,
  traveler: { name: 'Alex Morgan', handle: 'alex', avatar: photo('face', 1) },
  title: 'Salt in the Air, Sand in My Hair',
  shortTitle: 'My Goa Trip',
  destination: 'Goa',
  country: 'India',
  startDate,
  endDate,
  dateLabel: formatDateRange(startDate, endDate),
  statsLabel: formatStats({ days: days.length, places: places.length }),
  cover: chapora.photo,
  photos: [...places.map((p) => p.photo!), ...days.flatMap((d) => d.photos)],
  places,
  favourites: [palolem, fontainhas, vagator],
  days,
  note: 'Some trips are about ticking places off a list. This one was about slowing down, taking the longer road, and remembering how beautiful it feels to have nowhere else to be.',
  closingHeadline: 'Nowhere else to be.',
  publishedAt: '2026-02-20T10:00:00+05:30',
  updatedAt: '2026-02-20T10:00:00+05:30',
};
