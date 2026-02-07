import type { Entity, Camera, GameMap, Resource, Effect, Projectile } from './types'
import { FACTIONS, UNITS, BUILDINGS } from './factions'
import type { EffectsManager } from './engine'

const TILE_SIZE = 32
const FOG_SIZE = 24

// Isometric Projection Helpers
export function toIso(x: number, y: number): { x: number; y: number } {
  return {
    x: x - y,
    y: (x + y) / 2,
  }
}

export function toWorldFromIso(
  screenX: number,
  screenY: number,
  camX: number,
  camY: number,
  zoom: number
): { x: number; y: number } {
  const isoX = screenX / zoom + camX
  const isoY = screenY / zoom + camY
  return {
    x: (isoX + 2 * isoY) / 2,
    y: (2 * isoY - isoX) / 2,
  }
}

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
) {
  const zoom = camera.zoom
  const gridSize = TILE_SIZE

  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 1
  ctx.beginPath()

  // We can't easily iterate screen pixels for an iso grid, so we iterate map coordinates
  // Optimization: Calculate visible map bounds? For now, iterate whole map or a safe subset
  // Given map size might be large, we should optimize.
  // But for this "clone", map isn't huge (3200x2400).
  // Let's just iterate logical grid lines.

  // Vertical lines (constant X)
  for (let x = 0; x <= map.width; x += gridSize) {
    const start = toIso(x, 0)
    const end = toIso(x, map.height)

    const sx1 = (start.x - camera.x) * zoom
    const sy1 = (start.y - camera.y) * zoom
    const sx2 = (end.x - camera.x) * zoom
    const sy2 = (end.y - camera.y) * zoom

    // Simple culling
    if (
      Math.max(sx1, sx2) < 0 ||
      Math.min(sx1, sx2) > canvasWidth ||
      Math.max(sy1, sy2) < 0 ||
      Math.min(sy1, sy2) > canvasHeight
    ) {
      continue
    }

    ctx.moveTo(sx1, sy1)
    ctx.lineTo(sx2, sy2)
  }

  // Horizontal lines (constant Y)
  for (let y = 0; y <= map.height; y += gridSize) {
    const start = toIso(0, y)
    const end = toIso(map.width, y)

    const sx1 = (start.x - camera.x) * zoom
    const sy1 = (start.y - camera.y) * zoom
    const sx2 = (end.x - camera.x) * zoom
    const sy2 = (end.y - camera.y) * zoom

    if (
      Math.max(sx1, sx2) < 0 ||
      Math.min(sx1, sx2) > canvasWidth ||
      Math.max(sy1, sy2) < 0 ||
      Math.min(sy1, sy2) > canvasHeight
    ) {
      continue
    }

    ctx.moveTo(sx1, sy1)
    ctx.lineTo(sx2, sy2)
  }
  ctx.stroke()
}

export function renderMapObjects(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
  gameTime: number
) {
  const zoom = camera.zoom

  // Zerg Creep (Simulated for now)
  // To do it properly in iso, we'd draw diamond shapes for creep tiles.
  // For simplicity, let's skip complex creep rendering or just do simple ellipses?
  // Let's stick to what was there but projected.

  // Obstacles
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (map.grid[y][x] === 1) {
        const wx = x * TILE_SIZE
        const wy = y * TILE_SIZE

        // Center of the tile
        const center = toIso(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2)
        const sx = (center.x - camera.x) * zoom
        const sy = (center.y - camera.y) * zoom

        if (sx > -100 && sx < canvasWidth + 100 && sy > -100 && sy < canvasHeight + 100) {
          // Draw a 3D block
          const size = TILE_SIZE * zoom
          const height = size * 0.8

          // Top face (Diamond)
          ctx.fillStyle = '#353548'
          ctx.beginPath()
          ctx.moveTo(sx, sy - height - size * 0.25) // Top
          ctx.lineTo(sx + size * 0.5, sy - height)   // Right
          ctx.lineTo(sx, sy - height + size * 0.25)  // Bottom
          ctx.lineTo(sx - size * 0.5, sy - height)   // Left
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#555566'
          ctx.stroke()

          // Side faces
          ctx.fillStyle = '#252538'
          ctx.beginPath()
          ctx.moveTo(sx - size * 0.5, sy - height)
          ctx.lineTo(sx, sy - height + size * 0.25)
          ctx.lineTo(sx, sy + size * 0.25)
          ctx.lineTo(sx - size * 0.5, sy)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = '#151520'
          ctx.beginPath()
          ctx.moveTo(sx + size * 0.5, sy - height)
          ctx.lineTo(sx, sy - height + size * 0.25)
          ctx.lineTo(sx, sy + size * 0.25)
          ctx.lineTo(sx + size * 0.5, sy)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
  }

  // Resources
  for (const m of map.minerals) {
    if (m.amount <= 0) continue
    const iso = toIso(m.x, m.y)
    const sx = (iso.x - camera.x) * zoom
    const sy = (iso.y - camera.y) * zoom

    if (sx > -40 && sx < canvasWidth + 40 && sy > -40 && sy < canvasHeight + 40) {
      ctx.fillStyle = `rgba(80,180,255,${0.6 + (m.amount / 3000) * 0.4})`

      // Draw crystal shape
      const w = 10 * zoom
      const h = 14 * zoom
      ctx.beginPath()
      ctx.moveTo(sx, sy - h)
      ctx.lineTo(sx + w, sy - h * 0.5)
      ctx.lineTo(sx, sy)
      ctx.lineTo(sx - w, sy - h * 0.5)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = '#AADDFF'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  for (const g of map.geysers) {
    if (g.amount <= 0) continue
    const iso = toIso(g.x, g.y)
    const sx = (iso.x - camera.x) * zoom
    const sy = (iso.y - camera.y) * zoom

    if (sx > -40 && sx < canvasWidth + 40 && sy > -40 && sy < canvasHeight + 40) {
      ctx.fillStyle = `rgba(80,255,80,${0.5 + (g.amount / 5000) * 0.5})`

      // Draw elliptical geyser
      ctx.beginPath()
      ctx.ellipse(sx, sy, 18 * zoom, 10 * zoom, 0, 0, Math.PI * 2)
      ctx.fill()

      // Smoke
      const pulse = (Math.sin(gameTime / 500) + 1) / 2
      ctx.fillStyle = `rgba(100,255,100,${0.2 * pulse})`
      ctx.beginPath()
      ctx.arc(sx, sy - 20 * zoom - pulse * 20 * zoom, 10 * zoom + pulse * 10 * zoom, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function renderFog(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  camera: Camera,
  fogExplored: Uint8Array,
  fogVisible: Uint8Array,
  canvasWidth: number,
  canvasHeight: number
) {
  const zoom = camera.zoom
  // For fog, iterating tiles and drawing diamonds is expensive.
  // We can try to optimize by drawing larger chunks or just iterating.
  // Given FOG_SIZE = 24, and map size, there are many tiles.
  // But we only draw visible ones.

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const idx = y * map.cols + x
      if (fogVisible[idx] === 0) {
        const opacity = fogExplored[idx] === 1 ? 0.5 : 0.85
        ctx.fillStyle = `rgba(0,0,0,${opacity})`

        const wx = x * FOG_SIZE
        const wy = y * FOG_SIZE
        const center = toIso(wx + FOG_SIZE / 2, wy + FOG_SIZE / 2)
        const sx = (center.x - camera.x) * zoom
        const sy = (center.y - camera.y) * zoom

        // Draw diamond
        // Size of diamond:
        // Width = FOG_SIZE * sqrt(2) * zoom? No, width is FOG_SIZE * 2 in iso projection usually?
        // toIso((x,0)) -> (x, x/2)
        // Delta X = FOG_SIZE -> Iso dX = FOG_SIZE
        // Delta Y = FOG_SIZE -> Iso dY = FOG_SIZE/2

        // Corners:
        // (0,0) -> (0,0)
        // (F,0) -> (F, F/2)
        // (0,F) -> (-F, F/2)
        // (F,F) -> (0, F)

        // So width of diamond is 2F, height is F.

        if (sx > -FOG_SIZE * 2 * zoom && sx < canvasWidth + FOG_SIZE * 2 * zoom &&
            sy > -FOG_SIZE * zoom && sy < canvasHeight + FOG_SIZE * zoom) {

          ctx.beginPath()
          ctx.moveTo(sx, sy - FOG_SIZE/2 * zoom)
          ctx.lineTo(sx + FOG_SIZE * zoom, sy)
          ctx.lineTo(sx, sy + FOG_SIZE/2 * zoom)
          ctx.lineTo(sx - FOG_SIZE * zoom, sy)
          ctx.fill()
        }
      }
    }
  }
}

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  screenX: number, // These should be passed as Iso projected coordinates converted to screen
  screenY: number,
  zoom: number,
  isAlly: boolean,
  gameTime: number
) {
  const faction = FACTIONS[entity.faction]
  const size = entity.size * zoom
  const color = isAlly ? faction.color : '#E44444'
  const darker = isAlly ? faction.darkColor : '#882222'

  // Selection ring (Iso: Ellipse with 2:1 ratio)
  if (entity.selected) {
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(screenX, screenY, size * 1.5, size * 0.75, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Health bar above unit
    const barWidth = size * 2.5
    const barHeight = 4 * zoom
    // Height offset depends on unit height roughly
    const barY = screenY - size - 20 * zoom

    ctx.fillStyle = '#000000'
    ctx.fillRect(
      screenX - barWidth / 2 - 1,
      barY - 1,
      barWidth + 2,
      entity.maxShield > 0 ? barHeight * 2 + 3 : barHeight + 2
    )

    if (entity.maxShield > 0) {
      ctx.fillStyle = '#44AAFF'
      ctx.fillRect(
        screenX - barWidth / 2,
        barY,
        barWidth * (entity.shield / entity.maxShield),
        barHeight
      )
    }

    const hpY = entity.maxShield > 0 ? barY + barHeight + 1 : barY
    const hpPercent = entity.hp / entity.maxHp
    ctx.fillStyle = hpPercent > 0.6 ? '#00FF00' : hpPercent > 0.3 ? '#FFAA00' : '#FF0000'
    ctx.fillRect(screenX - barWidth / 2, hpY, barWidth * hpPercent, barHeight)
  }

  if (entity.isBuilding) {
    // 3D Building
    const buildHeight = size * 1.5 // Make buildings tall
    const baseY = screenY + size * 0.5 // Base of building on ground

    if (entity.built < 1) {
      // Wireframe construction
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])

      // Draw diamond base
      ctx.beginPath()
      ctx.moveTo(screenX, baseY)
      ctx.lineTo(screenX + size, baseY - size * 0.5)
      ctx.lineTo(screenX, baseY - size)
      ctx.lineTo(screenX - size, baseY - size * 0.5)
      ctx.closePath()
      ctx.stroke()

      ctx.setLineDash([])

      // Filling up
      const currentHeight = buildHeight * entity.built
      ctx.fillStyle = color
      ctx.globalAlpha = 0.5
      ctx.fillRect(screenX - size, baseY - currentHeight, size * 2, currentHeight)
      ctx.globalAlpha = 1

      ctx.fillStyle = '#FFFFFF'
      ctx.font = `${10 * zoom}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.floor(entity.built * 100)}%`, screenX, screenY - buildHeight)
      return
    }

    // Draw solid building
    // Top Face
    ctx.fillStyle = darker
    ctx.beginPath()
    ctx.moveTo(screenX, baseY - buildHeight)
    ctx.lineTo(screenX + size, baseY - buildHeight - size * 0.5)
    ctx.lineTo(screenX, baseY - buildHeight - size)
    ctx.lineTo(screenX - size, baseY - buildHeight - size * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#000'
    ctx.stroke()

    // Right Face
    ctx.fillStyle = '#111' // Shadowed side
    ctx.beginPath()
    ctx.moveTo(screenX, baseY)
    ctx.lineTo(screenX + size, baseY - size * 0.5)
    ctx.lineTo(screenX + size, baseY - buildHeight - size * 0.5)
    ctx.lineTo(screenX, baseY - buildHeight)
    ctx.closePath()
    ctx.fill()

    // Left Face
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(screenX, baseY)
    ctx.lineTo(screenX - size, baseY - size * 0.5)
    ctx.lineTo(screenX - size, baseY - buildHeight - size * 0.5)
    ctx.lineTo(screenX, baseY - buildHeight)
    ctx.closePath()
    ctx.fill()

  } else {
    // Unit (Simple billboard or flat sprite for now, maybe sphere?)
    // Let's draw units as spheres/ellipsoids with a shadow

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.ellipse(screenX, screenY, size, size * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Unit Body
    const unitHeight = size * 0.8
    const bodyY = screenY - unitHeight

    ctx.fillStyle = darker
    ctx.beginPath()
    ctx.arc(screenX, bodyY, size * 0.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(screenX, bodyY, size * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // Direction indicator
    const facing = entity.target
      ? Math.atan2(entity.target.y - entity.y, entity.target.x - entity.x)
      : Math.atan2(entity.vy, entity.vx) || 0

    // Project angle to iso?
    // Map angle to screen angle roughly.
    // dx = cos(a), dy = sin(a)
    // screenDx = dx - dy
    // screenDy = (dx + dy) / 2
    const dx = Math.cos(facing)
    const dy = Math.sin(facing)
    const sdx = dx - dy
    const sdy = (dx + dy) / 2
    const mag = Math.sqrt(sdx*sdx + sdy*sdy)

    ctx.strokeStyle = '#FFF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(screenX, bodyY)
    ctx.lineTo(screenX + (sdx/mag) * size, bodyY + (sdy/mag) * size)
    ctx.stroke()
  }
}

export function renderEffects(
  ctx: CanvasRenderingContext2D,
  effects: EffectsManager,
  camera: Camera
) {
  const now = Date.now()
  const zoom = camera.zoom

  for (const p of effects.projectiles) {
    const iso = toIso(p.x, p.y)
    const screenX = (iso.x - camera.x) * zoom
    const screenY = (iso.y - camera.y) * zoom

    ctx.fillStyle = '#FFFF00' // Simplified color
    ctx.beginPath()
    ctx.arc(screenX, screenY - 10 * zoom, 3 * zoom, 0, Math.PI * 2) // Floating slightly
    ctx.fill()
  }

  for (const effect of effects.effects) {
    const iso = toIso(effect.x, effect.y)
    const screenX = (iso.x - camera.x) * zoom
    const screenY = (iso.y - camera.y) * zoom
    const progress = (now - effect.start) / effect.duration

    ctx.globalAlpha = 1 - progress

    if (effect.type === 'move') {
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(screenX, screenY, (effect.radius || 15) * (1 - progress * 0.5) * zoom * 1.5, (effect.radius || 15) * (1 - progress * 0.5) * zoom * 0.75, 0, 0, Math.PI*2)
      ctx.stroke()
    } else {
        // Generic circle for others
        ctx.fillStyle = '#FFAA88'
        ctx.beginPath()
        ctx.arc(screenX, screenY - 10, (5 + progress * 15) * zoom, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  entities: Entity[],
  camera: Camera,
  fogExplored: Uint8Array,
  fogVisible: Uint8Array,
  canvasWidth: number,
  canvasHeight: number,
  minimapWidth: number,
  minimapHeight: number
) {
  // Minimap stays top-down for clarity
  const scaleX = minimapWidth / map.width
  const scaleY = minimapHeight / map.height

  // Background
  ctx.fillStyle = '#0C0C14'
  ctx.fillRect(0, 0, minimapWidth, minimapHeight)

  // Explored areas
  ctx.fillStyle = '#1A1A28'
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (fogExplored[y * map.cols + x] === 1) {
        ctx.fillRect(
          x * FOG_SIZE * scaleX,
          y * FOG_SIZE * scaleY,
          FOG_SIZE * scaleX + 1,
          FOG_SIZE * scaleY + 1
        )
      }
    }
  }

  // Entities
  for (const entity of entities) {
    if (entity.hp <= 0) continue
    const fx = Math.floor(entity.x / FOG_SIZE)
    const fy = Math.floor(entity.y / FOG_SIZE)
    if (entity.team === 1 && fogVisible[fy * map.cols + fx] === 0) continue
    ctx.fillStyle = entity.team === 0 ? '#00FF00' : '#FF0000'
    ctx.fillRect(entity.x * scaleX - 1, entity.y * scaleY - 1, 3, 3)
  }

  // Camera viewport (Projected roughly back to top-down rect)
  // Since camera is now iso-based, this is tricky.
  // We approximate the center.
  // Iso Camera X/Y is roughly (x-y), (x+y)/2.
  // Inverting is complex to show exact shape.
  // Let's just show a box around the center point.

  const isoCenter = { x: camera.x + (canvasWidth/2)/camera.zoom, y: camera.y + (canvasHeight/2)/camera.zoom }
  const worldCenter = toWorldFromIso(isoCenter.x * camera.zoom, isoCenter.y * camera.zoom, 0, 0, camera.zoom) // Hacky
  // Actually, we can use the helper directly
  // Center of screen:
  const centerWorld = toWorldFromIso(canvasWidth/2, canvasHeight/2, camera.x, camera.y, camera.zoom)

  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  const viewW = (canvasWidth / camera.zoom) * scaleX
  const viewH = (canvasHeight / camera.zoom) * scaleY
  ctx.strokeRect(
    centerWorld.x * scaleX - viewW/2,
    centerWorld.y * scaleY - viewH/2,
    viewW,
    viewH
  )
}
