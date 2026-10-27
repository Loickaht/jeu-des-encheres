// Décors de chaque univers : dessins SVG originaux, discrets, placés en arrière-plan.
// DECO : le décor de fond de chaque thème. EMBLEM : un petit emblème pour les titres.

let uid = 0;
const svg = (viewBox, body, extra = "") => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;
// Un élément de décor positionné (style = position, taille, opacité, rotation).
const piece = (style, content) => `<div class="d" style="${style}">${content}</div>`;

function starPoints(cx, cy, r, inner = 0.45, spikes = 5) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// ---------- Dragon Ball ----------
const BALL_STARS = {
  1: [[50, 52]],
  2: [[40, 42], [60, 62]],
  3: [[50, 36], [37, 60], [63, 60]],
  4: [[38, 38], [62, 38], [38, 62], [62, 62]],
  5: [[36, 36], [64, 36], [50, 52], [36, 68], [64, 68]],
  6: [[38, 32], [62, 32], [38, 52], [62, 52], [38, 72], [62, 72]],
  7: [[50, 32], [67, 42], [67, 62], [50, 72], [33, 62], [33, 42], [50, 52]],
};

function dragonBall(n) {
  const id = `db${uid++}`;
  const r = n === 1 ? 12 : n <= 4 ? 9 : 7.5;
  return svg("0 0 100 100", `
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#fff6d5"/><stop offset=".3" stop-color="#ffbe3b"/><stop offset="1" stop-color="#e8780c"/>
    </radialGradient></defs>
    <circle cx="50" cy="50" r="46" fill="url(#${id})" stroke="#c75f00" stroke-width="2"/>
    <g fill="#d7261e">${BALL_STARS[n].map(([x, y]) => `<polygon points="${starPoints(x, y, r)}"/>`).join("")}</g>
    <ellipse cx="33" cy="27" rx="13" ry="7" fill="#fff" opacity=".55" transform="rotate(-35 33 27)"/>`);
}

// Le nuage magique : les cercles sont dessinés deux fois pour n'avoir qu'un contour extérieur.
function nimbus() {
  const puffs = [[90, 80, 40], [140, 62, 48], [195, 74, 40], [232, 94, 30], [58, 102, 28], [120, 106, 34], [176, 108, 32]];
  return svg("0 0 320 160", `
    <path d="M250 104 C 285 112, 312 92, 300 72 C 292 58, 272 64, 280 78" fill="none" stroke="#e39400" stroke-width="12" stroke-linecap="round"/>
    <path d="M250 104 C 285 112, 312 92, 300 72 C 292 58, 272 64, 280 78" fill="none" stroke="#ffd54a" stroke-width="6" stroke-linecap="round"/>
    <g fill="#e39400">${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 4}"/>`).join("")}</g>
    <g fill="#ffd54a">${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>
    <g fill="#fff3b0" opacity=".85"><circle cx="128" cy="50" r="20"/><circle cx="188" cy="64" r="14"/><circle cx="84" cy="70" r="13"/></g>`);
}

// Shenron : corps en S (écailles, ventre, épines), tête, cornes et moustaches.
function shenron() {
  const body = "M190 150 C 250 70, 330 60, 380 130 C 430 200, 470 300, 560 280 C 640 262, 650 160, 720 150";
  const dark = "#1d5a32", green = "#3f9b55";
  return svg("0 0 680 440", `
    <path d="${body}" fill="none" stroke="${dark}" stroke-width="58" stroke-dasharray="3 20"/>
    <path d="${body}" fill="none" stroke="${dark}" stroke-width="44" stroke-linecap="round"/>
    <path d="${body}" fill="none" stroke="${green}" stroke-width="36" stroke-linecap="round"/>
    <path d="${body}" fill="none" stroke="#d9e8a6" stroke-width="13" stroke-dasharray="14 6"/>
    <path d="M338 92 C 350 52, 372 40, 396 42" fill="none" stroke="${dark}" stroke-width="18" stroke-linecap="round"/>
    <path d="M338 92 C 350 52, 372 40, 396 42" fill="none" stroke="${green}" stroke-width="12" stroke-linecap="round"/>
    <path d="M396 42 l14 -10 M398 44 l16 0 M396 46 l12 10" stroke="#e8e0c0" stroke-width="4" stroke-linecap="round"/>
    <path d="M212 118 l24 -8 l-8 18 l24 2 l-16 14 l20 10 l-24 4" fill="${dark}"/>
    <g fill="none" stroke="#b8892b" stroke-width="7" stroke-linecap="round">
      <path d="M195 104 C 205 72, 225 54, 250 42"/><path d="M216 66 C 232 66, 244 72, 254 82"/>
      <path d="M210 114 C 232 90, 256 82, 282 80"/><path d="M248 84 C 258 72, 270 66, 282 64"/>
    </g>
    <path d="M215 120 C 205 98, 170 92, 145 104 L 92 122 C 78 127 78 142 92 145 L 128 150 L 98 164 C 88 169 92 181 104 179 L 150 172 C 175 182, 210 172, 222 150 Z"
      fill="${green}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 150 L 178 153" stroke="${dark}" stroke-width="3"/>
    <path d="M108 146 l5 7 l5 -7 Z M124 149 l4 6 l4 -6 Z M112 164 l4 -6 l4 6 Z" fill="#fff"/>
    <circle cx="96" cy="129" r="3" fill="${dark}"/>
    <ellipse cx="166" cy="116" rx="10" ry="5.5" fill="#fff"/><ellipse cx="166" cy="116" rx="6" ry="4.5" fill="#d7261e"/>
    <path d="M150 106 C 165 98, 182 100, 194 110" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
    <g fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round">
      <path d="M100 126 C 60 90, 30 92, 6 56"/><path d="M104 170 C 70 204, 40 198, 12 236"/>
    </g>`);
}

// ---------- One Piece ----------
function strawHatSkull() {
  const bone = "#f4f0e6", ink = "#1b1b1f";
  const bones = (rot) => `<g transform="rotate(${rot})" fill="${bone}">
    <rect x="-66" y="-7" width="132" height="14" rx="7"/>
    <circle cx="-66" cy="-7" r="9"/><circle cx="-66" cy="7" r="9"/><circle cx="66" cy="-7" r="9"/><circle cx="66" cy="7" r="9"/></g>`;
  return `
    <g transform="translate(130 108)">${bones(35)}${bones(-35)}</g>
    <circle cx="130" cy="96" r="34" fill="${bone}"/>
    <rect x="112" y="112" width="36" height="22" rx="6" fill="${bone}"/>
    <ellipse cx="117" cy="98" rx="8" ry="9" fill="${ink}"/><ellipse cx="143" cy="98" rx="8" ry="9" fill="${ink}"/>
    <polygon points="130,106 125,116 135,116" fill="${ink}"/>
    <g stroke="${ink}" stroke-width="2"><line x1="122" y1="122" x2="122" y2="134"/><line x1="130" y1="122" x2="130" y2="134"/><line x1="138" y1="122" x2="138" y2="134"/></g>
    <ellipse cx="130" cy="70" rx="54" ry="11" fill="#f2c14e" stroke="#b8860b" stroke-width="2"/>
    <path d="M98 68 C 98 38, 162 38, 162 68 Z" fill="#f2c14e" stroke="#b8860b" stroke-width="2"/>
    <path d="M99 60 C 112 55, 148 55, 161 60 L 161 67 C 148 62, 112 62, 99 67 Z" fill="#c0392b"/>`;
}

function jollyRogerFlag() {
  return svg("0 0 260 210", `
    <line x1="14" y1="0" x2="14" y2="210" stroke="#6b4a26" stroke-width="8" stroke-linecap="round"/>
    <path d="M18 18 C 80 2, 140 34, 246 14 L 246 172 C 150 190, 90 156, 18 176 Z" fill="#1b1b1f"/>
    ${strawHatSkull()}`);
}

function ship() {
  return svg("0 0 240 200", `
    <line x1="120" y1="12" x2="120" y2="132" stroke="#5b3a1a" stroke-width="6"/>
    <path d="M120 12 L 150 20 L 120 28 Z" fill="#1b1b1f"/>
    <path d="M70 36 C 92 46, 148 46, 170 36 L 170 84 C 148 94, 92 94, 70 84 Z" fill="#f7f3ea" stroke="#c9bfa8" stroke-width="2"/>
    <path d="M80 92 C 98 100, 142 100, 160 92 L 160 122 C 142 128, 98 128, 80 122 Z" fill="#f7f3ea" stroke="#c9bfa8" stroke-width="2"/>
    <path d="M14 128 L 214 128 C 204 160, 182 174, 130 174 L 66 174 C 40 172, 24 156, 14 128 Z" fill="#a8742e" stroke="#6b4a26" stroke-width="3"/>
    <path d="M24 142 L 206 142" stroke="#6b4a26" stroke-width="3"/>
    <circle cx="214" cy="122" r="12" fill="#f4f0e6" stroke="#b8a888" stroke-width="2"/>`);
}

function waves() {
  return svg("0 0 1440 160", `
    <path d="M0 80 C 120 40, 240 120, 360 80 S 600 40, 720 80 S 960 120, 1080 80 S 1320 40, 1440 80 L1440 160 L0 160 Z" fill="#1d4f91" opacity=".18"/>
    <path d="M0 112 C 140 82, 260 142, 400 112 S 660 82, 800 112 S 1060 142, 1200 112 S 1380 92, 1440 106 L1440 160 L0 160 Z" fill="#1d4f91" opacity=".28"/>`,
    `preserveAspectRatio="none" style="height:100%"`);
}

// ---------- Naruto ----------
function konohaLeaf(color = "#d95a0b", width = 9) {
  // Spirale (sortie à gauche) qui monte vers la pointe, puis contour de feuille tout autour.
  const pts = [];
  for (let t = 0; t <= Math.PI * 3 + 0.001; t += 0.1) {
    const r = 4 + 12 * t / Math.PI;
    pts.push(`${(112 + r * Math.cos(t)).toFixed(1)},${(120 + r * Math.sin(t)).toFixed(1)}`);
  }
  return svg("0 0 200 200", `
    <path d="M${pts.join(" L")} L 30 30 C 96 34, 172 62, 172 122 C 172 166, 138 186, 108 184 C 76 182, 54 162, 52 136"
      fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`);
}

function shuriken() {
  return svg("-50 -50 100 100", `
    <path d="M0,-46 L11,-11 L46,0 L11,11 L0,46 L-11,11 L-46,0 L-11,-11 Z" fill="#3a3f4a"/>
    <path d="M0,-46 L11,-11 L0,0 Z M46,0 L11,11 L0,0 Z M0,46 L-11,11 L0,0 Z M-46,0 L-11,-11 L0,0 Z" fill="#6b7280"/>
    <circle r="7" fill="#faf6f1"/>`);
}

function kunai() {
  return svg("0 0 60 200", `
    <path d="M30 0 L 46 62 L 30 76 L 14 62 Z" fill="#6b7280"/><path d="M30 0 L 30 76 L 14 62 Z" fill="#8b93a1"/>
    <rect x="25" y="76" width="10" height="78" fill="#3a2a20"/>
    <g stroke="#d9c7a0" stroke-width="3">${[86, 98, 110, 122, 134, 146].map((y) => `<line x1="25" y1="${y}" x2="35" y2="${y + 5}"/>`).join("")}</g>
    <circle cx="30" cy="170" r="13" fill="none" stroke="#6b7280" stroke-width="5"/>`);
}

function scroll() {
  return svg("0 0 260 90", `
    <rect x="30" y="16" width="200" height="58" fill="#f3e2c0" stroke="#b08d57" stroke-width="2"/>
    <g stroke="#b08d57" stroke-width="2" opacity=".7"><line x1="60" y1="34" x2="200" y2="34"/><line x1="60" y1="46" x2="180" y2="46"/><line x1="60" y1="58" x2="190" y2="58"/></g>
    <rect x="12" y="8" width="24" height="74" rx="8" fill="#b23a1a"/><rect x="224" y="8" width="24" height="74" rx="8" fill="#b23a1a"/>`);
}

// ---------- My Hero Academia ----------
function plusUltra() {
  const pts = [];
  const radii = [150, 104, 138, 98, 156, 106, 132, 96, 150, 102, 140, 100, 154, 104, 136, 98];
  radii.forEach((r, i) => {
    const a = (i / radii.length) * Math.PI * 2;
    pts.push(`${(160 + r * Math.cos(a)).toFixed(1)},${(110 + r * 0.66 * Math.sin(a)).toFixed(1)}`);
  });
  return svg("0 0 320 220", `
    <polygon points="${pts.join(" ")}" fill="#ffd23f" stroke="#13261a" stroke-width="5" stroke-linejoin="round"/>
    <g transform="rotate(-8 160 110)" font-family="'Luckiest Guy', Impact, sans-serif" text-anchor="middle" fill="#c8303b" stroke="#13261a" stroke-width="2.5" paint-order="stroke">
      <text x="160" y="100" font-size="44">PLUS</text><text x="160" y="146" font-size="50">ULTRA!</text>
    </g>`);
}

function heroShield(text = "U.A.") {
  return svg("0 0 160 190", `
    <path d="M80 8 L150 30 C 150 110, 120 160, 80 182 C 40 160, 10 110, 10 30 Z" fill="#1f8a52" stroke="#13261a" stroke-width="6" stroke-linejoin="round"/>
    <path d="M80 24 L136 41 C 135 104, 112 146, 80 164 C 48 146, 25 104, 24 41 Z" fill="none" stroke="#fff" stroke-width="3"/>
    <path d="M24 41 L 136 41 L 133 70 L 27 70 Z" fill="#c8303b"/>
    <text x="80" y="122" text-anchor="middle" font-family="'Luckiest Guy', Impact, sans-serif" font-size="40" fill="#fff">${text}</text>`);
}

function speedLines() {
  const lines = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * (Math.PI / 2);
    const w = i % 3 === 0 ? 5 : 2;
    lines.push(`<line x1="${(400 * Math.cos(a)).toFixed(0)}" y1="${(400 * Math.sin(a)).toFixed(0)}" x2="${(140 * Math.cos(a)).toFixed(0)}" y2="${(140 * Math.sin(a)).toFixed(0)}" stroke-width="${w}"/>`);
  }
  return svg("0 0 400 400", `<g stroke="#13261a" stroke-linecap="round">${lines.join("")}</g>`);
}

function bolt() {
  return svg("0 0 80 140", `<path d="M48 2 L 10 78 L 38 78 L 26 138 L 72 52 L 44 52 Z" fill="#ffd23f" stroke="#13261a" stroke-width="4" stroke-linejoin="round"/>`);
}

// ---------- Jujutsu Kaisen ----------
function talisman(chars = ["呪", "封", "印"]) {
  return svg("0 0 70 270", `
    <line x1="35" y1="0" x2="35" y2="22" stroke="#6b5a3a" stroke-width="2"/>
    <rect x="5" y="20" width="60" height="240" fill="#f4ead2" stroke="#b8a27a" stroke-width="1.5"/>
    <rect x="12" y="28" width="46" height="224" fill="none" stroke="#b3362c" stroke-width="2"/>
    <circle cx="35" cy="52" r="11" fill="none" stroke="#b3362c" stroke-width="2.5"/>
    <g font-family="'Zen Antique', serif" font-size="36" fill="#b3362c" text-anchor="middle">
      ${chars.map((c, i) => `<text x="35" y="${112 + i * 58}">${c}</text>`).join("")}
    </g>`);
}

function sealCircle() {
  const ticks = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r1 = i % 4 === 0 ? 118 : 124;
    ticks.push(`<line x1="${(150 + r1 * Math.cos(a)).toFixed(1)}" y1="${(150 + r1 * Math.sin(a)).toFixed(1)}" x2="${(150 + 132 * Math.cos(a)).toFixed(1)}" y2="${(150 + 132 * Math.sin(a)).toFixed(1)}"/>`);
  }
  return svg("0 0 300 300", `
    <g fill="none" stroke="#5b3cc4">
      <circle cx="150" cy="150" r="140" stroke-width="4"/><circle cx="150" cy="150" r="110" stroke-width="2"/>
      <g stroke-width="2">${ticks.join("")}</g>
      <polygon points="${starPoints(150, 150, 104, 0.382)}" stroke-width="2"/>
    </g>
    <text x="150" y="172" text-anchor="middle" font-family="'Zen Antique', serif" font-size="64" fill="#5b3cc4">呪</text>`);
}

function cursedFlame() {
  const id = `cf${uid++}`;
  return svg("0 0 200 220", `
    <defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#1b1730"/><stop offset=".55" stop-color="#5b3cc4"/><stop offset="1" stop-color="#9b7cf0"/>
    </linearGradient></defs>
    <path d="M60 210 C 18 170, 36 124, 70 102 C 60 134, 80 146, 92 124 C 104 92, 82 60, 104 16 C 124 70, 168 94, 148 156 C 140 184, 112 210, 60 210 Z" fill="url(#${id})"/>
    <path d="M150 214 C 128 194, 136 168, 154 156 C 152 172, 162 176, 168 166 C 176 150, 168 136, 178 118 C 190 150, 206 172, 188 200 C 182 210, 170 216, 150 214 Z" fill="url(#${id})" opacity=".8"/>`);
}

// ---------- Assemblage ----------
export const DECO = {
  dragonball: [
    piece("top:-40px;right:-90px;width:clamp(320px,46vw,640px);opacity:.3", shenron()),
    piece("bottom:20px;left:-30px;width:clamp(180px,22vw,300px);opacity:.55", nimbus()),
    piece("top:38%;left:14px;width:46px;opacity:.6", dragonBall(1)),
    piece("top:56%;right:16px;width:54px;opacity:.6", dragonBall(4)),
    piece("bottom:40px;right:12%;width:40px;opacity:.6", dragonBall(7)),
  ].join(""),
  onepiece: [
    piece("top:20px;right:-10px;width:clamp(150px,18vw,240px);opacity:.25;transform:rotate(6deg)", jollyRogerFlag()),
    piece("bottom:60px;left:2%;width:clamp(140px,16vw,220px);opacity:.35", ship()),
    piece("bottom:0;left:0;right:0;height:140px", waves()),
  ].join(""),
  naruto: [
    piece("top:10px;right:-40px;width:clamp(200px,26vw,360px);opacity:.18", konohaLeaf()),
    piece("top:42%;left:10px;width:64px;opacity:.35;transform:rotate(20deg)", shuriken()),
    piece("bottom:40px;right:30px;width:34px;opacity:.4;transform:rotate(-30deg)", kunai()),
    piece("bottom:30px;right:90px;width:30px;opacity:.35;transform:rotate(15deg)", kunai()),
    piece("bottom:24px;left:2%;width:clamp(160px,18vw,240px);opacity:.4", scroll()),
  ].join(""),
  mha: [
    piece("top:14px;right:-20px;width:clamp(170px,22vw,300px);opacity:.5;transform:rotate(6deg)", plusUltra()),
    piece("top:-60px;left:-60px;width:clamp(220px,28vw,380px);opacity:.1", speedLines()),
    `<div class="d halftone"></div>`,
    piece("bottom:30px;right:2%;width:clamp(80px,9vw,120px);opacity:.3", heroShield()),
    piece("top:46%;left:12px;width:40px;opacity:.45;transform:rotate(-12deg)", bolt()),
  ].join(""),
  jjk: [
    piece("top:-10px;right:3%;width:52px;opacity:.55;transform:rotate(4deg)", talisman(["呪", "封", "印"])),
    piece("top:-40px;right:calc(3% + 64px);width:46px;opacity:.45;transform:rotate(-5deg)", talisman(["滅", "祓", "禁"])),
    piece("top:-70px;right:calc(3% + 122px);width:40px;opacity:.35;transform:rotate(3deg)", talisman(["縛", "術", "式"])),
    piece("bottom:-40px;left:-50px;width:clamp(220px,26vw,340px);opacity:.14", sealCircle()),
    piece("bottom:0;right:1%;width:clamp(110px,12vw,170px);opacity:.25", cursedFlame()),
  ].join(""),
};

export const EMBLEM = {
  dragonball: dragonBall(4),
  onepiece: svg("72 30 116 126", strawHatSkull()),
  naruto: konohaLeaf("#d95a0b", 12),
  mha: heroShield(),
  jjk: sealCircle(),
};
