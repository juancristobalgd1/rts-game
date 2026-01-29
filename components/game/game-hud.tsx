"use client"

import type { RefObject } from "react"
import { FACTIONS, UNITS, BUILDINGS } from "@/lib/game/factions"
import type { FactionId, Entity, Resources } from "@/lib/game/types"

interface GameHUDProps {
  faction: FactionId
  resources: Resources
  selected: Entity[]
  abilities: any[]
  buildMode: string | null
  abilityMode: string | null
  productionQueue: string[]
  fps: number
  minimapRef: RefObject<HTMLCanvasElement | null>
  onMinimapClick: (e: React.MouseEvent) => void
  onBuildSelect: (buildingType: string) => void
  onProduceSelect: (unitType: string) => void
  onAbilitySelect: (abilityKey: string) => void
  onCommand: (cmd: string) => void
}

export function GameHUD({
  faction,
  resources,
  selected,
  abilities,
  buildMode,
  abilityMode,
  productionQueue,
  fps,
  minimapRef,
  onMinimapClick,
  onBuildSelect,
  onProduceSelect,
  onAbilitySelect,
  onCommand,
}: GameHUDProps) {
  const factionData = FACTIONS[faction]
  const factionBuildings = Object.values(BUILDINGS).filter(b => b.faction === faction)

  const selectedWorker = selected.find(e => e.canBuild)
  const selectedBuilding = selected.find(e => e.isBuilding)

  const buildingData = selectedBuilding ? BUILDINGS[selectedBuilding.type] : null

  return (
    <div
      className="h-[200px] bg-card/95 border-t-2 flex gap-2 p-2"
      style={{ borderColor: factionData.color }}
    >
      {/* Minimap Section */}
      <div className="flex flex-col gap-2">
        <canvas
          ref={minimapRef as RefObject<HTMLCanvasElement>}
          width={180}
          height={135}
          onClick={onMinimapClick}
          onContextMenu={(e) => {
            e.preventDefault()
            onMinimapClick(e)
          }}
          className="bg-black rounded border border-border cursor-pointer"
        />
        <div className="text-xs text-muted-foreground text-center">
          FPS: {fps}
        </div>
      </div>

      {/* Resources */}
      <div className="flex flex-col gap-1 min-w-[120px] border-r border-border pr-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Resources</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded-sm" title="Minerals" />
          <span className="text-foreground font-mono">{resources.minerals}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded-sm" title="Gas" />
          <span className="text-foreground font-mono">{resources.gas}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 bg-yellow-400 rounded-sm" title="Supply" />
          <span className="text-foreground font-mono">
            {resources.supply}/{resources.maxSupply}
          </span>
        </div>
      </div>

      {/* Selection Info */}
      <div className="flex flex-col gap-1 min-w-[200px] border-r border-border pr-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Selected ({selected.length})
        </div>
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
            {selected.slice(0, 24).map((entity, idx) => {
              const unitData = UNITS[entity.type] || BUILDINGS[entity.type]
              return (
                <div
                  key={idx}
                  className="w-10 h-10 bg-muted rounded flex flex-col items-center justify-center text-xs border border-border"
                  title={`${entity.type} - HP: ${Math.ceil(entity.hp)}/${entity.maxHp}`}
                >
                  <span className="font-bold" style={{ color: factionData.color }}>
                    {unitData?.icon || entity.type.slice(0, 3).toUpperCase()}
                  </span>
                  <div className="w-8 h-1 bg-background rounded-full mt-0.5">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {selected.length > 24 && (
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                +{selected.length - 24}
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No units selected</div>
        )}
      </div>

      {/* Commands Panel */}
      <div className="flex flex-col gap-1 flex-1">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {buildMode ? "Build Mode: " + buildMode : abilityMode ? "Ability: " + abilityMode : "Commands"}
        </div>

        <div className="flex flex-wrap gap-1">
          {/* Worker Build Commands */}
          {selectedWorker && !buildMode && (
            <>
              {factionBuildings.map((building) => (
                <button
                  key={building.id}
                  onClick={() => onBuildSelect(building.id)}
                  className="w-12 h-12 bg-muted hover:bg-muted/80 rounded border border-border flex flex-col items-center justify-center text-xs transition-colors"
                  title={`${building.id} (${building.hotkey}) - ${building.cost.minerals}m ${building.cost.gas}g`}
                >
                  <span className="font-bold" style={{ color: factionData.color }}>
                    {building.icon}
                  </span>
                  <span className="text-muted-foreground text-[10px]">{building.hotkey}</span>
                </button>
              ))}
            </>
          )}

          {/* Building Production Commands */}
          {selectedBuilding && buildingData?.produces && (
            <>
              {buildingData.produces.map((unitId) => {
                const unit = UNITS[unitId]
                if (!unit) return null
                return (
                  <button
                    key={unitId}
                    onClick={() => onProduceSelect(unitId)}
                    className="w-12 h-12 bg-muted hover:bg-muted/80 rounded border border-border flex flex-col items-center justify-center text-xs transition-colors"
                    title={`${unitId} (${unit.hotkey}) - ${unit.cost.minerals}m ${unit.cost.gas}g`}
                  >
                    <span className="font-bold" style={{ color: factionData.color }}>
                      {unit.icon}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{unit.hotkey}</span>
                  </button>
                )
              })}
            </>
          )}

          {/* Unit Commands */}
          {selected.length > 0 && !selectedWorker?.canBuild && (
            <>
              <button
                onClick={() => onCommand("stop")}
                className="w-12 h-12 bg-muted hover:bg-muted/80 rounded border border-border flex flex-col items-center justify-center text-xs transition-colors"
                title="Stop (S)"
              >
                <span className="text-red-400 font-bold">STP</span>
                <span className="text-muted-foreground text-[10px]">S</span>
              </button>
              <button
                onClick={() => onCommand("hold")}
                className="w-12 h-12 bg-muted hover:bg-muted/80 rounded border border-border flex flex-col items-center justify-center text-xs transition-colors"
                title="Hold Position (H)"
              >
                <span className="text-yellow-400 font-bold">HLD</span>
                <span className="text-muted-foreground text-[10px]">H</span>
              </button>
              <button
                onClick={() => onCommand("attack")}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-xs transition-colors ${
                  abilityMode === "Attack"
                    ? "bg-red-500/30 border-red-500"
                    : "bg-muted hover:bg-muted/80 border-border"
                }`}
                title="Attack Move (A)"
              >
                <span className="text-red-400 font-bold">ATK</span>
                <span className="text-muted-foreground text-[10px]">A</span>
              </button>
              <button
                onClick={() => onCommand("patrol")}
                className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-xs transition-colors ${
                  abilityMode === "Patrol"
                    ? "bg-blue-500/30 border-blue-500"
                    : "bg-muted hover:bg-muted/80 border-border"
                }`}
                title="Patrol (P)"
              >
                <span className="text-blue-400 font-bold">PTR</span>
                <span className="text-muted-foreground text-[10px]">P</span>
              </button>
            </>
          )}

          {/* Abilities */}
          {abilities.map((ability) => (
            <button
              key={ability.key}
              onClick={() => ability.ready && ability.hasEnergy && onAbilitySelect(ability.key)}
              disabled={!ability.ready || !ability.hasEnergy}
              className={`w-12 h-12 rounded border flex flex-col items-center justify-center text-xs transition-colors ${
                abilityMode === ability.key
                  ? "bg-accent/30 border-accent"
                  : ability.ready && ability.hasEnergy
                    ? "bg-muted hover:bg-muted/80 border-border"
                    : "bg-muted/50 border-border opacity-50 cursor-not-allowed"
              }`}
              title={`${ability.name} (${ability.hotkey}) - ${ability.description}`}
            >
              <span className="font-bold" style={{ color: ability.ready && ability.hasEnergy ? factionData.color : undefined }}>
                {ability.key.slice(0, 3).toUpperCase()}
              </span>
              <span className="text-muted-foreground text-[10px]">{ability.hotkey}</span>
            </button>
          ))}
        </div>

        {/* Production Queue */}
        {productionQueue.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Queue:</span>
            <div className="flex gap-1">
              {productionQueue.map((unitId, idx) => {
                const unit = UNITS[unitId]
                return (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs border ${
                      idx === 0 ? "bg-accent/20 border-accent" : "bg-muted border-border"
                    }`}
                  >
                    {unit?.icon || unitId.slice(0, 2).toUpperCase()}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
