"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { GameEngine, audio } from "@/lib/game/engine"
import { FACTIONS, UNITS, BUILDINGS, ABILITIES } from "@/lib/game/factions"
import {
  drawEntity,
  renderEffects,
  renderMinimap,
  renderGrid,
  renderMapObjects,
  renderFog,
  toIso,
  toWorldFromIso
} from "@/lib/game/renderer"
import { GameHUD } from "./game-hud"
import type { FactionId, DifficultyLevel, GameResult, Camera, Entity, Resources } from "@/lib/game/types"

const TILE_SIZE = 32
const FOG_SIZE = 24

interface GameViewProps {
  faction: FactionId
  difficulty: DifficultyLevel
  onGameEnd: (result: GameResult) => void
}

interface UIState {
  resources: Resources
  selected: Entity[]
  buildMode: string | null
  abilityMode: string | null
  abilities: any[]
  messages: { text: string; time: number }[]
  productionQueue: string[]
  fps: number
}

export function GameView({ faction, difficulty, onGameEnd }: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameEngine | null>(null)

  const [ui, setUi] = useState<UIState>({
    resources: { minerals: 50, gas: 0, supply: 0, maxSupply: 0 },
    selected: [],
    buildMode: null,
    abilityMode: null,
    abilities: [],
    messages: [],
    productionQueue: [],
    fps: 60,
  })

  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 })
  const dragRef = useRef({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 })
  const keysRef = useRef<Record<string, boolean>>({})
  const lastFrameRef = useRef(performance.now())
  const fpsRef = useRef({ frames: 0, lastTime: 0 })
  const mouseRef = useRef({ x: 0, y: 0 })

  // Initialize game
  useEffect(() => {
    const game = new GameEngine(faction, difficulty)
    game.init()
    gameRef.current = game

    const base = game.map.bases[0]
    // Center camera on base in Iso space
    const isoBase = toIso(base.x, base.y)
    camRef.current = {
      x: isoBase.x - window.innerWidth / 2,
      y: isoBase.y - (window.innerHeight - 200) / 2,
      zoom: 1,
    }

    return () => {
      gameRef.current = null
    }
  }, [faction, difficulty])

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current
    const minimap = minimapRef.current
    if (!canvas || !minimap) return

    const ctx = canvas.getContext("2d")
    const mctx = minimap.getContext("2d")
    if (!ctx || !mctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight - 200
    }
    resize()
    window.addEventListener("resize", resize)

    let animationId: number

    const gameLoop = (timestamp: number) => {
      const game = gameRef.current
      if (!game) {
        animationId = requestAnimationFrame(gameLoop)
        return
      }

      // FPS counter
      fpsRef.current.frames++
      if (timestamp - fpsRef.current.lastTime >= 1000) {
        setUi(prev => ({ ...prev, fps: fpsRef.current.frames }))
        fpsRef.current.frames = 0
        fpsRef.current.lastTime = timestamp
      }

      const dt = Math.min(50, timestamp - lastFrameRef.current)
      lastFrameRef.current = timestamp

      const cam = camRef.current
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const camSpeed = (600 * dt) / 1000 / cam.zoom

      // Camera movement via keys
      if (keysRef.current["arrowleft"] || keysRef.current["a"]) cam.x -= camSpeed
      if (keysRef.current["arrowright"] || keysRef.current["d"]) cam.x += camSpeed
      if (keysRef.current["arrowup"] || keysRef.current["w"]) cam.y -= camSpeed
      if (keysRef.current["arrowdown"] || keysRef.current["s"]) cam.y += camSpeed

      // Edge scrolling
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      if (mx < 10) cam.x -= camSpeed
      if (mx > canvasWidth - 10) cam.x += camSpeed
      if (my < 10) cam.y -= camSpeed
      if (my > canvasHeight - 10 && my < canvasHeight) cam.y += camSpeed

      // Clamp camera (Iso Bounds)
      // Map is 3200x2400.
      // Top corner (0,0) -> Iso(0,0)
      // Bottom corner (3200, 2400) -> Iso(3200-2400, (3200+2400)/2) = (800, 2800)
      // Left corner (0, 2400) -> Iso(-2400, 1200)
      // Right corner (3200, 0) -> Iso(3200, 1600)

      const minIsoX = -game.map.height
      const maxIsoX = game.map.width
      const minIsoY = 0
      const maxIsoY = (game.map.width + game.map.height) / 2

      // Allow some padding
      const pad = 500
      cam.x = Math.max(minIsoX - pad, Math.min(maxIsoX + pad - canvasWidth / cam.zoom, cam.x))
      cam.y = Math.max(minIsoY - pad, Math.min(maxIsoY + pad - canvasHeight / cam.zoom, cam.y))

      // Update game
      const result = game.update(dt)
      if (result) {
        onGameEnd(result)
        return
      }

      const zoom = cam.zoom

      // Clear canvas
      ctx.fillStyle = "#101018"
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // 1. Render Grid
      renderGrid(ctx, game.map, cam, canvasWidth, canvasHeight)

      // 2. Render Map Objects (Obstacles, Resources)
      renderMapObjects(ctx, game.map, cam, canvasWidth, canvasHeight, game.gameTime)

      // 3. Build queue ghosts
      for (const bq of game.buildQueue) {
        const bd = BUILDINGS[bq.type]
        if (bd && !bq.building) {
          const iso = toIso(bq.x, bq.y)
          const bsx = (iso.x - cam.x) * zoom
          const bsy = (iso.y - cam.y) * zoom
          const sz = bd.size * zoom

          ctx.fillStyle = "rgba(0,255,0,0.15)"
          // Draw iso footprint
          ctx.beginPath()
          ctx.moveTo(bsx, bsy + sz*0.5)
          ctx.lineTo(bsx + sz, bsy)
          ctx.lineTo(bsx, bsy - sz*0.5)
          ctx.lineTo(bsx - sz, bsy)
          ctx.closePath()
          ctx.fill()

          ctx.strokeStyle = "rgba(0,255,0,0.4)"
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // 4. Rally points
      for (const entity of game.entities) {
        if (entity.selected && entity.rally) {
          const isoStart = toIso(entity.x, entity.y)
          const isoEnd = toIso(entity.rally.x, entity.rally.y)

          const sx = (isoStart.x - cam.x) * zoom
          const sy = (isoStart.y - cam.y) * zoom
          const rx = (isoEnd.x - cam.x) * zoom
          const ry = (isoEnd.y - cam.y) * zoom

          ctx.strokeStyle = "rgba(0,255,0,0.5)"
          ctx.setLineDash([5, 5])
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(rx, ry)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.fillStyle = "#00FF00"
          ctx.beginPath()
          ctx.moveTo(rx, ry)
          ctx.lineTo(rx, ry - 12 * zoom)
          ctx.lineTo(rx + 8 * zoom, ry - 8 * zoom)
          ctx.fill()
        }
      }

      // 5. Entities
      // Sort by Y (painter's algorithm) for depth
      // In iso, draw order is by (x+y) usually, which corresponds to isoY
      // So sorting by isoY should be correct.
      // Since isoY = (x+y)/2, sorting by x+y is enough.

      const sortedEntities = [...game.entities].sort((a, b) => (a.x + a.y) - (b.x + b.y))

      for (const entity of sortedEntities) {
        if (entity.hp <= 0) continue

        const fx = Math.floor(entity.x / FOG_SIZE)
        const fy = Math.floor(entity.y / FOG_SIZE)
        if (entity.team === 1 && game.fogVisible[fy * game.map.cols + fx] === 0) continue

        const iso = toIso(entity.x, entity.y)
        const sx = (iso.x - cam.x) * zoom
        const sy = (iso.y - cam.y) * zoom

        if (sx < -100 || sx > canvasWidth + 100 || sy < -100 || sy > canvasHeight + 100) continue

        const isAlly = entity.team === 0
        drawEntity(ctx, entity, sx, sy, zoom, isAlly, game.gameTime)

        // Attack lines for selected units
        if (entity.selected && entity.target && entity.target.hp > 0) {
          const tIso = toIso(entity.target.x, entity.target.y)
          const tx = (tIso.x - cam.x) * zoom
          const ty = (tIso.y - cam.y) * zoom

          ctx.strokeStyle = "#FF0000"
          ctx.lineWidth = 1
          ctx.setLineDash([2, 4])
          ctx.beginPath()
          ctx.moveTo(sx, sy - entity.size * zoom) // Start from body center roughly
          ctx.lineTo(tx, ty - entity.target.size * zoom)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // 6. Effects
      renderEffects(ctx, game.effects, cam)

      // 7. Fog of war
      renderFog(ctx, game.map, cam, game.fogExplored, game.fogVisible, canvasWidth, canvasHeight)

      // Selection box
      if (dragRef.current.active) {
        const d = dragRef.current
        ctx.strokeStyle = "#00FF00"
        ctx.lineWidth = 1
        ctx.fillStyle = "rgba(0,255,0,0.1)"
        const bx = Math.min(d.startX, d.endX)
        const by = Math.min(d.startY, d.endY)
        const bw = Math.abs(d.endX - d.startX)
        const bh = Math.abs(d.endY - d.startY)
        ctx.fillRect(bx, by, bw, bh)
        ctx.strokeRect(bx, by, bw, bh)
      }

      // Build placement preview
      if (ui.buildMode) {
        const bd = BUILDINGS[ui.buildMode]
        if (bd) {
          // Snap to grid
          const worldPos = toWorld(mouseRef.current.x, mouseRef.current.y)
          const gx = Math.floor(worldPos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
          const gy = Math.floor(worldPos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2

          const iso = toIso(gx, gy)
          const bsx = (iso.x - cam.x) * zoom
          const bsy = (iso.y - cam.y) * zoom
          const sz = bd.size * zoom

          ctx.fillStyle = "rgba(0,255,0,0.3)"
          ctx.strokeStyle = "#00FF00"
          ctx.lineWidth = 2

          // Draw footprint
          ctx.beginPath()
          ctx.moveTo(bsx, bsy + sz*0.5)
          ctx.lineTo(bsx + sz, bsy)
          ctx.lineTo(bsx, bsy - sz*0.5)
          ctx.lineTo(bsx - sz, bsy)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
      }

      // Ability range indicator
      if (ui.abilityMode) {
        const ab = ABILITIES[ui.abilityMode]
        if (ab?.range) {
          const sel = game.selected[0]
          if (sel) {
            const iso = toIso(sel.x, sel.y)
            const asx = (iso.x - cam.x) * zoom
            const asy = (iso.y - cam.y) * zoom
            ctx.strokeStyle = "rgba(100,200,255,0.5)"
            ctx.setLineDash([5, 5])
            ctx.lineWidth = 2

            // In iso, circle becomes ellipse 2:1
            ctx.beginPath()
            ctx.ellipse(asx, asy, ab.range * zoom * 2, ab.range * zoom, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }
      }

      // Render minimap
      minimap.width = 180
      minimap.height = 135
      renderMinimap(
        mctx,
        game.map,
        game.entities,
        cam,
        game.fogExplored,
        game.fogVisible,
        canvasWidth,
        canvasHeight,
        180,
        135
      )

      // Update UI state
      let prodQueue: string[] = []
      const selectedBuilding = game.selected.find(e => e.isBuilding && e.producing)
      if (selectedBuilding) {
        prodQueue = [selectedBuilding.producing!, ...selectedBuilding.productionQueue]
      }

      setUi(prev => ({
        ...prev,
        resources: { ...game.playerResources },
        selected: game.selected,
        abilities: game.getAbilities(),
        messages: game.messages,
        productionQueue: prodQueue,
      }))

      animationId = requestAnimationFrame(gameLoop)
    }

    animationId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [ui.buildMode, ui.abilityMode, onGameEnd])

  // Convert screen to world coordinates (Iso Reverse)
  const toWorld = useCallback((cx: number, cy: number) => {
    return toWorldFromIso(cx, cy, camRef.current.x, camRef.current.y, camRef.current.zoom)
  }, [])

  // Mouse handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const game = gameRef.current
    if (!game) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    if (e.button === 2) return // Right click handled by context menu

    // Build mode
    if (ui.buildMode) {
      const { x, y } = toWorld(cx, cy)
      const gx = Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
      const gy = Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
      game.issueCommand("build", { type: ui.buildMode, x: gx, y: gy }, e.shiftKey)
      if (!e.shiftKey) setUi(prev => ({ ...prev, buildMode: null }))
      return
    }

    // Ability mode
    if (ui.abilityMode) {
      const { x, y } = toWorld(cx, cy)
      if (ui.abilityMode === "Attack") {
        const click = game.getClickTarget(x, y)
        if (click.type === "entity" && click.entity?.team === 1) {
          game.issueCommand("attack", { target: click.entity }, e.shiftKey)
        } else {
          game.issueCommand("attackMove", { x, y }, e.shiftKey)
        }
      } else if (ui.abilityMode === "Patrol") {
        game.issueCommand("patrol", { x, y }, e.shiftKey)
      } else {
        game.issueCommand("ability", { ability: ui.abilityMode, x, y }, e.shiftKey)
      }
      if (!e.shiftKey) setUi(prev => ({ ...prev, abilityMode: null }))
      return
    }

    // Start selection drag
    dragRef.current = { active: true, startX: cx, startY: cy, endX: cx, endY: cy }
  }, [ui.buildMode, ui.abilityMode, toWorld])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    mouseRef.current.x = e.clientX - rect.left
    mouseRef.current.y = e.clientY - rect.top

    if (dragRef.current.active) {
      dragRef.current.endX = mouseRef.current.x
      dragRef.current.endY = mouseRef.current.y
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const game = gameRef.current
    if (!game) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    if (dragRef.current.active) {
      const d = dragRef.current
      const w1 = toWorld(Math.min(d.startX, d.endX), Math.min(d.startY, d.endY))
      const w2 = toWorld(Math.max(d.startX, d.endX), Math.max(d.startY, d.endY))
      const isClick = Math.abs(d.endX - d.startX) < 10 && Math.abs(d.endY - d.startY) < 10

      if (isClick) {
        const { x, y } = toWorld(cx, cy)
        const click = game.getClickTarget(x, y)
        if ((click.type === "mineral" || click.type === "geyser") && game.selected.some(s => s.canHarvest)) {
          game.issueCommand("harvest", { resource: click.resource }, e.shiftKey)
        } else {
          game.select(x, y, 0, 0, e.shiftKey, "click")
        }
      } else {
        game.select(w1.x, w1.y, w2.x - w1.x, w2.y - w1.y, e.shiftKey, "box")
      }

      dragRef.current.active = false
    }
  }, [toWorld])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const game = gameRef.current
    if (!game) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const { x, y } = toWorld(e.clientX - rect.left, e.clientY - rect.top)
    const click = game.getClickTarget(x, y)

    if (click.type === "mineral" || click.type === "geyser") {
      game.issueCommand("harvest", { resource: click.resource }, e.shiftKey)
    } else if (click.type === "entity") {
      if (click.entity?.team === 1) {
        game.issueCommand("attack", { target: click.entity }, e.shiftKey)
      } else if (click.entity?.isBuilding) {
        game.issueCommand("rally", { x: click.entity.x, y: click.entity.y })
      }
    } else {
      if (keysRef.current["a"]) {
        game.issueCommand("attackMove", { x, y }, e.shiftKey)
      } else if (keysRef.current["p"]) {
        game.issueCommand("patrol", { x, y }, e.shiftKey)
      } else {
        game.issueCommand("move", { x, y }, e.shiftKey)
      }
    }
  }, [toWorld])

  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    const game = gameRef.current
    if (!game) return

    const rect = minimapRef.current?.getBoundingClientRect()
    if (!rect) return

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Minimap is top-down, so we get World Coords directly
    const wx = (mx / 180) * game.map.width
    const wy = (my / 135) * game.map.height

    if (e.button === 2) {
      game.issueCommand("attackMove", { x: wx, y: wy }, e.shiftKey)
    } else {
      const canvas = canvasRef.current
      if (!canvas) return

      // We need to set camera to center on this World Point
      // cam.x/y is top-left of screen in Iso space.
      // 1. Convert target World to Iso
      const iso = toIso(wx, wy)
      // 2. Adjust for screen center
      camRef.current.x = iso.x - canvas.width / 2 / camRef.current.zoom
      camRef.current.y = iso.y - canvas.height / 2 / camRef.current.zoom
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    camRef.current.zoom = Math.max(0.5, Math.min(2, camRef.current.zoom * (e.deltaY > 0 ? 0.9 : 1.1)))
  }, [])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true
      const game = gameRef.current
      if (!game) return

      // Control groups
      if (e.key >= "1" && e.key <= "9") {
        if (e.ctrlKey || e.metaKey) {
          game.setControlGroup(parseInt(e.key))
          e.preventDefault()
        } else {
          const pos = game.selectControlGroup(parseInt(e.key))
          if (pos && canvasRef.current) {
            // Center camera on pos (World)
            const iso = toIso(pos.x, pos.y)
            camRef.current.x = iso.x - canvasRef.current.width / 2
            camRef.current.y = iso.y - canvasRef.current.height / 2
          }
        }
      }

      switch (e.key.toLowerCase()) {
        case "s":
          if (!e.ctrlKey) game.issueCommand("stop", {})
          break
        case "h":
          game.issueCommand("hold", {})
          break
        case "a":
          if (game.selected.length > 0) setUi(prev => ({ ...prev, abilityMode: "Attack" }))
          break
        case "p":
          if (game.selected.length > 0) setUi(prev => ({ ...prev, abilityMode: "Patrol" }))
          break
        case "escape":
          setUi(prev => ({ ...prev, buildMode: null, abilityMode: null }))
          break
        case "f1":
          const base = game.entities.find(e => e.team === 0 && e.isBuilding)
          if (base && canvasRef.current) {
             const iso = toIso(base.x, base.y)
             camRef.current.x = iso.x - canvasRef.current.width / 2
             camRef.current.y = iso.y - canvasRef.current.height / 2
          }
          break
        case " ":
          if (game.selected.length > 0 && canvasRef.current) {
            const sel = game.selected[0]
            const iso = toIso(sel.x, sel.y)
            camRef.current.x = iso.x - canvasRef.current.width / 2
            camRef.current.y = iso.y - canvasRef.current.height / 2
          }
          break
      }

      // Production hotkeys
      const selectedBuilding = game.selected.find(s => s.isBuilding)
      if (selectedBuilding) {
        const buildingData = BUILDINGS[selectedBuilding.type]
        if (buildingData?.produces) {
          for (const unit of buildingData.produces) {
            const unitData = UNITS[unit]
            if (unitData?.hotkey && e.key.toLowerCase() === unitData.hotkey.toLowerCase()) {
              game.issueCommand("produce", { unit })
              break
            }
          }
        }
      }

      // Ability hotkeys
      for (const ab of ui.abilities) {
        if (e.key.toLowerCase() === (ab.hotkey || "").toLowerCase() && ab.ready && ab.hasEnergy) {
          if (ab.targetType === "ground") {
            setUi(prev => ({ ...prev, abilityMode: ab.key }))
          } else {
            game.issueCommand("ability", { ability: ab.key })
          }
          break
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [ui.abilities])

  // HUD callbacks
  const handleBuildSelect = useCallback((buildingType: string) => {
    setUi(prev => ({ ...prev, buildMode: buildingType }))
  }, [])

  const handleProduceSelect = useCallback((unitType: string) => {
    gameRef.current?.issueCommand("produce", { unit: unitType })
  }, [])

  const handleAbilitySelect = useCallback((abilityKey: string) => {
    const ab = ABILITIES[abilityKey]
    if (ab?.targetType === "ground") {
      setUi(prev => ({ ...prev, abilityMode: abilityKey }))
    } else {
      gameRef.current?.issueCommand("ability", { ability: abilityKey })
    }
  }, [])

  const handleCommand = useCallback((cmd: string) => {
    const game = gameRef.current
    if (!game) return

    switch (cmd) {
      case "stop":
        game.issueCommand("stop", {})
        break
      case "hold":
        game.issueCommand("hold", {})
        break
      case "attack":
        setUi(prev => ({ ...prev, abilityMode: "Attack" }))
        break
      case "patrol":
        setUi(prev => ({ ...prev, abilityMode: "Patrol" }))
        break
    }
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden bg-background flex flex-col select-none">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="block"
        style={{ cursor: ui.buildMode || ui.abilityMode ? "crosshair" : "default" }}
      />

      {/* Messages */}
      <div className="absolute top-12 left-4 pointer-events-none">
        {ui.messages.slice(-5).map((msg, i) => (
          <div key={i} className="text-accent text-sm mb-1" style={{ textShadow: "1px 1px 0 #000" }}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* HUD */}
      <GameHUD
        faction={faction}
        resources={ui.resources}
        selected={ui.selected}
        abilities={ui.abilities}
        buildMode={ui.buildMode}
        abilityMode={ui.abilityMode}
        productionQueue={ui.productionQueue}
        fps={ui.fps}
        minimapRef={minimapRef}
        onMinimapClick={handleMinimapClick}
        onBuildSelect={handleBuildSelect}
        onProduceSelect={handleProduceSelect}
        onAbilitySelect={handleAbilitySelect}
        onCommand={handleCommand}
      />
    </div>
  )
}
