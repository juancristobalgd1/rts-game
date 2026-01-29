"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { FACTIONS } from "@/lib/game/factions"
import type { FactionId, DifficultyLevel } from "@/lib/game/types"

interface MainMenuProps {
  selectedFaction: FactionId
  onFactionChange: (faction: FactionId) => void
  difficulty: DifficultyLevel
  onDifficultyChange: (difficulty: DifficultyLevel) => void
  onStartGame: () => void
  onOpenLobby: () => void
}

const difficulties: { id: DifficultyLevel; label: string; description: string }[] = [
  { id: "easy", label: "Recruit", description: "Relaxed pace, forgiving AI" },
  { id: "normal", label: "Soldier", description: "Balanced challenge" },
  { id: "hard", label: "Veteran", description: "Aggressive AI tactics" },
  { id: "insane", label: "Commander", description: "Brutal, no mercy" },
]

export function MainMenu({
  selectedFaction,
  onFactionChange,
  difficulty,
  onDifficultyChange,
  onStartGame,
  onOpenLobby,
}: MainMenuProps) {
  const [hoveredFaction, setHoveredFaction] = useState<FactionId | null>(null)
  const displayFaction = hoveredFaction || selectedFaction

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      
      {/* Animated scan lines */}
      <div className="absolute inset-0 scan-line opacity-30" />
      
      {/* Glow effect based on faction */}
      <div
        className="absolute inset-0 opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, ${FACTIONS[displayFaction].color}40 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-5xl w-full">
        {/* Title */}
        <div className="text-center mb-4">
          <h1 
            className="font-sans text-5xl md:text-7xl font-bold tracking-wider text-foreground"
            style={{
              textShadow: `0 0 40px ${FACTIONS[displayFaction].color}80`,
            }}
          >
            GALACTIC CONQUEST
          </h1>
          <p className="text-muted-foreground tracking-[0.4em] text-sm mt-2 uppercase">
            Real-Time Strategy
          </p>
        </div>

        {/* Faction Selection */}
        <div className="w-full">
          <p className="text-center text-muted-foreground text-xs tracking-widest uppercase mb-4">
            Select Your Faction
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(FACTIONS) as FactionId[]).map((factionId) => {
              const faction = FACTIONS[factionId]
              const isSelected = selectedFaction === factionId
              const isHovered = hoveredFaction === factionId

              return (
                <button
                  key={factionId}
                  onClick={() => onFactionChange(factionId)}
                  onMouseEnter={() => setHoveredFaction(factionId)}
                  onMouseLeave={() => setHoveredFaction(null)}
                  className={cn(
                    "relative p-6 rounded-lg border-2 transition-all duration-300 text-left",
                    "bg-card/50 backdrop-blur-sm",
                    isSelected
                      ? "border-current"
                      : "border-border hover:border-muted-foreground/50",
                    isHovered && !isSelected && "scale-[1.02]"
                  )}
                  style={{
                    borderColor: isSelected ? faction.color : undefined,
                    boxShadow: isSelected ? `0 0 30px ${faction.color}40` : undefined,
                  }}
                >
                  {/* Faction Icon Placeholder */}
                  <div
                    className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-2xl font-bold"
                    style={{ 
                      backgroundColor: `${faction.color}20`,
                      color: faction.color,
                    }}
                  >
                    {factionId === "terran" ? "T" : factionId === "protoss" ? "P" : "Z"}
                  </div>

                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{ color: isSelected ? faction.color : undefined }}
                  >
                    {faction.name}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {faction.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {faction.strengths.map((strength) => (
                      <span
                        key={strength}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {strength}
                      </span>
                    ))}
                  </div>

                  {isSelected && (
                    <div
                      className="absolute top-3 right-3 w-3 h-3 rounded-full"
                      style={{ backgroundColor: faction.color }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="w-full max-w-2xl">
          <p className="text-center text-muted-foreground text-xs tracking-widest uppercase mb-4">
            Difficulty
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {difficulties.map((diff) => {
              const isSelected = difficulty === diff.id
              return (
                <button
                  key={diff.id}
                  onClick={() => onDifficultyChange(diff.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg border transition-all duration-200",
                    "text-sm font-medium",
                    isSelected
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-card/50 border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  )}
                  title={diff.description}
                >
                  {diff.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            onClick={onStartGame}
            className={cn(
              "px-12 py-4 rounded-lg font-semibold text-lg tracking-wide transition-all duration-300",
              "bg-gradient-to-r from-accent/80 to-accent hover:from-accent hover:to-accent/80",
              "text-accent-foreground shadow-lg hover:shadow-accent/25",
              "hover:scale-105 active:scale-95"
            )}
          >
            START CAMPAIGN
          </button>

          <button
            onClick={onOpenLobby}
            className={cn(
              "px-8 py-4 rounded-lg font-semibold text-lg tracking-wide transition-all duration-300",
              "bg-card border-2 border-border hover:border-primary/50",
              "text-foreground hover:text-primary",
              "hover:scale-105 active:scale-95"
            )}
          >
            MULTIPLAYER
          </button>
        </div>

        {/* Controls Help */}
        <div className="mt-8 text-center max-w-xl">
          <p className="text-muted-foreground text-xs leading-relaxed">
            <span className="text-foreground">WASD</span> Camera |{" "}
            <span className="text-foreground">Left Click</span> Select |{" "}
            <span className="text-foreground">Right Click</span> Command |{" "}
            <span className="text-foreground">Shift+Click</span> Queue |{" "}
            <span className="text-foreground">A+Click</span> Attack-move |{" "}
            <span className="text-foreground">Ctrl+1-9</span> Create group |{" "}
            <span className="text-foreground">1-9</span> Select group
          </p>
        </div>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 right-4 text-muted-foreground/50 text-xs">
        v2.0.0
      </div>
    </div>
  )
}
