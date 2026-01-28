import type {
  Entity,
  Resource,
  Resources,
  GameMap,
  Projectile,
  Effect,
  Command,
  BuildQueueItem,
  FactionId,
  DifficultyLevel,
  GameResult,
} from './types'
import { FACTIONS, UNITS, BUILDINGS, ABILITIES } from './factions'

const TILE_SIZE = 32
const FOG_SIZE = 24

// Audio Manager
class AudioManager {
  private ctx: AudioContext | null = null

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  play(type: string) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    const t = this.ctx.currentTime
    const v = 0.05

    const sounds: Record<string, () => void> = {
      select: () => {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(500, t)
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.03)
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        osc.start(t)
        osc.stop(t + 0.08)
      },
      move: () => {
        osc.type = 'triangle'
        osc.frequency.value = 350
        gain.gain.setValueAtTime(v * 0.5, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
        osc.start(t)
        osc.stop(t + 0.05)
      },
      attack: () => {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(120, t)
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1)
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
        osc.start(t)
        osc.stop(t + 0.1)
      },
      laser: () => {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1000, t)
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.12)
        gain.gain.setValueAtTime(v * 0.6, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
        osc.start(t)
        osc.stop(t + 0.12)
      },
      death: () => {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.25)
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
        osc.start(t)
        osc.stop(t + 0.25)
      },
      build: () => {
        osc.type = 'square'
        osc.frequency.setValueAtTime(200, t)
        osc.frequency.setValueAtTime(350, t + 0.15)
        gain.gain.setValueAtTime(v * 0.4, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
      },
      complete: () => {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, t)
        osc.frequency.setValueAtTime(900, t + 0.15)
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
        osc.start(t)
        osc.stop(t + 0.25)
      },
      error: () => {
        osc.type = 'square'
        osc.frequency.value = 150
        gain.gain.setValueAtTime(v, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
        osc.start(t)
        osc.stop(t + 0.12)
      },
    }

    if (sounds[type]) sounds[type]()
  }
}

export const audio = new AudioManager()

// A* Pathfinding
export function findPath(
  grid: number[][],
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  maxIter = 400
): { x: number; y: number }[] {
  const cols = grid[0].length
  const rows = grid.length
  const toGrid = (v: number) => Math.floor(v / TILE_SIZE)

  let gx = Math.max(0, Math.min(cols - 1, toGrid(sx)))
  let gy = Math.max(0, Math.min(rows - 1, toGrid(sy)))
  let tx = Math.max(0, Math.min(cols - 1, toGrid(ex)))
  let ty = Math.max(0, Math.min(rows - 1, toGrid(ey)))

  if (gx === tx && gy === ty) return []

  // Find alternative if target is blocked
  if (grid[ty]?.[tx] === 1) {
    outer: for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx
          const ny = ty + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
            tx = nx
            ty = ny
            break outer
          }
        }
      }
    }
  }

  const open: { x: number; y: number; g: number; f: number; p: any }[] = [
    { x: gx, y: gy, g: 0, f: 0, p: null },
  ]
  const closed = new Set<number>()
  const key = (x: number, y: number) => (y << 16) | x

  while (open.length > 0 && closed.size < maxIter) {
    let minIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[minIdx].f) minIdx = i
    }
    const cur = open.splice(minIdx, 1)[0]

    if (cur.x === tx && cur.y === ty) {
      const path: { x: number; y: number }[] = []
      let n: any = cur
      while (n) {
        path.unshift({ x: n.x * TILE_SIZE + TILE_SIZE / 2, y: n.y * TILE_SIZE + TILE_SIZE / 2 })
        n = n.p
      }
      return path.slice(1)
    }

    closed.add(key(cur.x, cur.y))

    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1],
    ]

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx
      const ny = cur.y + dy

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue
      if (closed.has(key(nx, ny)) || grid[ny][nx] === 1) continue
      if (dx !== 0 && dy !== 0 && (grid[cur.y][nx] === 1 || grid[ny][cur.x] === 1)) continue

      const g = cur.g + (dx && dy ? 1.414 : 1)
      const h = Math.abs(nx - tx) + Math.abs(ny - ty)

      const idx = open.findIndex(n => n.x === nx && n.y === ny)
      if (idx === -1) {
        open.push({ x: nx, y: ny, g, f: g + h, p: cur })
      } else if (g < open[idx].g) {
        open[idx].g = g
        open[idx].f = g + h
        open[idx].p = cur
      }
    }
  }

  return [{ x: ex, y: ey }]
}

// Map Generator
export function generateMap(
  width = 3200,
  height = 2400,
  seed = Date.now()
): GameMap {
  const cols = Math.ceil(width / TILE_SIZE)
  const rows = Math.ceil(height / TILE_SIZE)

  // Seeded random
  const rng = ((s: number) => () => {
    let t = (s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  })(seed)

  const grid: number[][] = Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(0))

  // Generate obstacles
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Keep bases clear
      if ((x < 12 && y > rows - 12) || (x > cols - 12 && y < 12)) continue

      if (rng() < 0.02) {
        const sz = Math.floor(rng() * 4) + 2
        for (let dy = 0; dy < sz; dy++) {
          for (let dx = 0; dx < sz; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < cols && ny < rows && rng() < 0.7) {
              grid[ny][nx] = 1
            }
          }
        }
      }
    }
  }

  // Clear paths between bases
  const clearPath = (x1: number, y1: number, x2: number, y2: number, pw = 4) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const px = Math.floor(x1 + (x2 - x1) * t)
      const py = Math.floor(y1 + (y2 - y1) * t)
      for (let dy = -pw; dy <= pw; dy++) {
        for (let dx = -pw; dx <= pw; dx++) {
          const nx = px + dx
          const ny = py + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            grid[ny][nx] = 0
          }
        }
      }
    }
  }

  clearPath(8, rows - 8, cols - 8, 8, 5)
  clearPath(cols / 2, rows / 2, 8, rows - 8, 4)
  clearPath(cols / 2, rows / 2, cols - 8, 8, 4)

  // Base positions
  const bases = [
    { x: 150, y: height - 150 },
    { x: width - 150, y: 150 },
  ]

  const minerals: Resource[] = []
  const geysers: Resource[] = []

  // Generate resources for each base
  bases.forEach((b, i) => {
    const bx = Math.floor(b.x / TILE_SIZE)
    const by = Math.floor(b.y / TILE_SIZE)

    // Clear area around base
    for (let dy = -9; dy <= 9; dy++) {
      for (let dx = -9; dx <= 9; dx++) {
        const nx = bx + dx
        const ny = by + dy
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          grid[ny][nx] = 0
        }
      }
    }

    const baseAngle = i === 0 ? -Math.PI * 0.3 : Math.PI * 0.7

    // Add mineral patches
    for (let j = 0; j < 8; j++) {
      const a = baseAngle + (j - 4) * 0.17
      minerals.push({
        x: b.x + Math.cos(a) * (85 + (j % 2) * 15),
        y: b.y + Math.sin(a) * (85 + (j % 2) * 15),
        amount: 1500,
        workers: [],
      })
    }

    // Add geysers
    for (let j = 0; j < 2; j++) {
      geysers.push({
        x: b.x + Math.cos(baseAngle + (j === 0 ? -0.8 : 0.8)) * 120,
        y: b.y + Math.sin(baseAngle + (j === 0 ? -0.8 : 0.8)) * 120,
        amount: 2500,
        isGeyser: true,
        building: false,
        workers: [],
      })
    }
  })

  return { width, height, grid, cols, rows, bases, minerals, geysers, seed }
}

// Effects Manager
export class EffectsManager {
  projectiles: Projectile[] = []
  effects: Effect[] = []

  addProjectile(
    type: string,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    speed: number,
    damage: number,
    team: number,
    target: Entity | null,
    splash?: number
  ) {
    this.projectiles.push({
      type,
      x: sx,
      y: sy,
      targetX: tx,
      targetY: ty,
      speed,
      damage,
      team,
      target,
      born: Date.now(),
      splash,
    })
  }

  addEffect(type: string, x: number, y: number, duration = 500, extra: Partial<Effect> = {}) {
    this.effects.push({
      type,
      x,
      y,
      start: Date.now(),
      duration,
      ...extra,
    })
  }

  update(dt: number, applyDamage: (target: Entity, damage: number, projectile: Projectile) => void) {
    const now = Date.now()

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]

      // Track target
      if (p.target && p.target.hp > 0) {
        p.targetX = p.target.x
        p.targetY = p.target.y
      }

      const dx = p.targetX - p.x
      const dy = p.targetY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 15 || now - p.born > 4000) {
        if (dist < 25 && p.target && p.target.hp > 0) {
          applyDamage(p.target, p.damage, p)
          this.addEffect(p.type === 'particle' ? 'blueHit' : 'hit', p.targetX, p.targetY, 300)
        }
        this.projectiles.splice(i, 1)
      } else {
        const mv = (p.speed * dt) / 1000
        p.x += (dx / dist) * Math.min(mv, dist)
        p.y += (dy / dist) * Math.min(mv, dist)
      }
    }

    // Clean up effects
    this.effects = this.effects.filter(e => now - e.start < e.duration)
  }
}

// Main Game Engine
export class GameEngine {
  map: GameMap
  playerFaction: FactionId
  aiFaction: FactionId
  difficulty: DifficultyLevel

  entities: Entity[] = []
  entityId = 0

  playerResources: Resources = { minerals: 50, gas: 0, supply: 0, maxSupply: 0 }
  aiResources: Resources = { minerals: 50, gas: 0, supply: 0, maxSupply: 0 }

  selected: Entity[] = []
  controlGroups: Record<number, number[]> = {}

  playerBuildings = new Set<string>()
  aiBuildings = new Set<string>()

  buildQueue: BuildQueueItem[] = []
  aiBuildQueue: BuildQueueItem[] = []

  fogExplored: Uint8Array
  fogVisible: Uint8Array

  effects: EffectsManager
  gameTime = 0
  messages: { text: string; time: number }[] = []

  lastGroupTap: Record<number, number> = {}

  constructor(faction: FactionId, difficulty: DifficultyLevel = 'normal') {
    this.map = generateMap()
    this.playerFaction = faction

    // AI gets a random different faction
    const otherFactions = (['protoss', 'zerg', 'terran'] as FactionId[]).filter(f => f !== faction)
    this.aiFaction = otherFactions[Math.floor(Math.random() * otherFactions.length)]

    this.difficulty = difficulty

    this.fogExplored = new Uint8Array(this.map.cols * this.map.rows)
    this.fogVisible = new Uint8Array(this.map.cols * this.map.rows)

    this.effects = new EffectsManager()
  }

  init() {
    const playerFactionData = FACTIONS[this.playerFaction]
    const aiFactionData = FACTIONS[this.aiFaction]

    const playerBase = this.map.bases[0]
    const aiBase = this.map.bases[1]

    // Spawn player base and workers
    const pBase = this.spawnEntity(playerFactionData.baseBuilding, playerBase.x, playerBase.y, 0, true)
    if (pBase) pBase.rally = { x: playerBase.x, y: playerBase.y + 80 }

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const worker = this.spawnEntity(
        playerFactionData.workerUnit,
        playerBase.x + Math.cos(angle) * 50,
        playerBase.y + Math.sin(angle) * 50,
        0
      )
      if (worker && i < 8 && this.map.minerals[i]) {
        worker.harvesting = this.map.minerals[i]
        this.map.minerals[i].workers.push(worker.id)
      }
    }

    // Spawn AI base and workers
    const aBase = this.spawnEntity(aiFactionData.baseBuilding, aiBase.x, aiBase.y, 1, true)
    if (aBase) aBase.rally = { x: aiBase.x, y: aiBase.y - 80 }

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const worker = this.spawnEntity(
        aiFactionData.workerUnit,
        aiBase.x + Math.cos(angle) * 50,
        aiBase.y + Math.sin(angle) * 50,
        1
      )
      const mineralIdx = this.map.minerals.length - 1 - (i % 8)
      if (worker && i < 8 && this.map.minerals[mineralIdx]) {
        worker.harvesting = this.map.minerals[mineralIdx]
        this.map.minerals[mineralIdx].workers.push(worker.id)
      }
    }

    audio.init()
    this.addMessage('Game started - Good luck, Commander!')
  }

  spawnEntity(
    type: string,
    x: number,
    y: number,
    team: number,
    isBuilding = false,
    buildTime = 0
  ): Entity | null {
    const data = isBuilding ? BUILDINGS[type] : UNITS[type]
    if (!data) return null

    const faction = team === 0 ? this.playerFaction : this.aiFaction

    const entity: Entity = {
      id: this.entityId++,
      type,
      x,
      y,
      hp: buildTime > 0 ? data.hp * 0.1 : data.hp,
      maxHp: data.hp,
      shield: (data as any).shield || 0,
      maxShield: (data as any).shield || 0,
      armor: data.armor || 0,
      damage: (data as any).damage || 0,
      damageBonus: (data as any).damageBonus,
      attackSpeed: (data as any).attackSpeed || 0,
      range: ((data as any).range || 0),
      speed: (data as any).speed || 0,
      size: data.size,
      vision: (data.vision || 256),
      team,
      isBuilding,
      faction,

      selected: false,
      lastAttack: 0,
      lastHit: 0,
      target: null,
      attackMove: false,
      hold: false,
      patrol: null,

      commandQueue: [],
      path: [],
      pathIndex: 0,

      vx: 0,
      vy: 0,

      harvesting: null,
      harvestAmount: 0,
      returning: false,
      harvestCooldown: 0,

      producing: null,
      productionEnd: 0,
      productionQueue: [],
      rally: null,

      built: buildTime > 0 ? 0 : 1,
      buildProgress: 0,
      buildTotal: buildTime,
      constructing: null,

      canHarvest: (data as any).canHarvest || false,
      canBuild: (data as any).canBuild || false,
      flying: (data as any).flying || false,
      sieged: false,

      projectile: (data as any).projectile || null,
      projectileSpeed: 15 * TILE_SIZE,
      splash: (data as any).splash || 0,
      hits: (data as any).hits || 1,

      abilities: (data as any).abilities || [],
      cooldowns: {},
      energy: (data as any).energy || 0,
      maxEnergy: (data as any).maxEnergy || 0,
      buffs: [],
    }

    // Initialize ability cooldowns
    for (const ab of entity.abilities) {
      entity.cooldowns[ab] = 0
    }

    this.entities.push(entity)

    // Update supply and buildings
    if (isBuilding && entity.built >= 1) {
      const buildings = team === 0 ? this.playerBuildings : this.aiBuildings
      const resources = team === 0 ? this.playerResources : this.aiResources
      buildings.add(type)
      resources.maxSupply += (data as any).supplyProvided || 0
    }

    if (!isBuilding) {
      const resources = team === 0 ? this.playerResources : this.aiResources
      resources.supply += (data as any).supply || 0
    }

    return entity
  }

  update(dt: number): GameResult {
    this.gameTime += dt

    // Update fog of war
    this.fogVisible.fill(0)
    for (const entity of this.entities) {
      if (entity.team === 0 && entity.hp > 0) {
        this.updateVisibility(entity)
      }
    }

    // Process build queues
    this.processBuildQueue(this.buildQueue, 0)
    this.processBuildQueue(this.aiBuildQueue, 1)

    // Update entities
    for (const entity of this.entities) {
      if (entity.hp > 0) {
        this.updateEntity(entity, dt)
      }
    }

    // Resolve collisions
    this.resolveCollisions()

    // Update effects and projectiles
    this.effects.update(dt, (target, damage, projectile) => {
      this.applyDamage(target, damage, projectile)
    })

    // Cleanup dead entities
    for (const entity of this.entities) {
      if (entity.hp <= 0 && entity.hp > -9999) {
        this.onEntityDeath(entity)
        entity.hp = -10000
      }
    }
    this.entities = this.entities.filter(e => e.hp > -9999)

    // Update AI
    this.updateAI()

    // Check win/lose conditions
    const playerUnits = this.entities.filter(e => e.team === 0).length
    const aiUnits = this.entities.filter(e => e.team === 1).length

    if (playerUnits === 0) return 'defeat'
    if (aiUnits === 0) return 'victory'

    return null
  }

  private updateVisibility(entity: Entity) {
    const cx = Math.floor(entity.x / FOG_SIZE)
    const cy = Math.floor(entity.y / FOG_SIZE)
    const visionRadius = Math.ceil(entity.vision / FOG_SIZE)

    for (let dy = -visionRadius; dy <= visionRadius; dy++) {
      for (let dx = -visionRadius; dx <= visionRadius; dx++) {
        if (dx * dx + dy * dy <= visionRadius * visionRadius) {
          const fx = cx + dx
          const fy = cy + dy
          if (fx >= 0 && fx < this.map.cols && fy >= 0 && fy < this.map.rows) {
            const idx = fy * this.map.cols + fx
            this.fogVisible[idx] = 1
            this.fogExplored[idx] = 1
          }
        }
      }
    }
  }

  private updateEntity(entity: Entity, dt: number) {
    // Energy and shield regeneration
    if (entity.maxEnergy > 0 && entity.energy < entity.maxEnergy) {
      entity.energy = Math.min(entity.maxEnergy, entity.energy + (0.5625 * dt) / 1000)
    }
    if (entity.shield < entity.maxShield && this.gameTime - entity.lastHit > 10000) {
      entity.shield = Math.min(entity.maxShield, entity.shield + (2 * dt) / 1000)
    }

    // Building construction
    if (entity.isBuilding && entity.built < 1) {
      this.updateConstruction(entity, dt)
      return
    }

    // Production
    if (entity.producing && this.gameTime >= entity.productionEnd) {
      this.completeProduction(entity)
    }

    // Process buffs
    entity.buffs = entity.buffs.filter(b => b.end > this.gameTime)
    let speedMult = 1
    let attackMult = 1
    for (const buff of entity.buffs) {
      if (buff.speed) speedMult *= buff.speed
      if (buff.attack) attackMult *= buff.attack
    }

    // Movement
    if (!entity.isBuilding && !entity.hold && !entity.sieged && !entity.constructing && entity.path.length > 0) {
      this.updateMovement(entity, dt, speedMult)
    }

    // Harvesting
    if (entity.canHarvest && entity.harvesting && !entity.constructing) {
      this.updateHarvesting(entity, dt)
    }

    // Combat
    if (entity.damage > 0 && !entity.canHarvest && !entity.constructing) {
      this.updateCombat(entity, dt, attackMult)
    }
  }

  private updateConstruction(entity: Entity, dt: number) {
    const faction = FACTIONS[entity.team === 0 ? this.playerFaction : this.aiFaction]
    let rate = faction.buildStyle === 'construct' ? 0 : 1

    if (faction.buildStyle === 'construct') {
      const queue = entity.team === 0 ? this.buildQueue : this.aiBuildQueue
      const buildItem = queue.find(q => q.building === entity)
      if (buildItem) {
        const worker = this.entities.find(w => w.id === buildItem.workerId && w.hp > 0)
        if (worker) {
          const dist = Math.sqrt((entity.x - worker.x) ** 2 + (entity.y - worker.y) ** 2)
          if (dist < 60) rate = 1
        }
      }
    }

    if (rate > 0) {
      entity.buildProgress += dt * rate
      entity.built = Math.min(1, entity.buildProgress / entity.buildTotal)
      entity.hp = entity.maxHp * (0.1 + 0.9 * entity.built)
    }

    if (entity.built >= 1) {
      const buildingData = BUILDINGS[entity.type]
      const buildings = entity.team === 0 ? this.playerBuildings : this.aiBuildings
      const resources = entity.team === 0 ? this.playerResources : this.aiResources

      buildings.add(entity.type)
      resources.maxSupply += buildingData?.supplyProvided || 0

      audio.play('complete')
      if (entity.team === 0) {
        this.addMessage(`${entity.type} completed`)
      }
    }
  }

  private completeProduction(entity: Entity) {
    const unitData = UNITS[entity.producing!]
    if (unitData) {
      const count = unitData.spawnCount || 1
      for (let i = 0; i < count; i++) {
        const newUnit = this.spawnEntity(
          entity.producing!,
          entity.x + (Math.random() - 0.5) * 30,
          entity.y + entity.size + 10 + i * 10,
          entity.team
        )
        if (entity.rally && newUnit) {
          newUnit.path = findPath(this.map.grid, newUnit.x, newUnit.y, entity.rally.x, entity.rally.y)
          newUnit.pathIndex = 0
        }
      }
      audio.play('complete')
    }

    entity.producing = null
    if (entity.productionQueue.length > 0) {
      this.startProductionInternal(entity, entity.productionQueue.shift()!, entity.team)
    }
  }

  private updateMovement(entity: Entity, dt: number, speedMult: number) {
    const target = entity.path[entity.pathIndex]
    if (!target) return

    const dx = target.x - entity.x
    const dy = target.y - entity.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 8) {
      entity.pathIndex++
      if (entity.pathIndex >= entity.path.length) {
        entity.path = []
        entity.pathIndex = 0

        // Patrol loop
        if (entity.patrol) {
          const nextX = entity.patrol.goingToSecond ? entity.patrol.x1 : entity.patrol.x2
          const nextY = entity.patrol.goingToSecond ? entity.patrol.y1 : entity.patrol.y2
          entity.patrol.goingToSecond = !entity.patrol.goingToSecond
          entity.path = findPath(this.map.grid, entity.x, entity.y, nextX, nextY)
          entity.pathIndex = 0
        }
        // Command queue
        else if (entity.commandQueue.length > 0) {
          const cmd = entity.commandQueue.shift()!
          this.executeCommand(entity, cmd)
        }
      }
    } else {
      const speed = entity.speed * speedMult * TILE_SIZE * dt / 1000
      entity.vx = (dx / dist) * speed
      entity.vy = (dy / dist) * speed
    }

    // Attack-move detection
    if (entity.attackMove && entity.damage > 0 && !entity.target) {
      for (const other of this.entities) {
        if (other.team !== entity.team && other.hp > 0) {
          const d = Math.sqrt((other.x - entity.x) ** 2 + (other.y - entity.y) ** 2)
          if (d <= entity.range + 80) {
            entity.target = other
            break
          }
        }
      }
    }
  }

  private updateHarvesting(entity: Entity, dt: number) {
    const resource = entity.harvesting!
    const resources = entity.team === 0 ? this.playerResources : this.aiResources

    if (entity.returning) {
      // Find nearest base
      const bases = this.entities
        .filter(b => b.isBuilding && b.team === entity.team && BUILDINGS[b.type]?.isBase && b.built >= 1)
        .sort((a, b) => {
          const distA = (a.x - entity.x) ** 2 + (a.y - entity.y) ** 2
          const distB = (b.x - entity.x) ** 2 + (b.y - entity.y) ** 2
          return distA - distB
        })

      const base = bases[0]
      if (base) {
        const dist = Math.sqrt((base.x - entity.x) ** 2 + (base.y - entity.y) ** 2)
        if (dist < base.size + 15) {
          if (resource.isGeyser) {
            resources.gas += entity.harvestAmount
          } else {
            resources.minerals += entity.harvestAmount
          }
          entity.harvestAmount = 0
          entity.returning = false
          if (resource.amount > 0) {
            entity.path = findPath(this.map.grid, entity.x, entity.y, resource.x, resource.y)
            entity.pathIndex = 0
          }
        } else if (entity.path.length === 0) {
          entity.path = findPath(this.map.grid, entity.x, entity.y, base.x, base.y)
          entity.pathIndex = 0
        }
      }
    } else {
      const dist = Math.sqrt((resource.x - entity.x) ** 2 + (resource.y - entity.y) ** 2)
      if (dist < 35) {
        if (entity.harvestCooldown <= 0 && resource.amount > 0) {
          entity.harvestAmount = Math.min(resource.isGeyser ? 4 : 5, resource.amount)
          resource.amount -= entity.harvestAmount
          entity.returning = true
          entity.path = []
          entity.harvestCooldown = 2000
        } else {
          entity.harvestCooldown -= dt
        }
      } else if (entity.path.length === 0) {
        entity.path = findPath(this.map.grid, entity.x, entity.y, resource.x, resource.y)
        entity.pathIndex = 0
      }
    }
  }

  private updateCombat(entity: Entity, dt: number, attackMult: number) {
    // Find new target if needed
    if (!entity.target || entity.target.hp <= 0) {
      entity.target = null
      if (!entity.hold) {
        let closest: Entity | null = null
        let closestDist = entity.range + (entity.attackMove ? 80 : 0)

        for (const other of this.entities) {
          if (other.team !== entity.team && other.hp > 0) {
            // Check visibility for player units
            if (entity.team === 0) {
              const fx = Math.floor(other.x / FOG_SIZE)
              const fy = Math.floor(other.y / FOG_SIZE)
              if (this.fogVisible[fy * this.map.cols + fx] === 0) continue
            }

            const dist = Math.sqrt((other.x - entity.x) ** 2 + (other.y - entity.y) ** 2)
            if (dist < closestDist) {
              closest = other
              closestDist = dist
            }
          }
        }
        entity.target = closest
      }
    }

    // Attack if in range
    if (entity.target && entity.target.hp > 0) {
      const dist = Math.sqrt((entity.target.x - entity.x) ** 2 + (entity.target.y - entity.y) ** 2)
      if (dist <= entity.range) {
        if (this.gameTime - entity.lastAttack >= entity.attackSpeed / attackMult) {
          this.performAttack(entity, entity.target)
          entity.lastAttack = this.gameTime
        }
      } else if (!entity.hold && !entity.sieged && entity.speed > 0 && entity.path.length === 0) {
        entity.path = findPath(this.map.grid, entity.x, entity.y, entity.target.x, entity.target.y)
        entity.pathIndex = 0
      }
    }
  }

  private performAttack(attacker: Entity, target: Entity) {
    let damage = attacker.damage * (attacker.hits || 1)

    // Bonus damage
    if (attacker.damageBonus) {
      if (attacker.damageBonus.type === 'armored' && target.size > 18) {
        damage += attacker.damageBonus.amount * (attacker.hits || 1)
      }
      if (attacker.damageBonus.type === 'light' && target.size < 14) {
        damage += attacker.damageBonus.amount * (attacker.hits || 1)
      }
    }

    audio.play(attacker.projectile === 'particle' ? 'laser' : 'attack')

    if (attacker.projectile) {
      this.effects.addProjectile(
        attacker.projectile,
        attacker.x,
        attacker.y,
        target.x,
        target.y,
        attacker.projectileSpeed,
        damage,
        attacker.team,
        target,
        attacker.splash
      )
    } else {
      this.applyDamage(target, damage, { team: attacker.team, splash: attacker.splash, x: target.x, y: target.y } as any)
    }
  }

  private applyDamage(target: Entity, damage: number, projectile: Projectile) {
    let finalDamage = Math.max(0.5, damage - (target.armor || 0))

    // Shield absorbs damage first
    if (target.shield > 0) {
      const shieldDamage = Math.min(target.shield, finalDamage)
      target.shield -= shieldDamage
      finalDamage -= shieldDamage
    }

    target.hp -= finalDamage
    target.lastHit = this.gameTime

    // Splash damage
    if (projectile.splash && projectile.splash > 0) {
      for (const other of this.entities) {
        if (other !== target && other.team !== projectile.team && other.hp > 0) {
          const dist = Math.sqrt((other.x - projectile.x) ** 2 + (other.y - projectile.y) ** 2)
          if (dist <= projectile.splash) {
            let splashDamage = Math.max(0.5, damage * 0.5 - (other.armor || 0))
            if (other.shield > 0) {
              const ss = Math.min(other.shield, splashDamage)
              other.shield -= ss
              splashDamage -= ss
            }
            other.hp -= splashDamage
          }
        }
      }
      this.effects.addEffect('explosion', projectile.x, projectile.y, 400)
    }
  }

  private onEntityDeath(entity: Entity) {
    audio.play('death')
    this.effects.addEffect('death', entity.x, entity.y, 600)

    // Remove from harvesting
    if (entity.harvesting) {
      const idx = entity.harvesting.workers.indexOf(entity.id)
      if (idx >= 0) entity.harvesting.workers.splice(idx, 1)
    }

    // Update supply
    if (!entity.isBuilding) {
      const unitData = UNITS[entity.type]
      if (unitData) {
        const resources = entity.team === 0 ? this.playerResources : this.aiResources
        resources.supply -= unitData.supply || 0
      }
    }
  }

  private resolveCollisions() {
    const units = this.entities.filter(e => !e.isBuilding && e.hp > 0 && !e.flying)

    for (const entity of units) {
      if (entity.vx === 0 && entity.vy === 0) continue

      let sepX = 0
      let sepY = 0

      for (const other of units) {
        if (other === entity) continue

        const dx = entity.x - other.x
        const dy = entity.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = entity.size + other.size + 2

        if (dist < minDist && dist > 0) {
          const force = (minDist - dist) / minDist
          sepX += (dx / dist) * force * 2
          sepY += (dy / dist) * force * 2
        }
      }

      entity.x += entity.vx + sepX
      entity.y += entity.vy + sepY

      // Clamp to map bounds
      entity.x = Math.max(entity.size, Math.min(this.map.width - entity.size, entity.x))
      entity.y = Math.max(entity.size, Math.min(this.map.height - entity.size, entity.y))

      entity.vx = 0
      entity.vy = 0
    }
  }

  private processBuildQueue(queue: BuildQueueItem[], team: number) {
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i]
      const worker = this.entities.find(e => e.id === item.workerId && e.hp > 0)
      if (!worker) {
        queue.splice(i, 1)
        continue
      }

      const dist = Math.sqrt((item.x - worker.x) ** 2 + (item.y - worker.y) ** 2)
      const faction = FACTIONS[team === 0 ? this.playerFaction : this.aiFaction]
      const buildingData = BUILDINGS[item.type]

      if (dist < 45) {
        if (faction.buildStyle === 'warp') {
          this.spawnEntity(item.type, item.x, item.y, team, true, buildingData.buildTime * 1000)
          this.effects.addEffect('warp', item.x, item.y, 1000, { radius: buildingData.size })
          worker.constructing = null
          queue.splice(i, 1)
          this.nextWorkerCommand(worker)
        } else if (faction.buildStyle === 'morph') {
          worker.hp = 0
          this.spawnEntity(item.type, item.x, item.y, team, true, buildingData.buildTime * 1000)
          queue.splice(i, 1)
        } else {
          // Terran construct
          if (!item.building) {
            item.building = this.spawnEntity(item.type, item.x, item.y, team, true, buildingData.buildTime * 1000)
          }
          if (item.building && item.building.built >= 1) {
            worker.constructing = null
            queue.splice(i, 1)
            this.nextWorkerCommand(worker)
          }
        }
      } else if (worker.path.length === 0 && !worker.constructing) {
        worker.path = findPath(this.map.grid, worker.x, worker.y, item.x, item.y)
        worker.pathIndex = 0
        worker.constructing = item
      }
    }
  }

  private nextWorkerCommand(worker: Entity) {
    if (worker.commandQueue.length > 0) {
      const cmd = worker.commandQueue.shift()!
      this.executeCommand(worker, cmd)
    }
  }

  executeCommand(entity: Entity, cmd: Command) {
    switch (cmd.type) {
      case 'move':
        entity.path = findPath(this.map.grid, entity.x, entity.y, cmd.x!, cmd.y!)
        entity.pathIndex = 0
        entity.target = null
        entity.attackMove = false
        break
      case 'attackMove':
        entity.path = findPath(this.map.grid, entity.x, entity.y, cmd.x!, cmd.y!)
        entity.pathIndex = 0
        entity.attackMove = true
        break
      case 'attack':
        entity.target = cmd.target!
        break
      case 'build':
        this.queueBuild(entity, cmd.buildType!, cmd.x!, cmd.y!, entity.team, true)
        break
      case 'harvest':
        entity.harvesting = cmd.resource!
        entity.returning = false
        entity.path = findPath(this.map.grid, entity.x, entity.y, cmd.resource!.x, cmd.resource!.y)
        entity.pathIndex = 0
        break
      case 'patrol':
        entity.patrol = { x1: entity.x, y1: entity.y, x2: cmd.x!, y2: cmd.y!, goingToSecond: true }
        entity.path = findPath(this.map.grid, entity.x, entity.y, cmd.x!, cmd.y!)
        entity.pathIndex = 0
        entity.attackMove = true
        break
    }
  }

  // Public command interface
  issueCommand(type: string, data: any, shift = false) {
    const selected = this.entities.filter(e => e.selected && e.team === 0 && e.hp > 0)
    if (selected.length === 0) return

    // Calculate formation center
    const cx = selected.reduce((s, e) => s + e.x, 0) / selected.length
    const cy = selected.reduce((s, e) => s + e.y, 0) / selected.length

    switch (type) {
      case 'move':
        this.effects.addEffect('move', data.x, data.y, 800, { radius: 20 })
        for (const entity of selected) {
          if (entity.isBuilding || entity.sieged) continue
          const ox = entity.x - cx
          const oy = entity.y - cy
          const cmd: Command = { type: 'move', x: data.x + ox, y: data.y + oy }
          if (shift) entity.commandQueue.push(cmd)
          else {
            entity.commandQueue = []
            this.executeCommand(entity, cmd)
          }
          entity.target = null
          entity.attackMove = false
          entity.patrol = null
          if (!shift && entity.harvesting) {
            const idx = entity.harvesting.workers.indexOf(entity.id)
            if (idx >= 0) entity.harvesting.workers.splice(idx, 1)
            entity.harvesting = null
          }
        }
        audio.play('move')
        break

      case 'attackMove':
        this.effects.addEffect('attack', data.x, data.y, 600)
        for (const entity of selected) {
          if (entity.isBuilding || !entity.damage) continue
          const ox = entity.x - cx
          const oy = entity.y - cy
          const cmd: Command = { type: 'attackMove', x: data.x + ox, y: data.y + oy }
          if (shift) entity.commandQueue.push(cmd)
          else {
            entity.commandQueue = []
            this.executeCommand(entity, cmd)
          }
          entity.patrol = null
        }
        audio.play('move')
        break

      case 'attack':
        for (const entity of selected) {
          if (entity.isBuilding || !entity.damage) continue
          const cmd: Command = { type: 'attack', target: data.target }
          if (shift) entity.commandQueue.push(cmd)
          else {
            entity.commandQueue = []
            this.executeCommand(entity, cmd)
          }
        }
        audio.play('move')
        break

      case 'patrol':
        for (const entity of selected) {
          if (entity.isBuilding) continue
          const cmd: Command = { type: 'patrol', x: data.x, y: data.y }
          if (shift) entity.commandQueue.push(cmd)
          else {
            entity.commandQueue = []
            this.executeCommand(entity, cmd)
          }
        }
        audio.play('move')
        break

      case 'stop':
        for (const entity of selected) {
          entity.path = []
          entity.pathIndex = 0
          entity.target = null
          entity.attackMove = false
          entity.patrol = null
          entity.commandQueue = []
        }
        break

      case 'hold':
        for (const entity of selected) {
          entity.path = []
          entity.pathIndex = 0
          entity.hold = true
          entity.attackMove = false
          entity.patrol = null
          entity.commandQueue = []
        }
        break

      case 'harvest':
        for (const entity of selected) {
          if (!entity.canHarvest) continue
          if (entity.harvesting) {
            const idx = entity.harvesting.workers.indexOf(entity.id)
            if (idx >= 0) entity.harvesting.workers.splice(idx, 1)
          }
          const cmd: Command = { type: 'harvest', resource: data.resource }
          if (shift) entity.commandQueue.push(cmd)
          else {
            entity.commandQueue = []
            this.executeCommand(entity, cmd)
          }
          if (!data.resource.workers) data.resource.workers = []
          data.resource.workers.push(entity.id)
        }
        audio.play('move')
        break

      case 'build':
        const builder = selected.find(e => e.canBuild && !e.constructing)
        if (builder) {
          if (shift) {
            builder.commandQueue.push({ type: 'build', buildType: data.type, x: data.x, y: data.y })
          } else {
            this.queueBuild(builder, data.type, data.x, data.y, 0)
          }
        }
        break

      case 'produce':
        this.startProduction(selected[0], data.unit)
        break

      case 'rally':
        for (const entity of selected) {
          if (entity.isBuilding) {
            entity.rally = { x: data.x, y: data.y }
          }
        }
        this.effects.addEffect('move', data.x, data.y, 600, { radius: 15 })
        break

      case 'ability':
        this.useAbility(selected[0], data.ability, data.x, data.y)
        break
    }
  }

  queueBuild(worker: Entity, type: string, x: number, y: number, team: number, fromQueue = false): boolean {
    const buildingData = BUILDINGS[type]
    if (!buildingData) return false

    const resources = team === 0 ? this.playerResources : this.aiResources
    const queue = team === 0 ? this.buildQueue : this.aiBuildQueue
    const buildings = team === 0 ? this.playerBuildings : this.aiBuildings

    // Check resources
    if (resources.minerals < buildingData.cost.minerals || resources.gas < (buildingData.cost.gas || 0)) {
      if (team === 0) {
        audio.play('error')
        this.addMessage('Insufficient resources')
      }
      return false
    }

    // Check requirements
    if (buildingData.requirements) {
      for (const req of buildingData.requirements) {
        if (!buildings.has(req)) {
          if (team === 0) {
            audio.play('error')
            this.addMessage(`Requires ${req}`)
          }
          return false
        }
      }
    }

    // Check geyser placement
    if (buildingData.onGeyser) {
      const geyser = this.map.geysers.find(g => {
        const dist = Math.sqrt((g.x - x) ** 2 + (g.y - y) ** 2)
        return dist < 50 && !g.building
      })
      if (!geyser) {
        if (team === 0) {
          audio.play('error')
          this.addMessage('Must build on geyser')
        }
        return false
      }
      x = geyser.x
      y = geyser.y
      geyser.building = true
    }

    // Deduct resources
    resources.minerals -= buildingData.cost.minerals
    resources.gas -= buildingData.cost.gas || 0

    // Remove worker from harvesting
    if (worker.harvesting) {
      const idx = worker.harvesting.workers.indexOf(worker.id)
      if (idx >= 0) worker.harvesting.workers.splice(idx, 1)
      worker.harvesting = null
    }

    // Add to queue
    queue.push({ workerId: worker.id, type, x, y, building: null })

    worker.path = findPath(this.map.grid, worker.x, worker.y, x, y)
    worker.pathIndex = 0
    worker.constructing = queue[queue.length - 1]

    this.effects.addEffect('build', x, y, 1500, { size: buildingData.size })
    if (team === 0) audio.play('build')

    return true
  }

  startProduction(building: Entity, unitType: string) {
    if (!building?.isBuilding) return
    this.startProductionInternal(building, unitType, building.team)
  }

  private startProductionInternal(building: Entity, unitType: string, team: number): boolean {
    const buildingData = BUILDINGS[building.type]
    if (!buildingData?.produces?.includes(unitType)) return false

    const unitData = UNITS[unitType]
    if (!unitData) return false

    const resources = team === 0 ? this.playerResources : this.aiResources
    const buildings = team === 0 ? this.playerBuildings : this.aiBuildings

    // Check resources
    if (resources.minerals < unitData.cost.minerals || resources.gas < (unitData.cost.gas || 0)) {
      if (team === 0) {
        audio.play('error')
        this.addMessage('Insufficient resources')
      }
      return false
    }

    // Check supply
    if (resources.supply + (unitData.supply || 0) > resources.maxSupply) {
      if (team === 0) {
        audio.play('error')
        this.addMessage('Insufficient supply')
      }
      return false
    }

    // Check requirements
    if (unitData.requirements) {
      for (const req of unitData.requirements) {
        if (!buildings.has(req)) {
          if (team === 0) {
            audio.play('error')
            this.addMessage(`Requires ${req}`)
          }
          return false
        }
      }
    }

    // Deduct resources
    resources.minerals -= unitData.cost.minerals
    resources.gas -= unitData.cost.gas || 0

    if (building.producing) {
      building.productionQueue.push(unitType)
    } else {
      building.producing = unitType
      building.productionEnd = this.gameTime + unitData.buildTime * 1000
    }

    if (team === 0) audio.play('select')
    return true
  }

  cancelProduction(building: Entity, index: number) {
    if (!building) return

    const resources = building.team === 0 ? this.playerResources : this.aiResources

    if (index === 0 && building.producing) {
      const unitData = UNITS[building.producing]
      if (unitData) {
        resources.minerals += Math.floor(unitData.cost.minerals * 0.75)
        resources.gas += Math.floor((unitData.cost.gas || 0) * 0.75)
      }
      building.producing = null
      if (building.productionQueue.length > 0) {
        this.startProductionInternal(building, building.productionQueue.shift()!, building.team)
      }
    } else if (index > 0 && building.productionQueue[index - 1]) {
      const unitData = UNITS[building.productionQueue[index - 1]]
      if (unitData) {
        resources.minerals += Math.floor(unitData.cost.minerals * 0.75)
        resources.gas += Math.floor((unitData.cost.gas || 0) * 0.75)
      }
      building.productionQueue.splice(index - 1, 1)
    }
  }

  useAbility(entity: Entity, abilityKey: string, x: number, y: number): boolean {
    if (!entity) return false

    const ability = ABILITIES[abilityKey]
    if (!ability) return false

    if ((entity.cooldowns[abilityKey] || 0) > this.gameTime) return false
    if (ability.energyCost && entity.energy < ability.energyCost) return false

    if (ability.energyCost) entity.energy -= ability.energyCost
    if (ability.hpCost) entity.hp -= ability.hpCost
    if (ability.cooldown) entity.cooldowns[abilityKey] = this.gameTime + ability.cooldown

    switch (abilityKey) {
      case 'blink':
        const range = (ability.range || 256)
        const dist = Math.sqrt((x - entity.x) ** 2 + (y - entity.y) ** 2)
        if (dist <= range) {
          this.effects.addEffect('warp', entity.x, entity.y, 300, { radius: 15 })
          entity.x = x
          entity.y = y
          entity.path = []
          this.effects.addEffect('warp', x, y, 300, { radius: 15 })
        }
        break

      case 'stim':
        entity.buffs.push({
          type: 'stim',
          end: this.gameTime + (ability.duration || 11000),
          speed: ability.effect?.speedBonus || 1.5,
          attack: ability.effect?.attackBonus || 1.5,
        })
        break

      case 'siege':
        entity.sieged = !entity.sieged
        const tankData = UNITS.siegetank
        if (entity.sieged) {
          entity.damage = 40
          entity.range = 13 * TILE_SIZE
          entity.attackSpeed = 2140
          entity.splash = 40
          entity.speed = 0
        } else {
          entity.damage = tankData.damage
          entity.range = tankData.range
          entity.attackSpeed = tankData.attackSpeed
          entity.splash = 0
          entity.speed = tankData.speed
        }
        break
    }

    return true
  }

  // Selection
  select(x: number, y: number, w: number, h: number, add = false, type: 'box' | 'click' = 'box') {
    if (!add) {
      this.entities.forEach(e => (e.selected = false))
    }

    for (const entity of this.entities) {
      if (entity.team === 0 && entity.hp > 0) {
        const inSelection =
          type === 'box'
            ? entity.x >= x && entity.x <= x + w && entity.y >= y && entity.y <= y + h
            : Math.sqrt((entity.x - x) ** 2 + (entity.y - y) ** 2) < entity.size + 10

        if (inSelection) entity.selected = true
      }
    }

    const selected = this.entities.filter(e => e.selected)
    const units = selected.filter(e => !e.isBuilding)
    const buildings = selected.filter(e => e.isBuilding)

    // Prefer units over buildings
    if (units.length > 0 && buildings.length > 0) {
      buildings.forEach(b => (b.selected = false))
    }

    this.selected = this.entities.filter(e => e.selected)
    if (this.selected.length > 0) audio.play('select')

    return this.selected
  }

  selectAll() {
    this.entities.forEach(e => (e.selected = false))
    const army = this.entities.filter(e => e.team === 0 && e.hp > 0 && !e.isBuilding && !e.canHarvest)
    army.forEach(e => (e.selected = true))
    this.selected = army
    if (army.length > 0) audio.play('select')
  }

  setControlGroup(n: number) {
    this.controlGroups[n] = this.selected.map(e => e.id)
  }

  selectControlGroup(n: number): { x: number; y: number } | null {
    const ids = this.controlGroups[n]
    if (!ids || ids.length === 0) return null

    const now = Date.now()
    const doubleTap = this.lastGroupTap[n] && now - this.lastGroupTap[n] < 300
    this.lastGroupTap[n] = now

    this.entities.forEach(e => (e.selected = false))
    const units = this.entities.filter(e => ids.includes(e.id) && e.hp > 0)
    units.forEach(e => (e.selected = true))
    this.selected = units

    if (units.length > 0) audio.play('select')

    // Double-tap returns center position for camera
    if (doubleTap && units.length > 0) {
      const cx = units.reduce((s, e) => s + e.x, 0) / units.length
      const cy = units.reduce((s, e) => s + e.y, 0) / units.length
      return { x: cx, y: cy }
    }

    return null
  }

  getClickTarget(wx: number, wy: number): { type: string; resource?: Resource; entity?: Entity; x?: number; y?: number } {
    // Check minerals
    for (const m of this.map.minerals) {
      if (Math.sqrt((m.x - wx) ** 2 + (m.y - wy) ** 2) < 30 && m.amount > 0) {
        return { type: 'mineral', resource: m }
      }
    }

    // Check geysers
    for (const g of this.map.geysers) {
      if (Math.sqrt((g.x - wx) ** 2 + (g.y - wy) ** 2) < 35) {
        return { type: 'geyser', resource: { ...g, isGeyser: true } }
      }
    }

    // Check entities
    for (const e of this.entities) {
      if (e.hp > 0 && Math.sqrt((e.x - wx) ** 2 + (e.y - wy) ** 2) < e.size + 5) {
        return { type: 'entity', entity: e }
      }
    }

    return { type: 'ground', x: wx, y: wy }
  }

  addMessage(text: string) {
    this.messages.push({ text, time: this.gameTime })
    if (this.messages.length > 5) this.messages.shift()
  }

  getAbilities() {
    if (this.selected.length !== 1) return []
    const entity = this.selected[0]
    return (entity.abilities || []).map(k => ({
      key: k,
      ...ABILITIES[k],
      ready: (entity.cooldowns[k] || 0) <= this.gameTime,
      hasEnergy: !ABILITIES[k]?.energyCost || entity.energy >= ABILITIES[k].energyCost!,
    }))
  }

  // AI Update
  private updateAI() {
    const config = {
      easy: { mult: 0.8, attackThreshold: 20 },
      normal: { mult: 1.3, attackThreshold: 12 },
      hard: { mult: 2, attackThreshold: 8 },
      insane: { mult: 3, attackThreshold: 5 },
    }[this.difficulty]

    // Passive income boost
    this.aiResources.minerals += config.mult * 0.5
    this.aiResources.gas += config.mult * 0.15

    const units = this.entities.filter(e => e.team === 1 && !e.isBuilding && e.hp > 0)
    const buildings = this.entities.filter(e => e.team === 1 && e.isBuilding && e.hp > 0 && e.built >= 1)
    const workers = units.filter(e => e.canHarvest)
    const army = units.filter(e => !e.canHarvest && e.damage > 0)
    const enemies = this.entities.filter(e => e.team === 0 && e.hp > 0)

    const factionData = FACTIONS[this.aiFaction]
    const base = buildings.find(b => BUILDINGS[b.type]?.isBase)
    if (!base) return

    // Worker harvesting AI
    for (const worker of workers) {
      if (worker.constructing) continue
      if (!worker.harvesting || worker.harvesting.amount <= 0) {
        let best: Resource | null = null
        let minWorkers = 999

        for (const m of this.map.minerals) {
          if (m.amount > 0) {
            const dist = Math.sqrt((m.x - base.x) ** 2 + (m.y - base.y) ** 2)
            if (dist < 300 && m.workers.length < minWorkers) {
              best = m
              minWorkers = m.workers.length
            }
          }
        }

        if (best && minWorkers < 3) {
          if (worker.harvesting) {
            const idx = worker.harvesting.workers.indexOf(worker.id)
            if (idx >= 0) worker.harvesting.workers.splice(idx, 1)
          }
          worker.harvesting = best
          best.workers.push(worker.id)
          worker.path = findPath(this.map.grid, worker.x, worker.y, best.x, best.y)
          worker.pathIndex = 0
        }
      }
      if (worker.harvesting) {
        this.updateHarvesting(worker, 16)
      }
    }

    // Build supply
    if (this.aiResources.supply >= this.aiResources.maxSupply - 3) {
      if (factionData.supplyBuilding === 'overlord') {
        const hatch = buildings.find(b => BUILDINGS[b.type]?.produces?.includes('overlord') && !b.producing)
        if (hatch && this.aiResources.minerals >= 100) {
          this.startProductionInternal(hatch, 'overlord', 1)
        }
      } else {
        const supplyData = BUILDINGS[factionData.supplyBuilding]
        if (supplyData && this.aiResources.minerals >= supplyData.cost.minerals) {
          const freeWorker = workers.find(w => !w.constructing && !this.aiBuildQueue.some(q => q.workerId === w.id))
          if (freeWorker) {
            this.queueBuild(
              freeWorker,
              factionData.supplyBuilding,
              base.x + (Math.random() - 0.5) * 150,
              base.y + (Math.random() - 0.5) * 150,
              1
            )
          }
        }
      }
    }

    // Build production buildings
    const prodBuildings = buildings.filter(b => BUILDINGS[b.type]?.produces && !BUILDINGS[b.type]?.isBase)
    if (prodBuildings.length < 3 && this.aiResources.minerals >= 150) {
      let buildType: string | null = null

      if (this.aiFaction === 'protoss') {
        if (!this.aiBuildings.has('pylon')) buildType = 'pylon'
        else if (!this.aiBuildings.has('gateway')) buildType = 'gateway'
        else if (prodBuildings.length < 2) buildType = 'gateway'
      } else if (this.aiFaction === 'zerg') {
        if (!this.aiBuildings.has('pool')) buildType = 'pool'
      } else {
        if (!this.aiBuildings.has('supplydepot')) buildType = 'supplydepot'
        else if (!this.aiBuildings.has('barracks')) buildType = 'barracks'
        else if (prodBuildings.length < 2) buildType = 'barracks'
      }

      if (buildType) {
        const buildingData = BUILDINGS[buildType]
        if (buildingData && this.aiResources.minerals >= buildingData.cost.minerals) {
          const freeWorker = workers.find(w => !w.constructing && !this.aiBuildQueue.some(q => q.workerId === w.id))
          if (freeWorker) {
            this.queueBuild(
              freeWorker,
              buildType,
              base.x + (Math.random() - 0.5) * 200,
              base.y + (Math.random() - 0.5) * 200,
              1
            )
          }
        }
      }
    }

    // Produce workers
    if (workers.length < 20) {
      for (const building of buildings) {
        const buildingData = BUILDINGS[building.type]
        if (buildingData?.produces?.includes(factionData.workerUnit) && !building.producing) {
          const workerData = UNITS[factionData.workerUnit]
          if (
            this.aiResources.minerals >= workerData.cost.minerals &&
            this.aiResources.supply + (workerData.supply || 0) <= this.aiResources.maxSupply
          ) {
            this.startProductionInternal(building, factionData.workerUnit, 1)
            break
          }
        }
      }
    }

    // Produce army
    for (const prodBuilding of buildings) {
      if (prodBuilding.producing || prodBuilding.productionQueue.length >= 3) continue
      const buildingData = BUILDINGS[prodBuilding.type]
      if (!buildingData?.produces) continue

      const canProduce = buildingData.produces.filter(u => {
        const unitData = UNITS[u]
        if (!unitData || unitData.canHarvest) return false
        if (this.aiResources.minerals < unitData.cost.minerals) return false
        if (this.aiResources.gas < (unitData.cost.gas || 0)) return false
        if (this.aiResources.supply + (unitData.supply || 0) > this.aiResources.maxSupply) return false
        if (unitData.requirements) {
          for (const req of unitData.requirements) {
            if (!this.aiBuildings.has(req)) return false
          }
        }
        return true
      })

      if (canProduce.length > 0) {
        const cheapest = canProduce.sort((a, b) => UNITS[a].cost.minerals - UNITS[b].cost.minerals)[0]
        this.startProductionInternal(prodBuilding, cheapest, 1)
      }
    }

    // Army control
    if (army.length >= config.attackThreshold) {
      const target = enemies.find(e => e.isBuilding) || enemies[0]
      if (target) {
        for (const unit of army) {
          if (!unit.target || unit.target.hp <= 0) {
            let closest: Entity | null = null
            let minDist = 400

            for (const enemy of enemies) {
              const dist = Math.sqrt((enemy.x - unit.x) ** 2 + (enemy.y - unit.y) ** 2)
              if (dist < minDist) {
                closest = enemy
                minDist = dist
              }
            }

            if (closest) {
              unit.target = closest
              unit.attackMove = true
            } else if (unit.path.length === 0) {
              unit.path = findPath(
                this.map.grid,
                unit.x,
                unit.y,
                target.x + (Math.random() - 0.5) * 80,
                target.y + (Math.random() - 0.5) * 80
              )
              unit.pathIndex = 0
              unit.attackMove = true
            }
          }
        }
      }
    } else {
      // Defensive positioning
      for (const unit of army) {
        const threat = enemies.find(e => Math.sqrt((e.x - base.x) ** 2 + (e.y - base.y) ** 2) < 400)
        if (threat) {
          unit.target = threat
          unit.attackMove = true
        } else if (Math.sqrt((unit.x - base.x) ** 2 + (unit.y - base.y) ** 2) > 200 && unit.path.length === 0) {
          unit.path = findPath(
            this.map.grid,
            unit.x,
            unit.y,
            base.x + (Math.random() - 0.5) * 80,
            base.y + (Math.random() - 0.5) * 80
          )
          unit.pathIndex = 0
        }
      }
    }
  }
}
