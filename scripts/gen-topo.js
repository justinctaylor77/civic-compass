// Generates public/img/topo.svg: tile of topographic contour lines + map grid + 4-point sparkles (replaces the v1 random star dots).
const fs = require('fs'), path = require('path');
const S = 900;
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hills = [ // cx, cy, base radius, step, rings, rotation, eccentricity
  [250, 250, 24, 26, 9, 0.4, 0.78], [650, 330, 20, 24, 8, 1.9, 0.7], [380, 700, 22, 25, 8, 2.8, 0.82], [800, 780, 14, 20, 4, 0.9, 0.8], [90, 760, 12, 18, 4, 2.2, 0.75],
];
const ph = hills.map(() => [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]);
function ring(h, i, k) {
  const [cx, cy, r0, st, , rot, e] = h; const r = r0 + i * st; const pts = [];
  for (let a = 0; a < 44; a++) {
    const t = (a / 44) * 2 * Math.PI;
    const wob = 1 + 0.09 * Math.sin(2 * t + ph[k][0] + i * 0.25) + 0.06 * Math.sin(3 * t + ph[k][1]) + 0.035 * Math.sin(5 * t + ph[k][2] + i * 0.4);
    const x0 = r * wob * Math.cos(t), y0 = r * wob * e * Math.sin(t);
    pts.push([cx + x0 * Math.cos(rot) - y0 * Math.sin(rot), cy + x0 * Math.sin(rot) + y0 * Math.cos(rot)]);
  }
  // closed Catmull-Rom -> cubic bezier
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let j = 0; j < pts.length; j++) {
    const p0 = pts[(j - 1 + pts.length) % pts.length], p1 = pts[j], p2 = pts[(j + 1) % pts.length], p3 = pts[(j + 2) % pts.length];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`;
// map grid with registration crosses
s += `<g stroke="#fff" stroke-opacity=".07" stroke-width="1">`;
for (let v = 150; v < S; v += 150) s += `<path d="M${v} 0V${S}M0 ${v}H${S}"/>`;
s += `</g><g stroke="#fff" stroke-opacity=".22" stroke-width="1.5" fill="none">`;
for (let x = 150; x < S; x += 150) for (let y = 150; y < S; y += 150) s += `<path d="M${x - 6} ${y}h12M${x} ${y - 6}v12"/>`;
s += `</g>`;
hills.forEach((h, k) => { s += `<g fill="none" stroke="#9db8ee">`; for (let i = 0; i < h[4]; i++) s += `<path d="${ring(h, i, k)}" stroke-opacity="${i % 4 === 3 ? 0.2 : 0.1}" stroke-width="${i % 4 === 3 ? 1.8 : 1}"/>`; s += `</g>`; });
// 4-point sparkles (from the logo)
[[120, 90, 7], [520, 120, 5], [740, 60, 6], [60, 420, 5], [560, 520, 7], [840, 560, 5], [220, 560, 5], [700, 880, 6], [470, 840, 4]].forEach(([x, y, r]) => {
  s += `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff" fill-opacity=".55"/>`;
});
s += `</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'img', 'topo.svg'), s);
console.log('topo.svg', s.length, 'bytes');
