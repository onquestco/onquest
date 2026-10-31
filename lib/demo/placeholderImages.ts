// Illustrated placeholder "photos" for the demo trip, ported from the Goa reference.
// Demo-only: real trips use uploaded photos.

export type Scene = 'palm' | 'street' | 'church' | 'bonfire' | 'cove' | 'beach' | 'face';

const SKIES = [
  ['#f9d9a8', '#f4a77a', '#2aa3a8', '#e8d9bd'],
  ['#bfe6ee', '#fff6e2', '#1c9aa6', '#f1e3c6'],
  ['#ffb88a', '#f26d5b', '#1f6f86', '#e6cfa6'],
  ['#cfe3ea', '#e9f1ee', '#5aa7ad', '#e8dcc3'],
  ['#ffd89b', '#f6a86b', '#177e89', '#ecd9b0'],
  ['#9bd3f0', '#e8f6fb', '#1c9aa6', '#f3e4c3'],
] as const;
const HOUSE_COLOURS = ['#F2B84B', '#E8704F', '#4FA3C7', '#F2A0B5', '#8CC084', '#F6E27F'];

const gradients = (top = '#fff', bottom = '#fff') =>
  `<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${top}'/><stop offset='1' stop-color='${bottom}'/></linearGradient><radialGradient id='g'><stop offset='0' stop-color='#ffd27a'/><stop offset='1' stop-color='#ff7a2f' stop-opacity='0'/></radialGradient></defs>`;

const palmTree = (x: number, y: number, scale: number) =>
  `<g transform='translate(${x} ${y}) scale(${scale})'><path d='M0 0Q10-140 30-260' stroke='#0f2f3a' stroke-width='14' fill='none'/><path d='M30-260Q-40-290-110-240M30-260Q-10-340-90-340M30-260Q60-340 140-320M30-260Q110-270 160-200M30-260Q20-320 40-370' stroke='#0f2f3a' stroke-width='10' fill='none' stroke-linecap='round'/></g>`;

function palm() {
  return `${gradients()}<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#27506a'/><stop offset='.55' stop-color='#f28c70'/><stop offset='1' stop-color='#ffc46b'/></linearGradient></defs><rect width='600' height='750' fill='url(#s)'/><circle cx='350' cy='430' r='170' fill='url(#g)'/><circle cx='350' cy='430' r='62' fill='#ffe3a0'/><rect y='470' width='600' height='140' fill='#123b47' opacity='.8'/><path d='M0 600Q300 560 600 610V750H0Z' fill='#0b2630'/>${palmTree(110, 690, 1.35)}${palmTree(500, 700, 0.8)}`;
}

function street(hash: number) {
  let left = '';
  let right = '';
  for (let i = 0; i < 5; i++) {
    const colour = HOUSE_COLOURS[(hash + i) % 6];
    const colour2 = HOUSE_COLOURS[(hash + i + 2) % 6];
    const width = 70 + i * 14;
    const x = i * 34;
    const top = 120 + i * 40 - i * i * 2;
    const rx = 600 - x - width;
    left += `<rect x='${x}' y='${top}' width='${width}' height='${640 - top}' fill='${colour}'/><rect x='${x + 14}' y='${top + 40}' width='22' height='34' fill='#fff' opacity='.85'/><rect x='${x + 14}' y='${top + 110}' width='22' height='34' fill='#fff' opacity='.85'/><rect x='${x}' y='${top - 10}' width='${width}' height='12' fill='#fff' opacity='.8'/>`;
    right += `<rect x='${rx}' y='${top + 20}' width='${width}' height='${620 - top}' fill='${colour2}'/><rect x='${rx + width - 38}' y='${top + 60}' width='22' height='34' fill='#fff' opacity='.85'/><rect x='${rx + width - 38}' y='${top + 130}' width='22' height='34' fill='#fff' opacity='.85'/><rect x='${rx}' y='${top + 10}' width='${width}' height='12' fill='#fff' opacity='.8'/>`;
  }
  return `${gradients('#bfe6ee', '#fff6e2')}<rect width='600' height='750' fill='url(#a)'/>${left}${right}<path d='M170 330L430 330L600 750L0 750Z' fill='#d9c9a8'/><path d='M300 340L310 750' stroke='#fff' stroke-width='6' stroke-dasharray='20 24' opacity='.7'/>`;
}

function church() {
  const flowers = Array.from(
    { length: 14 },
    (_, i) =>
      `<circle cx='${30 + i * 42}' cy='${640 + (i % 3) * 30}' r='9' fill='#fff'/><circle cx='${30 + i * 42}' cy='${640 + (i % 3) * 30}' r='3.5' fill='#f6c445'/>`,
  ).join('');
  return `${gradients('#8fd0f2', '#eaf7fc')}<rect width='600' height='750' fill='url(#a)'/><path d='M0 520Q200 440 380 500T600 470V750H0Z' fill='#7fb26a'/><rect x='170' y='300' width='260' height='260' fill='#fff'/><rect x='250' y='190' width='100' height='120' fill='#fff'/><path d='M240 190L300 120L360 190Z' fill='#e8704f'/><path d='M300 70v50M280 90h40' stroke='#e8704f' stroke-width='8'/><path d='M270 560V440Q300 400 330 440V560Z' fill='#2a6f86'/><rect x='195' y='340' width='40' height='70' rx='20' fill='#2a6f86'/><rect x='365' y='340' width='40' height='70' rx='20' fill='#2a6f86'/><path d='M150 560H450L480 600H120Z' fill='#e6e0d0'/>${flowers}`;
}

function bonfire() {
  const people = [110, 190, 420, 500]
    .map((x, i) => {
      const dy = (i % 2) * 20;
      return `<g fill='#0b0f18'><circle cx='${x}' cy='${560 + dy}' r='20'/><path d='M${x - 28} ${650 + dy}Q${x - 30} ${590 + dy} ${x} ${584 + dy}Q${x + 30} ${590 + dy} ${x + 28} ${650 + dy}Z'/></g>`;
    })
    .join('');
  return `<defs><linearGradient id='n' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#14283a'/><stop offset='1' stop-color='#5a3a4a'/></linearGradient><radialGradient id='f'><stop offset='0' stop-color='#ffd27a'/><stop offset='.5' stop-color='#ff8a3a' stop-opacity='.7'/><stop offset='1' stop-color='#ff7a2f' stop-opacity='0'/></radialGradient></defs><rect width='600' height='750' fill='url(#n)'/><circle cx='480' cy='140' r='34' fill='#fff6d8' opacity='.9'/><rect y='430' width='600' height='120' fill='#1c4a5a'/><path d='M0 520Q300 490 600 520V750H0Z' fill='#2a1d1a'/><circle cx='300' cy='590' r='230' fill='url(#f)'/><path d='M300 640Q270 590 290 540Q300 570 320 550Q335 590 300 640Z' fill='#ffb347'/><path d='M300 640Q285 605 298 575Q310 600 318 598Q320 620 300 640Z' fill='#fff1b0'/>${people}`;
}

function cove(hash: number, sky: readonly string[]) {
  const sunX = 120 + ((hash >> 3) % 360);
  const sunY = 130 + ((hash >> 5) % 110);
  return `${gradients(sky[0], sky[1])}<rect width='600' height='750' fill='url(#a)'/><circle cx='${sunX + 200}' cy='${sunY}' r='70' fill='#fff' opacity='.85'/><rect y='360' width='600' height='260' fill='#27b3b6'/><path d='M0 420Q150 400 300 420T600 420M0 480Q150 460 300 480T600 480' stroke='#fff' stroke-opacity='.45' stroke-width='4' fill='none'/><path d='M0 330Q80 300 150 360L170 640H0Z' fill='#b3573a'/><path d='M40 360Q110 330 160 400L180 640H60Z' fill='#8e3f2b'/><path d='M600 380Q520 330 460 430L440 640H600Z' fill='#b3573a'/><path d='M0 620Q300 560 600 620V750H0Z' fill='${sky[3]}'/>`;
}

function beach(hash: number, sky: readonly string[]) {
  const sunX = 120 + ((hash >> 3) % 360);
  const sunY = 130 + ((hash >> 5) % 110);
  const hill = hash % 200;
  return `${gradients(sky[0], sky[1])}<rect width='600' height='750' fill='url(#a)'/><circle cx='${sunX + 120}' cy='${sunY}' r='150' fill='#fff' opacity='.18'/><circle cx='${sunX + 120}' cy='${sunY}' r='72' fill='#fff' opacity='.9'/><path d='M0 440Q${hill + 120} 360 ${hill + 330} 430T600 420V480H0Z' fill='#123B47' opacity='.3'/><rect y='440' width='600' height='200' fill='${sky[2]}'/><rect y='440' width='600' height='200' fill='#123B47' opacity='.18'/><path d='M0 520Q150 500 300 520T600 520M0 570Q150 550 300 570T600 570' stroke='#fff' stroke-opacity='.4' stroke-width='4' fill='none'/><path d='M0 620Q250 560 600 610V750H0Z' fill='${sky[3]}'/>${hash % 3 === 0 ? palmTree(520, 740, 0.9) : ''}`;
}

const FACE = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><rect width='300' height='300' fill='#f6c9a8'/><circle cx='150' cy='120' r='62' fill='#c98a62'/><path d='M80 110Q150 20 220 110Q200 60 150 60Q100 60 80 110Z' fill='#2b1b17'/><path d='M40 300Q60 190 150 190T260 300Z' fill='#177E89'/></svg>`;

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A deterministic illustrated placeholder for a scene + variant number. */
export function placeholderImage(scene: Scene, variant: number): string {
  if (scene === 'face') return toDataUri(FACE);

  let hash = 0;
  for (const char of `${scene}${variant}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const sky = SKIES[hash % SKIES.length]!;

  const scenes: Record<Exclude<Scene, 'face'>, () => string> = {
    palm: () => palm(),
    street: () => street(hash),
    church: () => church(),
    bonfire: () => bonfire(),
    cove: () => cove(hash, sky),
    beach: () => beach(hash, sky),
  };

  return toDataUri(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 750' preserveAspectRatio='xMidYMid slice'>${scenes[scene]()}</svg>`,
  );
}
