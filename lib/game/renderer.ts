import type { Entity, Camera, GameMap, Resource, Effect, Projectile } from './types'
import { FACTIONS, UNITS, BUILDINGS } from './factions'
import type { EffectsManager } from './engine'

const TILE_SIZE = 32
const FOG_SIZE = 24

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  screenX: number,
  screenY: number,
  zoom: number,
  isAlly: boolean,
  gameTime: number
) {
  const faction = FACTIONS[entity.faction]
  const size = entity.size * zoom
  const color = isAlly ? faction.color : '#E44444'
  const darker = isAlly ? faction.darkColor : '#882222'
  const lighter = isAlly ? faction.lightColor : '#FFAAAA'

  // Selection ring
  if (entity.selected) {
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(screenX, screenY + size * 0.5, size * 1.2, size * 0.7, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Health bar
    const barWidth = size * 2.2
    const barHeight = 4 * zoom
    const barY = screenY - size - 12 * zoom

    ctx.fillStyle = '#000000'
    ctx.fillRect(
      screenX - barWidth / 2 - 1,
      barY - 1,
      barWidth + 2,
      entity.maxShield > 0 ? barHeight * 2 + 3 : barHeight + 2
    )

    // Shield bar
    if (entity.maxShield > 0) {
      ctx.fillStyle = '#44AAFF'
      ctx.fillRect(
        screenX - barWidth / 2,
        barY,
        barWidth * (entity.shield / entity.maxShield),
        barHeight
      )
    }

    // Health bar
    const hpY = entity.maxShield > 0 ? barY + barHeight + 1 : barY
    const hpPercent = entity.hp / entity.maxHp
    ctx.fillStyle = hpPercent > 0.6 ? '#00FF00' : hpPercent > 0.3 ? '#FFAA00' : '#FF0000'
    ctx.fillRect(screenX - barWidth / 2, hpY, barWidth * hpPercent, barHeight)
  }

  if (entity.isBuilding) {
    // Building under construction
    if (entity.built < 1) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(screenX - size, screenY - size, size * 2, size * 2)
      ctx.setLineDash([])

      ctx.fillStyle = color
      ctx.globalAlpha = 0.3
      ctx.fillRect(
        screenX - size,
        screenY - size + size * 2 * (1 - entity.built),
        size * 2,
        size * 2 * entity.built
      )
      ctx.globalAlpha = 1

      ctx.fillStyle = '#FFFFFF'
      ctx.font = `${10 * zoom}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.floor(entity.built * 100)}%`, screenX, screenY)
      return
    }

    // Completed building rendering by faction
    if (entity.faction === 'terran') {
      // Terran mechanical style
      ctx.fillStyle = darker
      ctx.fillRect(screenX - size, screenY - size, size * 2, size * 2)
      ctx.fillStyle = '#334455'
      ctx.fillRect(screenX - size + 2 * zoom, screenY - size + 2 * zoom, size * 2 - 4 * zoom, size * 2 - 4 * zoom)
      ctx.fillStyle = color
      ctx.fillRect(screenX - size * 0.6, screenY - size * 0.6, size * 1.2, size * 1.2)

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(screenX - size, screenY)
      ctx.lineTo(screenX + size, screenY)
      ctx.moveTo(screenX, screenY - size)
      ctx.lineTo(screenX, screenY + size)
      ctx.stroke()
    } else if (entity.faction === 'protoss') {
      // Protoss psionic glow style
      ctx.shadowBlur = 10 * zoom
      ctx.shadowColor = color
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#EEDDAA'
      ctx.beginPath()
      ctx.arc(screenX, screenY, size * 0.7, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#44AAFF'
      ctx.beginPath()
      ctx.arc(screenX, screenY, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Zerg organic style
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.ellipse(screenX, screenY, size, size * 0.9, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(screenX, screenY - size * 0.2, size * 0.6, size * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Pulsing core
      const pulse = (Math.sin(gameTime / 200) + 1) / 2
      ctx.fillStyle = '#FF8888'
      ctx.beginPath()
      ctx.arc(screenX, screenY, size * 0.2 + pulse * 2 * zoom, 0, Math.PI * 2)
      ctx.fill()
    }

    // Production progress
    if (entity.producing) {
      const unitData = UNITS[entity.producing]
      if (unitData) {
        const progress = 1 - (entity.productionEnd - gameTime) / (unitData.buildTime * 1000)
        ctx.fillStyle = '#000000'
        ctx.fillRect(screenX - size, screenY + size + 5 * zoom, size * 2, 4 * zoom)
        ctx.fillStyle = '#FFFF00'
        ctx.fillRect(
          screenX - size,
          screenY + size + 5 * zoom,
          size * 2 * Math.max(0, Math.min(1, progress)),
          4 * zoom
        )
      }
    }
  } else {
    // Unit rendering
    const facing = entity.target
      ? Math.atan2(entity.target.y - entity.y, entity.target.x - entity.x)
      : Math.atan2(entity.vy, entity.vx) || 0

    ctx.save()
    ctx.translate(screenX, screenY)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.ellipse(2 * zoom, size * 0.8, size * 0.8, size * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.rotate(facing)

    // Unit-specific rendering
    if (entity.type === 'siegetank') {
      ctx.fillStyle = darker
      ctx.fillRect(-size, -size * 0.7, size * 2, size * 1.4)
      ctx.fillStyle = color
      ctx.fillRect(-size * 0.6, -size * 0.5, size * 1.2, size)
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, -2 * zoom, size * 1.2, 4 * zoom)

      if (entity.sieged) {
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(0, 0, size, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (['marine', 'marauder', 'reaper'].includes(entity.type)) {
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.arc(0, 0, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#888888'
      ctx.fillRect(size * 0.4, -2 * zoom, size * 0.8, 4 * zoom)
    } else if (['zergling', 'hydralisk', 'roach'].includes(entity.type)) {
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.moveTo(size, 0)
      ctx.lineTo(-size, size * 0.8)
      ctx.lineTo(-size * 0.5, 0)
      ctx.lineTo(-size, -size * 0.8)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2)
      ctx.fill()
    } else if (['zealot'].includes(entity.type)) {
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.arc(0, 0, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // Psi blades
      ctx.strokeStyle = '#00FFFF'
      ctx.lineWidth = 2 * zoom
      ctx.shadowBlur = 5 * zoom
      ctx.shadowColor = '#00FFFF'
      ctx.beginPath()
      ctx.moveTo(size * 0.2, -size * 0.4)
      ctx.lineTo(size * 1.2, -size * 0.8)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 0.2, size * 0.4)
      ctx.lineTo(size * 1.2, size * 0.8)
      ctx.stroke()
      ctx.shadowBlur = 0
    } else if (['stalker', 'immortal', 'colossus'].includes(entity.type)) {
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.moveTo(size, 0)
      ctx.lineTo(-size * 0.5, size)
      ctx.lineTo(-size * 0.5, -size)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Default unit style
      ctx.fillStyle = darker
      ctx.beginPath()
      ctx.arc(0, 0, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(size * 0.5, -1 * zoom, size * 0.5, 2 * zoom)
    }

    ctx.restore()

    // Stim effect
    if (entity.buffs.some(b => b.type === 'stim')) {
      ctx.strokeStyle = '#FF0000'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.arc(screenX, screenY, size + 2 * zoom, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}

export function renderEffects(
  ctx: CanvasRenderingContext2D,
  effects: EffectsManager,
  camera: Camera
) {
  const now = Date.now()
  const zoom = camera.zoom

  // Render projectiles
  for (const p of effects.projectiles) {
    const screenX = (p.x - camera.x) * zoom
    const screenY = (p.y - camera.y) * zoom

    ctx.fillStyle =
      p.type === 'particle' ? '#44AAFF' :
      p.type === 'plasma' ? '#8888FF' :
      p.type === 'bullet' ? '#FFFF00' :
      p.type === 'acid' ? '#88FF44' :
      '#FFAA00'

    ctx.beginPath()
    ctx.arc(screenX, screenY, (p.type === 'plasma' ? 6 : 3) * zoom, 0, Math.PI * 2)
    ctx.fill()
  }

  // Render effects
  for (const effect of effects.effects) {
    const screenX = (effect.x - camera.x) * zoom
    const screenY = (effect.y - camera.y) * zoom
    const progress = (now - effect.start) / effect.duration

    ctx.globalAlpha = 1 - progress

    switch (effect.type) {
      case 'hit':
        ctx.fillStyle = '#FFAA88'
        ctx.beginPath()
        ctx.arc(screenX, screenY, (5 + progress * 15) * zoom, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'blueHit':
        ctx.fillStyle = '#88AAFF'
        ctx.beginPath()
        ctx.arc(screenX, screenY, (4 + progress * 12) * zoom, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'explosion':
        ctx.fillStyle = '#FF8800'
        ctx.beginPath()
        ctx.arc(screenX, screenY, (15 + progress * 50) * zoom, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'death':
        for (let i = 0; i < 5; i++) {
          const angle = progress * Math.PI * 2 + i * 1.26
          const dist = progress * 25 * zoom
          ctx.fillStyle = '#FF8844'
          ctx.beginPath()
          ctx.arc(
            screenX + Math.cos(angle) * dist,
            screenY + Math.sin(angle) * dist,
            3 * zoom,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
        break

      case 'move':
        ctx.strokeStyle = '#00FF00'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(
          screenX,
          screenY,
          (effect.radius || 15) * (1 - progress * 0.5) * zoom,
          0,
          Math.PI * 2
        )
        ctx.stroke()
        break

      case 'attack':
        ctx.strokeStyle = '#FF4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(screenX - 8 * zoom, screenY - 8 * zoom)
        ctx.lineTo(screenX + 8 * zoom, screenY + 8 * zoom)
        ctx.moveTo(screenX + 8 * zoom, screenY - 8 * zoom)
        ctx.lineTo(screenX - 8 * zoom, screenY + 8 * zoom)
        ctx.stroke()
        break

      case 'warp':
        ctx.strokeStyle = '#44AAFF'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(screenX, screenY, (effect.radius || 20) * zoom, 0, Math.PI * 2)
        ctx.stroke()
        break

      case 'build':
        ctx.strokeStyle = '#88FF88'
        ctx.lineWidth = 2
        const sz = (effect.size || 20) * zoom
        ctx.strokeRect(screenX - sz, screenY - sz, sz * 2, sz * 2)
        break
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

  // Resources
  ctx.fillStyle = '#44AAFF'
  for (const m of map.minerals) {
    if (m.amount > 0) {
      ctx.fillRect(m.x * scaleX - 2, m.y * scaleY - 2, 4, 4)
    }
  }

  ctx.fillStyle = '#44FF44'
  for (const g of map.geysers) {
    if (g.amount > 0) {
      ctx.fillRect(g.x * scaleX - 2, g.y * scaleY - 2, 4, 4)
    }
  }

  // Entities
  for (const entity of entities) {
    if (entity.hp <= 0) continue

    const fx = Math.floor(entity.x / FOG_SIZE)
    const fy = Math.floor(entity.y / FOG_SIZE)
    if (entity.team === 1 && fogVisible[fy * map.cols + fx] === 0) continue

    ctx.fillStyle = entity.team === 0 ? (entity.selected ? '#FFFF00' : '#00FF00') : '#FF0000'
    const entitySize = entity.isBuilding ? 2 : 1
    ctx.fillRect(
      entity.x * scaleX - entitySize,
      entity.y * scaleY - entitySize,
      entitySize * 2,
      entitySize * 2
    )
  }

  // Camera viewport
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  ctx.strokeRect(
    camera.x * scaleX,
    camera.y * scaleY,
    (canvasWidth / camera.zoom) * scaleX,
    (canvasHeight / camera.zoom) * scaleY
  )
}
