# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development
```bash
npm install        # Install dependencies
npm start          # Start development server (opens http://localhost:3000)
npm run build      # Create production build in build/
```

### Notes
- No test suite is configured
- No linting/formatting tools configured (no eslint, prettier)
- React Scripts handles all build tooling (webpack, babel, etc.)

## Architecture Overview

This is a single-file React RTS game implementation (~1500 lines in `src/App.js`). The architecture follows a hybrid pattern: class-based game engine for game logic + React hooks for UI.

### Core Structure

**Game Engine (Class-based)**
- `Game` class: Main game state and logic manager
  - Handles entity management, pathfinding, fog of war, AI, resource management
  - Updates game state via `update(dt)` method called each frame
  - Manages two teams: player (team 0) and AI (team 1)
  
**Rendering**
- Canvas-based rendering (HTML5 Canvas)
- Camera system with zoom (`camRef.current = { x, y, z }`)
- All rendering happens in the React `useEffect` game loop

**Game State Components**
- `entities[]`: All units and buildings with unified entity structure
- `res` / `aiRes`: Resource tracking (minerals, gas, supply, maxSupply)
- `buildQueue` / `aiBuildQueue`: Construction queues for workers
- `fogExplored` / `fogVisible`: Fog of war system (Uint8Arrays)
- `fx`: FX class instance for projectiles and visual effects

### Key Systems

**Data-Driven Design**
- `UNITS` object: All unit stats (hp, shields, damage, speed, abilities)
- `BUILDINGS` object: All building stats (production capabilities, requirements)
- `RACES` object: Race-specific properties (Protoss/Zerg/Terran)
- `ABILITIES` object: Unit ability definitions (Blink, Stimpack, Siege Mode)

**Pathfinding**
- A* algorithm implementation in `findPath()` function
- 8-directional movement with diagonal cost = 1.414
- Grid-based (32x32 tile size, stored in constant `T`)
- Collision avoidance via steering behaviors in `resolveCollisions()`

**Command System**
- Units have `cmdQueue[]` for shift-queuing multiple commands
- Commands: move, attack, harvest, build, patrol, hold, attackMove
- Executed via `executeCmd(entity, command)` method

**Production System**
- Buildings have `producing`, `prodEnd`, `prodQueue[]` for unit production
- Visual production progress bars rendered on buildings
- Rally points supported for automatic unit positioning

**Construction System**
- Three race-specific styles:
  - Protoss: "warp" (instant placement, time to complete)
  - Zerg: "morph" (worker transforms into building)
  - Terran: "construct" (worker stays to build, can repair)
- Build queues processed in `processBuildQueue()`

**AI System**
- Four difficulty levels with different resource multipliers and attack thresholds
- Automatic worker harvesting and saturation management
- Production building construction logic
- Army composition and attack wave coordination
- Base defense behavior

**Fog of War**
- Two layers: explored (seen before) vs visible (currently seeing)
- Uint8Array grid tracking (24-unit FOG constant)
- Vision updated per-entity each frame

**Audio**
- Procedural Web Audio API sounds (no external files)
- Sound types: select, move, attack, laser, death, build, complete, error
- Initialized on first user interaction via `audio.init()`

### Entity Structure
All units and buildings share a unified entity structure:
- Position: `x`, `y`, `vx`, `vy` (velocity for steering)
- Combat: `hp`, `sh` (shields), `ar` (armor), `dmg`, `as` (attack speed), `rng` (range), `target`
- Pathfinding: `path[]`, `pathIdx`, `cmdQueue[]`
- States: `harvesting`, `constructing`, `producing`, `sieged`, `buffs[]`
- Production: `producing`, `prodEnd`, `prodQueue[]`, `rally`
- Abilities: `ab[]` (ability keys), `cd{}` (cooldowns), `energy`, `maxE`

### Map Generation
- Procedural map generation in `genMap()`
- Two starting bases (corners)
- 8 mineral patches per base, 2 geysers per base
- Random obstacle clusters for terrain variety
- Cleared paths between key locations

### React Integration
- `RTSGame` component manages UI state and game loop
- Game loop runs in `useEffect` with `requestAnimationFrame`
- Canvas rendering happens synchronously each frame
- UI state synced from game engine via `setUi()` calls

## Development Patterns

### Adding New Units
1. Add entry to `UNITS` object with stats
2. Add to race's production building in `BUILDINGS[building].prod[]`
3. Add tech requirements via `req: ['building_name']` if needed
4. Add projectile type if ranged unit
5. Add abilities via `ab: ['ability_key']` if applicable

### Adding New Buildings
1. Add entry to `BUILDINGS` object
2. Set production capabilities via `prod: ['unit', ...]` if applicable
3. Add tech requirements via `req: ['prereq']`
4. Add to race data in `RACES` if it's a base/supply/gas/worker building

### Adding New Abilities
1. Add to `ABILITIES` object with cooldown, cost, description
2. Add ability key to unit's `ab: []` array in `UNITS`
3. Implement logic in `useAbility()` method's switch statement
4. Handle UI button rendering in the abilities section

### Modifying AI Behavior
- AI logic is in `updateAI()` method
- Difficulty configs: `{ easy, normal, hard, insane }` object
- AI follows: worker management → supply → production → army → attack logic

### Performance Considerations
- Single large file means any change rebuilds entire game logic
- Entity updates are O(n) per frame - avoid nested loops over entities
- Pathfinding is cached until target changes
- Fog of war is grid-based for O(1) lookups

## Code Style Notes

- Uses ES6 class syntax for Game engine, functional components for React
- Compact variable names in game engine (e.g., `hp`, `spd`, `sz`)
- Canvas rendering uses screen-space coordinates: `(worldX - cam.x) * cam.z`
- Time tracking: `this.time` increments by delta time each frame
- Resource structure: `{ m: minerals, g: gas, sup: supply, maxSup: max supply }`
