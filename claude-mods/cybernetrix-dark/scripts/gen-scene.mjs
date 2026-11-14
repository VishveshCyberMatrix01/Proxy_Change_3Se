// Builds the CyberNetrix backdrop SVG (a seeded, deterministic layout) and writes
// it as a TS module exporting SCENE.
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
let seed = 0x5eed1e
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const r1 = n => Math.round(n * 10) / 10

const W = 1600
const H = 1000

// ---- Circuit traces (far layer): right-angle runs ending in pads ----
const traces = []
const pads = []
for (let i = 0; i < 26; i++) {
  // keep traces mostly toward the edges, away from the reading column
  const leftSide = i % 2 === 0
  let x = leftSide ? rnd() * 420 : W - rnd() * 420
  let y = rnd() * H
  let d = `M${r1(x)} ${r1(y)}`
  const steps = 2 + Math.floor(rnd() * 3)
  for (let s = 0; s < steps; s++) {
    if (s % 2 === 0) {
      x += (leftSide ? 1 : -1) * (40 + rnd() * 160)
    } else {
      const dy = (rnd() < 0.5 ? -1 : 1) * (30 + rnd() * 120)
      // 45° chamfer, the way real board traces turn
      x += (leftSide ? 1 : -1) * Math.abs(dy) * 0.4
      y += dy
    }
    d += ` L${r1(x)} ${r1(y)}`
  }
  traces.push(d)
  pads.push([r1(x), r1(y)])
}

// ---- Neural network (two depth layers that drift at different speeds) ----
function layer(count, minDist, linkDist) {
  const nodes = []
  let guard = 0
  while (nodes.length < count && guard++ < 5000) {
    const x = rnd() * W
    const y = rnd() * H
    // thin out the middle band where the conversation sits
    const centre = Math.abs(x - W / 2) < 260 && rnd() < 0.5
    if (centre) continue
    if (nodes.every(([a, b]) => Math.hypot(a - x, b - y) > minDist)) nodes.push([r1(x), r1(y)])
  }
  const edges = []
  nodes.forEach(([x, y], i) => {
    const near = nodes
      .map(([a, b], j) => [j, Math.hypot(a - x, b - y)])
      .filter(([j, dist]) => j > i && dist < linkDist)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 3)
    near.forEach(([j]) => edges.push([i, j]))
  })
  return { nodes, edges }
}

const far = layer(34, 110, 230)
const near = layer(18, 170, 300)

const edgePath = (L, [i, j]) => `M${L.nodes[i][0]} ${L.nodes[i][1]}L${L.nodes[j][0]} ${L.nodes[j][1]}`

// Pulses: a short bright dash travelling along chosen edges ("signals firing")
function pulses(L, n, cls) {
  const picks = []
  for (let k = 0; k < n && L.edges.length; k++) {
    const e = L.edges[Math.floor(rnd() * L.edges.length)]
    const [a, b] = [L.nodes[e[0]], L.nodes[e[1]]]
    const len = Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]))
    const dur = (7 + rnd() * 9).toFixed(1)
    const delay = (-rnd() * 16).toFixed(1)
    picks.push(
      `<path class="${cls}" d="${edgePath(L, e)}" style="--len:${len};stroke-dasharray:18 ${len + 40};animation-duration:${dur}s;animation-delay:${delay}s"/>`,
    )
  }
  return picks.join('')
}

function nodesMarkup(L, rCore, rGlow, glowId, cls) {
  return L.nodes
    .map(([x, y], i) => {
      const delay = (-rnd() * 9).toFixed(1)
      const dur = (6 + rnd() * 6).toFixed(1)
      return `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:${delay}s"><circle cx="${x}" cy="${y}" r="${rGlow}" fill="url(#${glowId(i)})"/><circle cx="${x}" cy="${y}" r="${rCore}" class="core"/></g>`
    })
    .join('')
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="bgA" cx="12%" cy="8%" r="70%"><stop offset="0" stop-color="#0c2a33" stop-opacity=".55"/><stop offset="1" stop-color="#0c2a33" stop-opacity="0"/></radialGradient>
<radialGradient id="bgB" cx="92%" cy="96%" r="70%"><stop offset="0" stop-color="#2a1245" stop-opacity=".55"/><stop offset="1" stop-color="#2a1245" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#05080c" stop-opacity="0"/><stop offset="1" stop-color="#05080c" stop-opacity=".7"/></radialGradient>
<radialGradient id="gC"><stop offset="0" stop-color="#00f0ff" stop-opacity=".55"/><stop offset="1" stop-color="#00f0ff" stop-opacity="0"/></radialGradient>
<radialGradient id="gV"><stop offset="0" stop-color="#bd00ff" stop-opacity=".5"/><stop offset="1" stop-color="#bd00ff" stop-opacity="0"/></radialGradient>
<radialGradient id="gM"><stop offset="0" stop-color="#0aff9d" stop-opacity=".45"/><stop offset="1" stop-color="#0aff9d" stop-opacity="0"/></radialGradient>
<linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f0ff" stop-opacity="0"/><stop offset=".5" stop-color="#00f0ff" stop-opacity=".05"/><stop offset="1" stop-color="#00f0ff" stop-opacity="0"/></linearGradient>
</defs>
<style>
.trace{fill:none;stroke:#00f0ff;stroke-opacity:.07;stroke-width:1.2;stroke-linejoin:round}
.pad{fill:none;stroke:#00f0ff;stroke-opacity:.16;stroke-width:1.2}
.ef{stroke:#5fb8d6;stroke-opacity:.09;stroke-width:.8}
.en{stroke:#9b7bff;stroke-opacity:.12;stroke-width:1}
.core{fill:#cfefff}
.nf .core{fill-opacity:.35}
.nn .core{fill-opacity:.55}
.nf,.nn{animation-name:breathe;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
.pc,.pv{fill:none;stroke-linecap:round;stroke-width:1.6;animation-name:fire;animation-timing-function:linear;animation-iteration-count:infinite}
.pc{stroke:#00f0ff;stroke-opacity:.55}
.pv{stroke:#d07bff;stroke-opacity:.55}
.drift-far{animation:driftFar 90s ease-in-out infinite alternate}
.drift-near{animation:driftNear 64s ease-in-out infinite alternate}
.glow-a{animation:glowA 26s ease-in-out infinite alternate}
.glow-b{animation:glowB 32s ease-in-out infinite alternate}
.scan{animation:scan 22s linear infinite}
@keyframes breathe{from{opacity:.45}to{opacity:1}}
@keyframes fire{from{stroke-dashoffset:calc(var(--len) + 40)}to{stroke-dashoffset:-18}}
@keyframes driftFar{from{transform:translate(0,0)}to{transform:translate(-26px,14px)}}
@keyframes driftNear{from{transform:translate(0,0)}to{transform:translate(40px,-22px)}}
@keyframes glowA{from{opacity:.75}to{opacity:1}}
@keyframes glowB{from{opacity:1}to{opacity:.7}}
@keyframes scan{from{transform:translateY(-300px)}to{transform:translateY(${H + 300}px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
@media (max-aspect-ratio:3/4){.drift-near{opacity:.6}}
</style>
<rect width="${W}" height="${H}" fill="#0a0e14"/>
<rect class="glow-a" width="${W}" height="${H}" fill="url(#bgA)"/>
<rect class="glow-b" width="${W}" height="${H}" fill="url(#bgB)"/>
<g class="drift-far">
${traces.map(d => `<path class="trace" d="${d}"/>`).join('')}
${pads.map(([x, y]) => `<circle class="pad" cx="${x}" cy="${y}" r="3.2"/>`).join('')}
${far.edges.map(e => `<path class="ef" d="${edgePath(far, e)}"/>`).join('')}
${pulses(far, 7, 'pc')}
${nodesMarkup(far, 1.6, 9, i => (i % 5 === 0 ? 'gM' : 'gC'), 'nf')}
</g>
<g class="drift-near">
${near.edges.map(e => `<path class="en" d="${edgePath(near, e)}"/>`).join('')}
${pulses(near, 5, 'pv')}
${nodesMarkup(near, 2.4, 16, i => (i % 3 === 0 ? 'gC' : 'gV'), 'nn')}
</g>
<rect class="scan" x="0" y="0" width="${W}" height="260" fill="url(#scan)"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`

const compact = svg.replace(/\n/g, '')
writeFileSync(
  out,
  `// Generated: a drifting neural network over faint circuit traces.\n// Two depth layers drift at different speeds (parallax); signals fire along edges.\nexport const SCENE = ${JSON.stringify(compact)}\n`,
)
console.log('chars', compact.length)
