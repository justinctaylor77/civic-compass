// Generates the v3 header/footer ribbon art: public/img/ribbon-{body,left,right}.svg
// Body stretches horizontally (preserveAspectRatio=none); the two ends are fixed-size caps.
// Palette is the logo's: red #EE1F2E/#B1001D, white, blue.  Usage: node scripts/gen-ribbon.js
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'public', 'img');
const H = 44, TAU = 2 * Math.PI;
const RED = '#D4122A', WHITE = '#FBFBFB', BLUE = '#1F4FA6';
const f = (n) => (+n.toFixed(2)).toString();
// centreline and half-width as functions of u in [0,1]; both have zero slope at the ends so the caps join cleanly
const cy = (u) => 22 - 5.5 * Math.cos(TAU * 2 * u) + 1.2 * Math.cos(TAU * 4 * u + .0);
const hw = (u) => 10.5 + 1.8 * Math.cos(TAU * 3 * u);
const ENDY = cy(0), ENDH = hw(0);
function edge(u0, u1, v, n, W) { const p = []; for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; p.push([u * W, cy(u) + v * hw(u)]); } return p; }
const pts = (a) => a.map((p) => f(p[0]) + ' ' + f(p[1])).join('L');
function band(v0, v1, W, n) { return 'M' + pts(edge(0, 1, v0, n, W)) + 'L' + pts(edge(0, 1, v1, n, W).reverse()) + 'Z'; }
function body() {
  const W = 1000, n = 64, L = [];
  const bands = [[-1, -1 / 3, RED], [-1 / 3, 1 / 3, WHITE], [1 / 3, 1, BLUE]];
  // soft shadow under the ribbon
  L.push(`<path d="${band(-1, 1, W, n)}" fill="#000" opacity=".30" transform="translate(0 2.6)"/>`);
  for (const [a, b, c] of bands) L.push(`<path d="${band(a, b, W, n)}" fill="${c}"/>`);
  // fold shading: dark where the surface turns away, bright where it catches light (follows the twist)
  const st = [];
  for (let i = 0; i <= 60; i++) { const u = i / 60; const s = Math.sin(TAU * 2 * u + .5) * .55 + Math.cos(TAU * 3 * u) * -.45; const ss = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }; const a = Math.abs(s) * (s > 0 ? .34 : .42) * ss(u / .09) * ss((1 - u) / .09); st.push(`<stop offset="${f(u)}" stop-color="${s > 0 ? '#001435' : '#fff'}" stop-opacity="${f(a)}"/>`); }
  // thin bevels along the three seams and both outer edges
  const line = (v, col, op, w) => `<path d="M${pts(edge(0, 1, v, n, W))}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${w}" vector-effect="non-scaling-stroke"/>`;
  L.push(`<path d="${band(-1, 1, W, n)}" fill="url(#fold)"/>`);
  L.push(line(-1, '#fff', .65, 1.2), line(-1 / 3, '#7a0012', .35, 1), line(1 / 3, '#0a2a63', .30, 1), line(1, '#fff', .55, 1.1));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="fold" x1="0" x2="1" y1="0" y2="0">${st.join('')}</linearGradient></defs>${L.join('')}</svg>`;
}
// end caps are CAP px wide; "side" is 'r' (swallowtail) or 'l' (folded, mirrored)
const CAP = 64;
function cap(side) {
  const T = ENDY - ENDH, B = ENDY + ENDH, M = ENDY, hh = ENDH, L = [];
  const stripes = (x0, x1) => [[T, T + 2 * hh / 3, RED], [T + 2 * hh / 3, T + 4 * hh / 3, WHITE], [T + 4 * hh / 3, B, BLUE]].map(([a, b, c]) => `<rect x="${x0}" y="${f(a)}" width="${x1 - x0}" height="${f(b - a + .3)}" fill="${c}"/>`).join('');
  let g;
  if (side === 'r') {
    // swallowtail: V notch cut into the right end
    g = `<clipPath id="c"><path d="M-1 ${f(T - 2)}H${CAP}L${CAP - 22} ${f(M)}L${CAP} ${f(B + 2)}H-1Z"/></clipPath>
    <path d="M0 ${f(T + 3)}H${CAP}L${CAP - 22} ${f(M + 3)}L${CAP} ${f(B + 3)}H0Z" fill="#000" opacity=".30"/>
    <g clip-path="url(#c)">${stripes(0, CAP)}
    <path d="M${CAP - 36} ${f(T)}H${CAP}L${CAP - 22} ${f(M)}L${CAP} ${f(B)}H${CAP - 36}Z" fill="url(#tail)"/>
    <path d="M0 ${f(T)}H${CAP}L${CAP - 22} ${f(M)}L${CAP} ${f(B)}H0" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/></g>
    <defs><linearGradient id="tail" x1="0" x2="1"><stop offset="0" stop-color="#001435" stop-opacity="0"/><stop offset="1" stop-color="#001435" stop-opacity=".38"/></linearGradient></defs>`;
  } else {
    // folded end: the ribbon's end turns back over itself at a diagonal crease, showing its darker, silvery underside
    const cA = 8, fl = 22, sk = 12; // crease x (top), flap width, diagonal lean
    const flap = `M${cA} ${f(T)}H${cA + fl}L${cA + fl + sk} ${f(B)}H${cA + sk}Z`;
    g = `<path d="M${cA + 2} ${f(T + 3)}H${CAP}V${f(B + 3)}H${cA + sk + 2}Z" fill="#000" opacity=".30"/>
    <clipPath id="c"><path d="M${cA + fl} ${f(T)}H${CAP}V${f(B)}H${cA + fl + sk}Z"/></clipPath>
    <g clip-path="url(#c)">${stripes(0, CAP)}<path d="M${cA + fl} ${f(T)}H${CAP}V${f(B)}H${cA + fl + sk}Z" fill="url(#tail)"/></g>
    <path d="M${cA + fl} ${f(T)}H${CAP}M${cA + fl + sk} ${f(B)}H${CAP}" stroke="#fff" stroke-opacity=".6" stroke-width="1.1" fill="none"/>
    <path d="${flap}" fill="url(#under)"/>
    <path d="M${cA + fl} ${f(T)}L${cA + fl + sk} ${f(B)}" stroke="#001435" stroke-opacity=".45" stroke-width="1.4"/>
    <path d="${flap}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
    <defs><linearGradient id="under" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f1f4fd"/><stop offset=".6" stop-color="#b3c2e6"/><stop offset="1" stop-color="#7d93c8"/></linearGradient>
    <linearGradient id="tail" x1="0" x2="1"><stop offset="0" stop-color="#001435" stop-opacity=".5"/><stop offset=".45" stop-color="#001435" stop-opacity="0"/><stop offset="1" stop-color="#001435" stop-opacity="0"/></linearGradient></defs>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAP} ${H}" width="${CAP}" height="${H}">${g}</svg>`;
}
fs.writeFileSync(path.join(OUT, 'ribbon-body.svg'), body());
fs.writeFileSync(path.join(OUT, 'ribbon-right.svg'), cap('r'));
fs.writeFileSync(path.join(OUT, 'ribbon-left.svg'), cap('l'));
console.log('ribbon svgs written; end y', ENDY, 'half-width', ENDH);
