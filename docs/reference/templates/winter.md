# Winter design reference

Design source: claude.ai artifact "OnQuest · Winter Quest template" (https://claude.ai/artifact/5sGKHMSZhueqDBn7RsWeYP), version 1795461847-f417, copied 25 Nov 2026.

The design file is the **same shared player as `roadtrip.html`**: identical base CSS (stage, polaroid, tape, stamp, sticker, nav, `.light` rules, reduced motion), identical helpers (`rng`, `svgBg`, `grain`, `cloud`, `bird`, `stars`, `ridge`, `st`, `polaroid`, `stamp`) and identical `cover()`, `photoPage()`, `route()` and player code. Only the parts below differ. Build it like `templates/roadtrip`.

## Fonts and theme CSS

Google fonts: Dancing Script 700, Caveat 500/700, Nunito 400/700/800.

```css
:root{--paper:#6DB9DE;--ink:#17426B;--accent:#3B8FC4;--accent2:#D8433A;--font-display:'Dancing Script',cursive;--lt-kick:#E4F6FF;--lt-title:#FFFFFF}
body{background:linear-gradient(#9AD3EE,#E6F4FB 60%,#fff)}
.kicker{font:700 7cqw/1 var(--font-display);color:#E4F6FF;margin:0}
.title{margin:0;font:700 13.5cqw/1 var(--font-display);color:#fff;text-wrap:balance}
.pageTitle{margin:0;font:700 10.5cqw/1.05 var(--font-display);color:#fff}
.stamp{background:rgba(255,255,255,.92)}
```

## SVG defs

```html
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="5"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .40  0 0 0 0 .28  2.2 0 0 0 -1.0"/></filter>
<radialGradient id="glare"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="wSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CC4E6"/><stop offset="1" stop-color="#4FA3D2"/></linearGradient>
<linearGradient id="wDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA7E3"/><stop offset="1" stop-color="#D5DFF7"/></linearGradient>
<linearGradient id="wNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F1F46"/><stop offset="1" stop-color="#2D4A86"/></linearGradient>
<linearGradient id="wAur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071A33"/><stop offset="1" stop-color="#1D4F63"/></linearGradient>
<filter id="blur9" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
```

(The aurora uses a live Gaussian blur: bake it, or pre-blur the two aurora bands into the page's background tile, per the spec's no-live-filter rule.)

## Theme (verbatim)

```js
const flake=(x,y,s,op=1)=>`<g transform="translate(${x} ${y}) scale(${s})" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="${op}">${[0,60,120].map(a=>`<path d="M0 -14V14" transform="rotate(${a})"/>`).join('')}${[0,60,120,180,240,300].map(a=>`<path d="M-3.5 -9L0 -12.5L3.5 -9" fill="none" transform="rotate(${a})"/>`).join('')}</g>`;
const snowfall=(n,seed,op=.8)=>{const r=rng(seed*5+9);return `<g class="fall">${Array.from({length:n},()=>`<circle cx="${(r()*390).toFixed(0)}" cy="${(r()*640).toFixed(0)}" r="${(1.2+r()*2.4).toFixed(1)}" fill="#fff" opacity="${(op*(.4+r()*.6)).toFixed(2)}"/>`).join('')}</g>`};
const snowPine=(x,y,k)=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 -60L18 -34H8L22 -14H10L26 8H-26L-10 -14H-22L-8 -34H-18z" fill="#2F6B5E"/><path d="M0 -60L9 -46L0 -42L-9 -46zM-8 -34L8 -34L12 -26L-12 -26zM-10 -14L10 -14L14 -6L-14 -6z" fill="#fff" opacity=".92"/><rect x="-3" y="8" width="6" height="8" fill="#6b4a2b"/></g>`;
const drift=(y,amp,fill,top)=>top?`<path d="M-10 -10H400V${y}Q300 ${y+amp} 200 ${y}T-10 ${y}Z" fill="${fill}"/>`:`<path d="M-10 660H400V${y}Q300 ${y-amp} 200 ${y}T-10 ${y}Z" fill="${fill}"/>`;
const THEME={
  kinds:['snow','forest','cabin','aurora','snow'], light:['snow','forest','cabin','aurora'], stampBig:'❄', ink:'#17426B', pin:'#D8433A',
  trip:{title:'Let it<br>Snow',handle:'alok',dateLabel:'22–27 Dec',statsLabel:'6 days · 2 slopes',destination:'Gulmarg',
    tapes:['rgba(255,255,255,.75)','rgba(216,67,58,.55)','rgba(120,190,230,.7)'],
    pages:[
      {date:'Day 1 · 22 Dec',title:'First snowfall',photos:[{s:'snowman',c:'meet Frosty'},{s:'penguin',c:'snow angel crew'}],place:'Srinagar'},
      {date:'Day 2 · 23 Dec',title:'Cocoa & cabins',photos:[{s:'cabin',c:'our little cabin'},{s:'rink',c:'frozen pond'},{s:'snowman',c:'rosy cheeks'}],place:'Gulmarg'},
      {date:'Day 3 · 24 Dec',title:'Under the lights',photos:[{s:'aurora',c:'sky on fire'}],place:'Sonamarg'}],
    route:[['Srinagar',22,74],['Gulmarg',40,54],['Pahalgam',62,40],['Sonamarg',78,20]],routeKicker:'the way',routeTitle:'Snowy trail'},
  stickers:[
    (x,y,s,r=0)=>st(x,y,s,r,'-20 -20 40 40','<g stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none">'+[0,60,120].map(a=>`<path d="M0 -16V16" transform="rotate(${a})"/>`).join('')+'</g><circle r="3.5" fill="#fff"/>'),
    (x,y,s,r=0)=>st(x,y,s,r,'0 0 80 80','<path d="M14 54Q14 18 40 18T66 54z" fill="#D8433A" stroke="#fff" stroke-width="4"/><rect x="10" y="50" width="60" height="12" rx="6" fill="#fff"/><circle cx="40" cy="14" r="7" fill="#fff"/><path d="M22 36h36M20 44h40" stroke="#fff" stroke-width="2.4" opacity=".7"/>'),
    (x,y,s,r=0)=>st(x,y,s,r,'-30 -64 60 90','<path d="M0 -60L18 -34H8L22 -14H10L26 8H-26L-10 -14H-22L-8 -34H-18z" fill="#2F6B5E" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M0 -58L8 -46L0 -42L-8 -46z" fill="#fff"/>'),
    (x,y,s,r=0)=>st(x,y,s,r,'0 0 80 100','<circle cx="40" cy="68" r="22" fill="#fff" stroke="#BFE0F2" stroke-width="3"/><circle cx="40" cy="36" r="16" fill="#fff" stroke="#BFE0F2" stroke-width="3"/><path d="M26 28q14-14 28 0z" fill="#D8433A"/><circle cx="35" cy="36" r="1.8" fill="#222"/><circle cx="45" cy="36" r="1.8" fill="#222"/><path d="M40 40l9 3-9 2z" fill="#FF8A3D"/><path d="M26 48q14 7 28 0v6q-14 7-28 0z" fill="#D8433A"/>'),
    (x,y,s,r=0)=>st(x,y,s,r,'0 0 80 80','<path d="M40 8l9 20 22 3-16 15 4 22-19-11-19 11 4-22L9 31l22-3z" fill="#FFD45E" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>')
  ],
  bg(k,seed){
    const r=rng(seed*3+1);
    if(k==='snow')return svgBg(`<rect width="390" height="650" fill="url(#wSnow)"/>${grain(.12)}${drift(60,34,'#CFE9F6',true)}${drift(52,34,'#fff',true)}${drift(615,34,'#CFE9F6',false)}${drift(622,34,'#fff',false)}${flake(372,178,1.3)}${flake(345,250,1.5,.9)}${flake(70,430,1.1,.8)}${flake(330,500,1.2,.85)}${flake(25,296,.9,.8)}${snowfall(46,seed)}`);
    if(k==='forest')return svgBg(`<rect width="390" height="650" fill="url(#wDusk)"/>${grain(.1)}${ridge(500,170,seed,'#B3C4EE',null,true)}${ridge(560,120,seed+2,'#8EA7D8',null,false)}${Array.from({length:12},(_,i)=>snowPine(14+i*34+r()*10,600+r()*30,.9+r()*.5)).join('')}${drift(618,26,'#fff',false)}${flake(60,200,1.2,.9)}${flake(320,160,1,.9)}${snowfall(40,seed)}`);
    if(k==='cabin')return svgBg(`<rect width="390" height="650" fill="url(#wNight)"/>${stars(60,seed,360)}<circle cx="200" cy="34" r="50" fill="url(#glare)" opacity=".45"/><circle cx="200" cy="34" r="16" fill="#FFF3C4"/>${ridge(560,130,seed,'#3C5A92',null,true)}${drift(590,24,'#E9F3FA',false)}<g transform="translate(250 590)"><rect x="-50" y="-34" width="100" height="40" fill="#5E3A22"/><path d="M-60 -32L0 -78L60 -32z" fill="#F4F8FB"/><rect x="-34" y="-22" width="22" height="20" fill="#FFC857"/><rect x="14" y="-26" width="18" height="32" fill="#3a2314"/><circle cx="-23" cy="-12" r="34" fill="#FFC857" opacity=".16"/></g>${snowPine(60,610,1.4)}${snowPine(110,620,1)}${snowfall(54,seed,.9)}`);
    return svgBg(`<rect width="390" height="650" fill="url(#wAur)"/>${stars(70,seed,330)}<g filter="url(#blur9)"><path d="M-20 230C90 120 200 300 410 160V260C220 380 100 230 -20 340z" fill="#3FE0A0" opacity=".6"/><path d="M-20 300C110 190 220 350 410 230V300C240 430 110 290 -20 390z" fill="#8F6BFF" opacity=".5"/></g>${ridge(570,160,seed,'#DCE9F3',null,false)}${ridge(610,110,seed+2,'#fff',null,false)}${snowPine(70,628,1.3)}${snowPine(330,630,1.5)}${snowfall(30,seed,.7)}`);
  }
};
```

Page kinds: cover = snow, photo pages cycle forest / cabin / aurora, route = snow. Every kind is `light` (white text). Stamp big = ❄. Photo scenes in the design (snowman, penguin, cabin, rink, aurora) are stand-ins for the writer's photos and aren't needed.
