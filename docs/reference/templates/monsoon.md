# Monsoon design reference

Design source: claude.ai artifact "OnQuest · Monsoon Quest template" (https://claude.ai/artifact/2H4WTEdxhoPzZFFxTydyX9), version 1795462002-3028, copied 25 Nov 2026.

The design file uses the **same shared player as `roadtrip.html`**: the base CSS, the helpers (`rng`, `svgBg`, `grain`, `cloud`, `st`, `polaroid`, `stamp`), `photoPage()`, `route()` and the player code are all identical. Only the parts below differ. Build it like `templates/roadtrip` / `templates/winter`.

## Cover differences (`single:true`, `cs:false`)

- There is one cover polaroid, with no side polaroids: `polaroid(pages[0].photos[0], 14, 47, 60, .95, -2, .1, T[0], 'Welcome to {destination}')`.
- The stamp is `stamp(70, 88, 24, '☔', destination)`.
- There is no cover sticker.
- The cover background is `bg('storm', 1)`, a special variant (see below).

## Fonts and theme CSS

Google fonts: Montserrat 300/500/800, Caveat 500/700, Nunito 400/700/800.

```css
:root{--paper:#0F3A63;--ink:#0F3A63;--accent:#2468AB;--accent2:#F29B1E;--font-display:'Montserrat',sans-serif;--lt-kick:#BFE6FF;--lt-title:#FFFFFF}
body{background:linear-gradient(#0F3A63,#2468AB 55%,#BFE6F8)}
.kicker{font:500 3.8cqw/1 var(--font-display);letter-spacing:.42em;text-transform:uppercase;color:var(--accent2);margin:0}
.title{margin:0;font:800 11.5cqw/1.02 var(--font-display);letter-spacing:.01em;text-transform:uppercase;color:var(--ink);text-wrap:balance}
.pageTitle{margin:0;font:800 6.2cqw/1.1 var(--font-display);text-transform:uppercase;color:var(--ink)}
.meta{letter-spacing:.2em}
```

## SVG defs (besides the shared paper and glare)

```html
<linearGradient id="mStorm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3560"/><stop offset="1" stop-color="#0A2748"/></linearGradient>
<linearGradient id="mLush" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#215E49"/><stop offset="1" stop-color="#12392C"/></linearGradient>
<linearGradient id="mSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE6F8"/><stop offset="1" stop-color="#EAF6FC"/></linearGradient>
<linearGradient id="mMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D5E6EA"/><stop offset="1" stop-color="#9CC3CF"/></linearGradient>
<filter id="cut" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".38"/></filter>
```

## Theme helpers

```js
const band=(y,amp,fill,top,off=0)=>top?`<path filter="url(#cut)" d="M-60 ${y}Q${-20+off} ${y-amp} ${30+off} ${y}T${190+off} ${y}T${290+off} ${y}T${390+off} ${y}T${490+off} ${y}V-20H-60Z" fill="${fill}"/>`:`<path filter="url(#cut)" d="M-60 ${y}Q${-20+off} ${y-amp} ${30+off} ${y}T${190+off} ${y}T${290+off} ${y}T${390+off} ${y}T${490+off} ${y}V670H-60Z" fill="${fill}"/>`;
const drop=(x,y,s,c='#6CC4F2',op=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 -9C5 -2 7 2 7 5A7 7 0 0 1 -7 5C-7 2 -5 -2 0 -9z" fill="${c}" opacity="${op}"/>`;
const rain=(n,seed,c='#fff',op=.3)=>{const r=rng(seed*13+4);return `<g class="fall" stroke="${c}" stroke-width="1.6" stroke-linecap="round" opacity="${op}">${Array.from({length:n},()=>{const x=r()*400,y=r()*620;return `<path d="M${x.toFixed(0)} ${y.toFixed(0)}l-6 22"/>`}).join('')}</g>`};
const drops=(n,seed,c='#6CC4F2')=>{const r=rng(seed*17+2);return Array.from({length:n},()=>drop((r()*370+10).toFixed(0),(r()*560+60).toFixed(0),.7+r()*.8,c,.9)).join('')};
const bolt=(x,y,s)=>`<path filter="url(#cut)" transform="translate(${x} ${y}) scale(${s})" d="M12 0L-8 34H4L-6 66L22 24H8L18 0z" fill="#F8C21B"/>`;
const umbrellaSvg=(x,y,s,c,r=0)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-34 0A34 34 0 0 1 34 0Q24 -6 17 0Q10 -6 0 0Q-10 -6 -17 0Q-24 -6 -34 0z" fill="${c}" stroke="#fff" stroke-width="3"/><path d="M0 0V34Q0 42 8 42" stroke="#444" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
const leaf=(x,y,s,r,c)=>`<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 -20C16 -10 16 10 0 20C-16 10 -16 -10 0 -20z" fill="${c}"/>`;
```

## THEME

```js
cs:false, single:true, kinds:['storm','lush','sky','umbrella','storm'], light:['storm','lush'], stampBig:'☔', ink:'#0F3A63', pin:'#F29B1E',
trip.title:'Monsoon<br>Diaries' (default title), tapes:['rgba(108,196,242,.75)','rgba(242,155,30,.65)','rgba(255,255,255,.8)'],
routeKicker:'the way', routeTitle:'Rainy route'
```

Stickers (in order):
```js
st(x,y,s,r,'-12 -14 24 30','<path d="M0 -12C6 -3 9 2 9 6A9 9 0 0 1 -9 6C-9 2 -6 -3 0 -12z" fill="#6CC4F2" stroke="#fff" stroke-width="2.4"/>')
st(x,y,s,r,'0 0 100 60','<path d="M24 52a16 16 0 0 1 2-32 22 22 0 0 1 42-4 18 18 0 0 1 8 36z" fill="#4AA3E8" stroke="#fff" stroke-width="3"/>')
st(x,y,s,r,'-40 -4 80 56','<path d="M-34 0A34 34 0 0 1 34 0Q24 -6 17 0Q10 -6 0 0Q-10 -6 -17 0Q-24 -6 -34 0z" fill="#F29B1E" stroke="#fff" stroke-width="3"/><path d="M0 0V34Q0 42 8 42" stroke="#444" stroke-width="3" fill="none" stroke-linecap="round"/>')
st(x,y,s,r,'0 0 40 70','<path d="M22 4L4 38H16L8 66L34 26H20L30 4z" fill="#F8C21B" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>')
st(x,y,s,r,'-24 -24 48 48','<path d="M0 -20C16 -10 16 10 0 20C-16 10 -16 -10 0 -20z" fill="#58A55E" stroke="#fff" stroke-width="3"/><path d="M0 -16V16" stroke="#fff" stroke-width="2"/>')
```

Backgrounds `bg(k, seed)`:
```js
if(k==='storm'&&seed===1) /* cover */ `<rect width="390" height="650" fill="url(#mStorm)"/>${grain(.1)}${band(70,20,'#2468AB',true,-20)}${band(44,18,'#6CC4F2',true,10)}${cloud(300,250,2.2,'#4AA3E8',1,'filter="url(#cut)"')}${bolt(292,262,1.15)}${drops(6,seed)}${band(626,18,'#12457A',false,10)}`
if(k==='storm') `<rect width="390" height="650" fill="url(#mStorm)"/>${grain(.1)}${band(140,24,'#17497F',true,seed*6)}${band(112,24,'#2468AB',true,-30)}${band(84,24,'#3A8FD0',true,20)}${band(54,22,'#6CC4F2',true,-10)}<g class="drift">${cloud(100,300,1.5,'#2468AB',1,'filter="url(#cut)"')}${cloud(330,420,1.7,'#2468AB',1,'filter="url(#cut)"')}${cloud(40,470,1.1,'#1B5A99',1,'filter="url(#cut)"')}</g>${cloud(250,250,2.5,'#4AA3E8',1,'filter="url(#cut)"')}${bolt(238,282,1.5)}${drops(16,seed)}${band(612,22,'#12457A',false,10)}${band(634,20,'#0C3560',false,-20)}`
if(k==='lush') `<rect width="390" height="650" fill="url(#mLush)"/>${grain(.1)}${rain(40,seed)}${band(120,22,'#2F7A5B',true,10)}${band(94,22,'#4C9A62',true,-20)}${band(520,28,'#3F9A5C',false,10)}${band(560,26,'#2E8456',false,-30)}${band(596,24,'#256F4A',false,20)}${band(630,20,'#1B5A45',false,-10)}${leaf(60,480,1.4,-30,'#6DBB6E')}${leaf(330,500,1.2,25,'#6DBB6E')}${leaf(200,520,.9,-8,'#4C9A62')}`
if(k==='sky') `<rect width="390" height="650" fill="url(#mSky)"/>${grain(.1)}<g class="drift">${cloud(90,170,2,'#fff',1,'filter="url(#cut)"')}${cloud(300,250,1.6,'#fff',1,'filter="url(#cut)"')}</g>${drops(14,seed,'#4EA5DE')}${band(540,26,'#79C3EC',false,10)}${band(572,24,'#4EA5DE',false,-30)}${band(602,22,'#2F86C8',false,20)}${band(632,20,'#1E67A8',false,-10)}`
/* umbrella (default) */ `<rect width="390" height="650" fill="url(#mMist)"/>${grain(.1)}${rain(36,seed,'#4EA5DE',.45)}${umbrellaSvg(80,190,1.1,'#F29B1E',-12)}${umbrellaSvg(310,150,.9,'#E5532D',14)}${umbrellaSvg(250,330,.8,'#2F86C8',-6)}${band(590,22,'#6F8F9B',false,0)}<g fill="none" stroke="#fff" opacity=".6" stroke-width="2"><ellipse cx="90" cy="626" rx="20" ry="5"/><ellipse cx="90" cy="626" rx="34" ry="9"/><ellipse cx="300" cy="620" rx="18" ry="4.5"/><ellipse cx="300" cy="620" rx="30" ry="8"/></g>`
```

The demo trip in the design uses Munnar (Kochi → Munnar → Thekkady → Alleppey). Its photo scenes are placeholders; real trips use real photos.
