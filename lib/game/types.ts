// Game Types and Interfaces

export type FactionId = 'terran' | 'protoss' | 'zerg'
export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'insane'
export type GameState = 'menu' | 'lobby' | 'game' | 'result'
export type GameResult = 'victory' | 'defeat' | null

export interface Faction {
  id: FactionId
  name: string
  description: string
  color: string
  darkColor: string
  lightColor: string
  workerUnit: string
  baseBuilding: string
  supplyBuilding: string
  gasBuilding: string
  buildStyle: 'construct' | 'warp' | 'morph'
  strengths: string[]
  playstyle: string
}

export interface UnitStats {
  id: string
  faction: FactionId
  hp: number
  shield?: number
  armor: number
  damage: number
  damageBonus?: { type: 'armored' | 'light'; amount: number }
  attackSpeed: number
  range: number
  speed: number
  size: number
  vision: number
  cost: { minerals: number; gas: number }
  buildTime: number
  supply: number
  canHarvest?: boolean
  canBuild?: boolean
  canRepair?: boolean
  flying?: boolean
  projectile?: string
  splash?: number
  hits?: number
  abilities?: string[]
  icon: string
  hotkey: string
  producer?: string
  requirements?: string[]
  spawnCount?: number
}

export interface BuildingStats {
  id: string
  faction: FactionId
  hp: number
  shield?: number
  armor: number
  size: number
  vision: number
  cost: { minerals: number; gas: number }
  buildTime: number
  supplyProvided?: number
  produces?: string[]
  requirements?: string[]
  isBase?: boolean
  needsPower?: boolean
  onGeyser?: boolean
  consumesWorker?: boolean
  powerRadius?: number
  icon: string
  hotkey: string
}

export interface Ability {
  id: string
  name: string
  hotkey: string
  cooldown: number
  energyCost?: number
  hpCost?: number
  range?: number
  duration?: number
  targetType?: 'ground' | 'unit' | 'self'
  description: string
  effect?: {
    speedBonus?: number
    attackBonus?: number
  }
}

export interface Entity {
  id: number
  type: string
  x: number
  y: number
  hp: number
  maxHp: number
  shield: number
  maxShield: number
  armor: number
  damage: number
  damageBonus?: { type: 'armored' | 'light'; amount: number }
  attackSpeed: number
  range: number
  speed: number
  size: number
  vision: number
  team: number
  isBuilding: boolean
  faction: FactionId
  
  selected: boolean
  lastAttack: number
  lastHit: number
  target: Entity | null
  attackMove: boolean
  hold: boolean
  patrol: { x1: number; y1: number; x2: number; y2: number; goingToSecond: boolean } | null
  
  commandQueue: Command[]
  path: { x: number; y: number }[]
  pathIndex: number
  
  vx: number
  vy: number
  
  // Harvesting
  harvesting: Resource | null
  harvestAmount: number
  returning: boolean
  harvestCooldown: number
  
  // Production
  producing: string | null
  productionEnd: number
  productionQueue: string[]
  rally: { x: number; y: number } | null
  
  // Construction
  built: number
  buildProgress: number
  buildTotal: number
  constructing: BuildQueueItem | null
  
  // Capabilities
  canHarvest: boolean
  canBuild: boolean
  flying: boolean
  sieged: boolean
  
  // Combat
  projectile: string | null
  projectileSpeed: number
  splash: number
  hits: number
  
  // Abilities
  abilities: string[]
  cooldowns: Record<string, number>
  energy: number
  maxEnergy: number
  buffs: Buff[]
}

export interface Resource {
  x: number
  y: number
  amount: number
  isGeyser?: boolean
  building?: boolean
  workers: number[]
}

export interface Command {
  type: 'move' | 'attackMove' | 'attack' | 'build' | 'harvest' | 'patrol'
  x?: number
  y?: number
  target?: Entity
  buildType?: string
  resource?: Resource
}

export interface BuildQueueItem {
  workerId: number
  type: string
  x: number
  y: number
  building: Entity | null
}

export interface Buff {
  type: string
  end: number
  speed?: number
  attack?: number
}

export interface Resources {
  minerals: number
  gas: number
  supply: number
  maxSupply: number
}

export interface GameMap {
  width: number
  height: number
  grid: number[][]
  cols: number
  rows: number
  bases: { x: number; y: number }[]
  minerals: Resource[]
  geysers: Resource[]
  seed: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface Projectile {
  type: string
  x: number
  y: number
  targetX: number
  targetY: number
  speed: number
  damage: number
  team: number
  target: Entity | null
  born: number
  splash?: number
}

export interface Effect {
  type: string
  x: number
  y: number
  start: number
  duration: number
  radius?: number
  size?: number
}

export interface PlayerProfile {
  id: string
  name: string
  faction: FactionId
  isReady: boolean
  isHost: boolean
  color: string
}

export interface LobbySettings {
  mapSize: 'small' | 'medium' | 'large'
  gameSpeed: 'slow' | 'normal' | 'fast' | 'fastest'
  startingResources: 'low' | 'standard' | 'high'
  fogOfWar: boolean
  maxPlayers: number
}
