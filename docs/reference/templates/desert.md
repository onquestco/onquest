# Desert design reference

Design source: claude.ai artifact "OnQuest · Desert Quest template" (https://claude.ai/artifact/92ZUhdmomd6QfpHTUzhDSS), version 1795461841-e299, copied 25 Nov 2026.

The design file uses the **same shared player as `roadtrip.html`**: the base CSS, the helpers (`rng`, `svgBg`, `grain`, `stars`, `st`, `polaroid`, `stamp`), `cover()` (three polaroids plus a cover sticker, as in Roadtrip), `photoPage()`, `route()` and the player code are all identical. Only the parts below differ. Build it like `templates/roadtrip` / `templates/winter`. There is no `cut` filter; the only live filter is the paper grain (bake it) plus the `glare` gradient.

## Fonts and theme CSS

Google fonts: Poppins 600/700, Caveat 500/700, Nunito 400/700/800.

```css
:root{--paper:#EAD7AC;--ink:#6B3F26;--accent:#A5663F;--accent2:#B4532A;--font-display:'Poppins',sans-serif;--lt-kick:#F6C99B;--lt-title:#FFF3D6}
body{background:linear-gradient(#EAD7AC,#F2E6C6 55%,#D8A67A)}
.kicker{font:600 3.8cqw/1 var(--font-display);letter-spacing:.3em;text-transform:uppercase;color:var(--accent2);margin:0}
.title{margin:0;font:700 12cqw/1.04 var(--font-display);color:#8A4E2C;text-wrap:balance}
.pageTitle{margin:0;font:700 7.4cqw/1.1 var(--font-display);color:#8A4E2C}
.stamp{background:rgba(250,240,214,.85)}
```

## SVG defs (besides the shared paper and glare)

```html
<linearGradient id="dSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE6A8"/><stop offset="1" stop-color="#F6BE72"/></linearGradient>
<linearGradient id="dDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3D5BC"/><stop offset="1" stop-color="#DE9577"/></linearGradient>
<linearGradient id="dNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171F4F"/><stop offset=".6" stop-color="#3A3F7A"/><stop offset="1" stop-color="#6C5A8C"/></linearGradient>
```

## Theme helpers

```js
const dune=(y,amp,fill,o=0)=>`<path d="M-10 ${y}C${60+o} ${y-amp},${140+o} ${y-amp},${210+o} ${y}S340 ${y+amp*.3} 400 ${y-amp*.6}V650H-10Z" fill="${fill}"/>`;
const sparkle=(x,y,s,c='#8A4E2C',op=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 -12Q2 -2 12 0Q2 2 0 12Q-2 2 -12 0Q-2 -2 0 -12z" fill="${c}" opacity="${op}"/>`;
const moon=(x,y,s,c='#7A4A2E')=>`<path transform="translate(${x} ${y}) scale(${s})" d="M10 -20A22 22 0 1 0 10 20A17 17 0 1 1 10 -20z" fill="${c}"/>`;
const palm=(x,y,s,trunk='#3b2a1a',leaf='#2F3B22')=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0C4 -40 2 -70 8 -104" stroke="${trunk}" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="${leaf}" transform="translate(8 -104)"><path d="M0 0C-16 -18 -38 -16 -52 -2C-34 -6 -16 -6 0 0z"/><path d="M0 0C16 -18 38 -16 52 -2C34 -6 16 -6 0 0z"/><path d="M0 0C-8 -26 2 -40 20 -44C12 -30 8 -16 0 0z"/><path d="M0 0C-24 -4 -40 8 -44 24C-28 12 -14 8 0 0z"/><path d="M0 0C22 -4 38 8 42 24C26 12 12 8 0 0z"/></g></g>`;
const camel=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><path d="M-22 -14C-16 -26 -8 -26 -2 -14C4 -24 10 -22 12 -12L20 -26L24 -24L18 -8C20 0 16 6 14 6V22H10V8H-4V22H-8V8H-16V22H-20V4C-24 0 -24 -8 -22 -14z"/></g>`;
const cactus=(x,y,s,c)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="${c}"><rect x="-4" y="-40" width="8" height="40" rx="4"/><path d="M-4 -18H-12A4 4 0 0 1 -16 -22V-30H-12V-22H-4zM4 -24H12A4 4 0 0 0 16 -28V-36H12V-28H4z"/></g>`;
```

## THEME

```js
cs:[1,76,5,14], kinds:['dunes','sun','dusk','night','dunes'], light:['night'], stampBig:'☾', ink:'#6B3F26', pin:'#B4532A',
trip.title:'Into the<br>Dunes' (default title), tapes:['rgba(217,170,120,.85)','rgba(180,83,42,.5)','rgba(250,240,214,.85)'],
routeKicker:'the trail', routeTitle:'Across the sand'
```
The cover sticker is `cs` = sticker 1 (sparkle) at x 76, y 5, size 14.

Stickers (in order):
```js
st(x,y,s,r,'-24 -24 48 48','<path d="M10 -20A22 22 0 1 0 10 20A17 17 0 1 1 10 -20z" fill="#7A4A2E" stroke="#FFF3D6" stroke-width="3.5" stroke-linejoin="round"/>')
st(x,y,s,r,'-16 -16 32 32','<path d="M0 -12Q2 -2 12 0Q2 2 0 12Q-2 2 -12 0Q-2 -2 0 -12z" fill="#B4532A" stroke="#FFF3D6" stroke-width="2.4" stroke-linejoin="round"/>')
st(x,y,s,r,'-60 -120 120 130',`<path d="M0 0C4 -40 2 -70 8 -104" stroke="#5a3d22" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#3F7D45" stroke="#FFF3D6" stroke-width="3" stroke-linejoin="round" transform="translate(8 -104)"><path d="M0 0C-16 -18 -38 -16 -52 -2C-34 -6 -16 -6 0 0z"/><path d="M0 0C16 -18 38 -16 52 -2C34 -6 16 -6 0 0z"/><path d="M0 0C-8 -26 2 -40 20 -44C12 -30 8 -16 0 0z"/></g>`)
st(x,y,s,r,'-20 -44 40 48','<g fill="#5E8C4A" stroke="#FFF3D6" stroke-width="3" stroke-linejoin="round"><rect x="-5" y="-40" width="10" height="40" rx="5"/><path d="M-5 -18H-12A4 4 0 0 1 -16 -22V-30H-10V-24H-5zM5 -24H12A4 4 0 0 0 16 -28V-36H10V-30H5z"/></g>')
/* sun: */ '<g stroke="#FFF3D6" stroke-width="3" fill="#F28C3B"><circle r="18"/></g><g stroke="#F6B25C" stroke-width="4" stroke-linecap="round">' + 8 rays k=0..7, a=k*PI/4: `M cos(a)*24 sin(a)*24 L cos(a)*33 sin(a)*33` (toFixed(1)) + '</g>', viewBox '-40 -40 80 80'
```

Backgrounds `bg(k, seed)`:
```js
dunes: `<rect width="390" height="650" fill="#EAD7AC"/>${grain(.3)}${moon(332,150,1.3)}${sparkle(320,330,1.4)}${sparkle(350,370,.9)}${sparkle(60,420,.8)}${dune(560,70,'#D3A57C',40)}${dune(595,60,'#B9784F',-30)}${dune(630,40,'#CB9A72',10)}${palm(46,625,.95)}`
sun: `<rect width="390" height="650" fill="url(#dSun)"/>${grain(.25)}<circle cx="280" cy="330" r="130" fill="none" stroke="#F6B25C" stroke-width="2" opacity=".5"/><circle cx="280" cy="330" r="100" fill="none" stroke="#F6B25C" stroke-width="2" opacity=".6"/><circle cx="280" cy="330" r="70" fill="#F28C3B"/>${sparkle(60,200,1.2)}${sparkle(90,250,.7)}${sparkle(340,150,1)}${dune(540,80,'#F2C277',30)}${dune(585,70,'#E5A458',-20)}${dune(628,50,'#C97F45',10)}`
dusk: `<rect width="390" height="650" fill="url(#dDusk)"/>${grain(.25)}<circle cx="110" cy="450" r="150" fill="url(#glare)" opacity=".55"/><circle cx="110" cy="450" r="34" fill="#FFE2B0"/>${sparkle(300,180,1.2,'#8A4E2C',.8)}${sparkle(340,230,.7,'#8A4E2C',.8)}${dune(540,70,'#C77C62',20)}${[[70,528,.9],[110,526,.9],[150,530,.9]].map(([x,y,s])=>camel(x,y,s,'#5a3030')).join('')}${dune(590,60,'#A85C4A',-20)}${cactus(320,580,1.1,'#5E3030')}${dune(634,40,'#7E3F3A',10)}`
night (default): `<rect width="390" height="650" fill="url(#dNight)"/>${grain(.12)}${stars(70,seed,360)}<circle cx="200" cy="36" r="50" fill="url(#glare)" opacity=".4"/>${moon(200,36,1.05,'#FFF3C4')}${sparkle(60,200,1.2,'#FFF3D6')}${sparkle(100,260,.7,'#FFF3D6')}${sparkle(350,300,.9,'#FFF3D6')}${dune(560,70,'#3B3F7A',40)}${dune(600,60,'#2A2E62',-30)}${dune(636,40,'#1B2048',10)}${palm(330,632,.9,'#12163a','#12163a')}`
```

The demo trip in the design uses Jaisalmer (Jodhpur → Pokaran → Jaisalmer → Sam Dunes). Its photo scenes are placeholders; real trips use real photos.
