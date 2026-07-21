'use client'

import { useEffect, useRef } from 'react'
import type { AgentStatus } from './AgentNode'

export type { AgentStatus } from './AgentNode'

export interface AgentState {
  status: AgentStatus
  message?: string
  data?: Record<string, unknown>
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_KEYS = [
  'scraper',
  'hs_classifier',
  'freight_estimator',
  'cost_engine',
  'risk_assessor',
]
const N_NODES  = 24
const N_ZONES  = AGENT_KEYS.length
const ZONE_SZ  = Math.ceil(N_NODES / N_ZONES)

// RGB tuples for lerping (no CSS strings in hot path)
const RGB: Record<AgentStatus, readonly [number, number, number]> = {
  idle:     [0,   212, 255],
  running:  [0,   212, 255],
  complete: [0,   255, 148],
  partial:  [255, 107,  43],
  error:    [255,  59,  92],
  blocked:  [255,  59,  92],
}

const ALPHA: Record<AgentStatus, number> = {
  idle:     0.20,
  running:  0.95,
  complete: 0.72,
  partial:  0.75,
  error:    0.80,
  blocked:  0.80,
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface Node {
  x: number; y: number
  vx: number; vy: number
  r: number; baseR: number
  cr: number; cg: number; cb: number   // current color (lerped)
  tr: number; tg: number; tb: number   // target color
  alpha: number; tAlpha: number
  phase: number
  zone: number
}

interface Particle { t: number; spd: number }

interface Edge { a: number; b: number; particles: Particle[] }

interface Ripple {
  x: number; y: number
  r: number; maxR: number
  rgb: readonly [number, number, number]
  alpha: number
}

interface Anim {
  nodes: Node[]
  edges: Edge[]
  ripples: Ripple[]
  statuses: AgentStatus[]
  allCompleteRippled: boolean
  time: number
  w: number; h: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed | 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return (s >>> 0) / 4294967296
  }
}

function buildNodes(w: number, h: number): Node[] {
  const rng = seededRng(31)
  const pad = 52
  return Array.from({ length: N_NODES }, (_, i) => ({
    x: pad + rng() * (w - pad * 2),
    y: pad + rng() * (h - pad * 2),
    vx: (rng() - 0.5) * 0.18,
    vy: (rng() - 0.5) * 0.18,
    r: 3, baseR: 2.6 + rng() * 1.9,
    cr: 0, cg: 212, cb: 255,
    tr: 0, tg: 212, tb: 255,
    alpha: ALPHA.idle, tAlpha: ALPHA.idle,
    phase: rng() * Math.PI * 2,
    zone: Math.min(Math.floor(i / ZONE_SZ), N_ZONES - 1),
  }))
}

function buildEdges(nodes: Node[], w: number, h: number): Edge[] {
  const rng = seededRng(97)
  const thresh = Math.min(w, h) * 0.36
  const edges: Edge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      if (
        Math.sqrt(dx * dx + dy * dy) < thresh ||
        (nodes[i].zone !== nodes[j].zone && rng() < 0.08)
      ) {
        edges.push({ a: i, b: j, particles: [] })
      }
    }
  }
  return edges
}

function zoneCentroid(nodes: Node[], zone: number): [number, number] {
  const zn = nodes.filter(n => n.zone === zone)
  return [
    zn.reduce((s, n) => s + n.x, 0) / zn.length,
    zn.reduce((s, n) => s + n.y, 0) / zn.length,
  ]
}

// ─── State application (called on each agents prop change) ──────────────────

function applyStatuses(anim: Anim, agents: Record<string, AgentState> | undefined) {
  const safeAgents = agents ?? {}
  const next = AGENT_KEYS.map(k => (safeAgents[k]?.status ?? 'idle') as AgentStatus)

  for (let z = 0; z < N_ZONES; z++) {
    const prev = anim.statuses[z]
    const curr = next[z]
    if (prev === curr) continue

    const [cx, cy] = zoneCentroid(anim.nodes, z)

    if (curr === 'running') {
      anim.ripples.push({ x: cx, y: cy, r: 5, maxR: 110, rgb: RGB.running, alpha: 0.65 })
    }
    if (curr === 'complete') {
      anim.ripples.push({ x: cx, y: cy, r: 5, maxR: 180, rgb: RGB.complete, alpha: 0.80 })
    }
    if (curr === 'error' || curr === 'partial' || curr === 'blocked') {
      anim.ripples.push({ x: cx, y: cy, r: 5, maxR: 90, rgb: RGB[curr], alpha: 0.70 })
    }
  }

  // Update per-node targets
  for (const n of anim.nodes) {
    const s = next[n.zone]
    const [tr, tg, tb] = RGB[s] ?? RGB.idle
    n.tr = tr; n.tg = tg; n.tb = tb
    n.tAlpha = ALPHA[s] ?? ALPHA.idle
  }

  anim.statuses = next

  // Full-canvas green pulse when all finish (fires once)
  if (!anim.allCompleteRippled && next.every(s => s === 'complete')) {
    anim.ripples.push({
      x: anim.w / 2, y: anim.h / 2,
      r: 5, maxR: Math.hypot(anim.w, anim.h) * 0.85,
      rgb: RGB.complete, alpha: 0.55,
    })
    anim.allCompleteRippled = true
  }
}

// ─── Physics tick ────────────────────────────────────────────────────────────

function tick(anim: Anim, dt: number) {
  const { nodes, edges, ripples, statuses, w, h } = anim
  const pad = 38
  // Frame-rate independent lerp factor: 5% per frame at 60fps
  const ls = 1 - Math.pow(0.05, dt)

  for (const n of nodes) {
    const s = statuses[n.zone]
    const spd = s === 'running' ? 1.5 : s === 'complete' ? 0.10 : 0.35

    n.x += n.vx * spd * dt * 60
    n.y += n.vy * spd * dt * 60

    if (n.x < pad) { n.vx = Math.abs(n.vx); n.x = pad }
    if (n.x > w - pad) { n.vx = -Math.abs(n.vx); n.x = w - pad }
    if (n.y < pad) { n.vy = Math.abs(n.vy); n.y = pad }
    if (n.y > h - pad) { n.vy = -Math.abs(n.vy); n.y = h - pad }

    n.cr += (n.tr - n.cr) * ls
    n.cg += (n.tg - n.cg) * ls
    n.cb += (n.tb - n.cb) * ls
    n.alpha += (n.tAlpha - n.alpha) * ls

    n.r = n.baseR * (s === 'running' ? 1 + 0.45 * Math.sin(anim.time * 5 + n.phase) : 1)
  }

  for (const e of edges) {
    const sa = statuses[nodes[e.a].zone]
    const sb = statuses[nodes[e.b].zone]
    const active = sa === 'running' || sb === 'running'

    if (active && e.particles.length < 2 && Math.random() < 0.018) {
      e.particles.push({ t: 0, spd: 0.009 + Math.random() * 0.013 })
    }
    e.particles = e.particles.filter(p => {
      p.t += p.spd * dt * 60
      return p.t < 1
    })
  }

  anim.ripples = ripples.filter(rp => {
    rp.r += 88 * dt
    rp.alpha *= Math.pow(0.982, dt * 60)
    return rp.alpha > 0.008 && rp.r < rp.maxR
  })

  anim.time += dt
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render(ctx: CanvasRenderingContext2D, anim: Anim) {
  const { nodes, edges, ripples, statuses, w, h } = anim

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#080B14'
  ctx.fillRect(0, 0, w, h)

  // Edges
  ctx.lineWidth = 0.65
  for (const e of edges) {
    const na = nodes[e.a]
    const nb = nodes[e.b]
    const sa = statuses[na.zone]
    const sb = statuses[nb.zone]
    const bothDone = sa === 'complete' && sb === 'complete'
    const anyRun  = sa === 'running'  || sb === 'running'
    const alpha   = bothDone ? 0.11 : anyRun ? 0.17 : 0.045
    const [r, g, b] = bothDone ? RGB.complete : RGB.idle

    ctx.beginPath()
    ctx.moveTo(na.x, na.y)
    ctx.lineTo(nb.x, nb.y)
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.stroke()
  }

  // Particles (batch shadowBlur settings)
  ctx.shadowBlur  = 9
  ctx.shadowColor = 'rgba(0,212,255,0.85)'
  ctx.fillStyle   = 'rgba(0,212,255,0.9)'

  for (const e of edges) {
    if (e.particles.length === 0) continue
    const na = nodes[e.a]
    const nb = nodes[e.b]
    for (const p of e.particles) {
      ctx.beginPath()
      ctx.arc(
        na.x + (nb.x - na.x) * p.t,
        na.y + (nb.y - na.y) * p.t,
        1.8, 0, Math.PI * 2,
      )
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0

  // Ripples
  ctx.lineWidth = 1.6
  for (const rp of ripples) {
    ctx.beginPath()
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${rp.rgb[0]},${rp.rgb[1]},${rp.rgb[2]},${rp.alpha.toFixed(3)})`
    ctx.stroke()
  }

  // Nodes — glow via shadowBlur, then crisp core
  for (const n of nodes) {
    const s    = statuses[n.zone]
    const cr   = Math.round(n.cr)
    const cg   = Math.round(n.cg)
    const cb   = Math.round(n.cb)
    const a    = n.alpha

    ctx.shadowBlur  = s === 'running' ? 18 : s === 'complete' ? 12 : 5
    ctx.shadowColor = `rgba(${cr},${cg},${cb},${a})`

    ctx.beginPath()
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AgentVisualizerProps {
  agents?: Record<string, AgentState>
}

export default function AgentVisualizer({ agents = {} }: AgentVisualizerProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const animRef     = useRef<Anim | null>(null)
  const agentsRef   = useRef(agents)
  const rafRef      = useRef(0)
  const prevTsRef   = useRef(0)

  // Keep agentsRef current and propagate changes to anim without re-renders
  useEffect(() => {
    agentsRef.current = agents
    if (animRef.current) applyStatuses(animRef.current, agents)
  }, [agents])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const init = () => {
      const parent = canvas.parentElement!
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(parent.clientWidth, 320)
      const h = Math.max(parent.clientHeight, 280)

      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const prevStatuses = animRef.current?.statuses
      const prevRippled  = animRef.current?.allCompleteRippled ?? false

      const nodes = buildNodes(w, h)
      const anim: Anim = {
        nodes,
        edges: buildEdges(nodes, w, h),
        ripples: [],
        statuses: prevStatuses ?? (Array(N_ZONES).fill('idle') as AgentStatus[]),
        allCompleteRippled: prevRippled,
        time: 0, w, h,
      }
      animRef.current = anim
      applyStatuses(anim, agentsRef.current)
    }

    init()

    const ro = new ResizeObserver(init)
    ro.observe(canvas.parentElement!)

    const loop = (ts: number) => {
      const dt = Math.min((ts - prevTsRef.current) / 1000, 0.05)
      prevTsRef.current = ts
      if (animRef.current) {
        tick(animRef.current, dt)
        render(ctx, animRef.current)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(ts => {
      prevTsRef.current = ts
      rafRef.current = requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative w-full" style={{ height: 360 }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  )
}
