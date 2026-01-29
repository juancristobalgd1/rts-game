"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { FACTIONS } from "@/lib/game/factions"
import type { FactionId, LobbySettings, PlayerProfile } from "@/lib/game/types"

interface MultiplayerLobbyProps {
  playerFaction: FactionId
  onStartGame: (settings: LobbySettings, players: PlayerProfile[]) => void
  onLeave: () => void
}

const defaultSettings: LobbySettings = {
  mapSize: "medium",
  gameSpeed: "normal",
  startingResources: "standard",
  fogOfWar: true,
  maxPlayers: 2,
}

const mapSizes = [
  { id: "small", label: "Small", description: "Quick battles" },
  { id: "medium", label: "Medium", description: "Balanced maps" },
  { id: "large", label: "Large", description: "Epic scale" },
] as const

const gameSpeeds = [
  { id: "slow", label: "Slow", mult: "0.7x" },
  { id: "normal", label: "Normal", mult: "1.0x" },
  { id: "fast", label: "Fast", mult: "1.4x" },
  { id: "fastest", label: "Fastest", mult: "2.0x" },
] as const

const resourceOptions = [
  { id: "low", label: "Low", description: "50 minerals" },
  { id: "standard", label: "Standard", description: "200 minerals" },
  { id: "high", label: "High", description: "500 minerals" },
] as const

export function MultiplayerLobby({
  playerFaction,
  onStartGame,
  onLeave,
}: MultiplayerLobbyProps) {
  const [settings, setSettings] = useState<LobbySettings>(defaultSettings)
  const [players, setPlayers] = useState<PlayerProfile[]>([
    {
      id: "local",
      name: "Commander",
      faction: playerFaction,
      isReady: false,
      isHost: true,
      color: FACTIONS[playerFaction].color,
    },
  ])
  const [chatMessages, setChatMessages] = useState<{ sender: string; message: string; time: Date }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Simulate finding a player
  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        const aiFactions: FactionId[] = ["terran", "protoss", "zerg"]
        const aiFaction = aiFactions.filter(f => f !== playerFaction)[Math.floor(Math.random() * 2)]
        
        setPlayers(prev => [
          ...prev,
          {
            id: "ai",
            name: "AI Commander",
            faction: aiFaction,
            isReady: true,
            isHost: false,
            color: FACTIONS[aiFaction].color,
          },
        ])
        setIsSearching(false)
        setChatMessages(prev => [
          ...prev,
          { sender: "System", message: "AI Commander has joined the lobby.", time: new Date() },
        ])
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSearching, playerFaction])

  const handleToggleReady = () => {
    setPlayers(prev =>
      prev.map(p => (p.id === "local" ? { ...p, isReady: !p.isReady } : p))
    )
  }

  const handleFindMatch = () => {
    if (players.length < 2) {
      setIsSearching(true)
      setChatMessages(prev => [
        ...prev,
        { sender: "System", message: "Searching for opponent...", time: new Date() },
      ])
    }
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (chatInput.trim()) {
      setChatMessages(prev => [
        ...prev,
        { sender: "You", message: chatInput.trim(), time: new Date() },
      ])
      setChatInput("")
    }
  }

  const handleStart = () => {
    if (players.length >= 2 && players.every(p => p.isReady || p.id === "ai")) {
      onStartGame(settings, players)
    }
  }

  const canStart = players.length >= 2 && players.filter(p => p.id === "local")[0]?.isReady

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
      <div className="absolute inset-0 scan-line opacity-20" />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Panel - Players */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-wide text-foreground">
                MULTIPLAYER LOBBY
              </h1>
              <p className="text-muted-foreground text-sm">Waiting for players...</p>
            </div>
            <button
              onClick={onLeave}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-destructive transition-colors"
            >
              Leave Lobby
            </button>
          </div>

          {/* Players List */}
          <div className="flex-1 bg-card/50 rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Players ({players.length}/{settings.maxPlayers})
            </h2>

            <div className="space-y-3">
              {players.map((player) => {
                const faction = FACTIONS[player.faction]
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border"
                    style={{
                      borderColor: player.isReady ? faction.color : undefined,
                    }}
                  >
                    {/* Faction Icon */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                      style={{
                        backgroundColor: `${faction.color}20`,
                        color: faction.color,
                      }}
                    >
                      {player.faction[0].toUpperCase()}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{player.name}</span>
                        {player.isHost && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                            Host
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{faction.name}</p>
                    </div>

                    {/* Ready Status */}
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        player.isReady
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {player.isReady ? "Ready" : "Not Ready"}
                    </div>
                  </div>
                )
              })}

              {/* Empty Slots */}
              {Array.from({ length: settings.maxPlayers - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border"
                >
                  <span className="text-muted-foreground">Waiting for player...</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFindMatch}
                disabled={isSearching || players.length >= settings.maxPlayers}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium transition-all",
                  isSearching
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : players.length >= settings.maxPlayers
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary/20 text-primary hover:bg-primary/30"
                )}
              >
                {isSearching ? "Searching..." : "Find Match"}
              </button>
              <button
                onClick={handleToggleReady}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium transition-all",
                  players.find(p => p.id === "local")?.isReady
                    ? "bg-accent text-accent-foreground"
                    : "bg-card border border-border text-foreground hover:border-accent"
                )}
              >
                {players.find(p => p.id === "local")?.isReady ? "Ready!" : "Toggle Ready"}
              </button>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={cn(
              "w-full py-4 rounded-lg font-bold text-lg tracking-wide transition-all",
              canStart
                ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:shadow-lg hover:shadow-accent/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {canStart ? "START GAME" : "Waiting for all players..."}
          </button>
        </div>

        {/* Right Panel - Settings & Chat */}
        <div className="w-full lg:w-96 flex flex-col gap-6">
          {/* Game Settings */}
          <div className="bg-card/50 rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Game Settings
            </h2>

            <div className="space-y-4">
              {/* Map Size */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Map Size
                </label>
                <div className="flex gap-2 mt-2">
                  {mapSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSettings(s => ({ ...s, mapSize: size.id }))}
                      className={cn(
                        "flex-1 px-3 py-2 rounded text-sm transition-all",
                        settings.mapSize === size.id
                          ? "bg-primary/20 border border-primary text-primary"
                          : "bg-muted border border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Speed */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Game Speed
                </label>
                <div className="flex gap-2 mt-2">
                  {gameSpeeds.map((speed) => (
                    <button
                      key={speed.id}
                      onClick={() => setSettings(s => ({ ...s, gameSpeed: speed.id }))}
                      className={cn(
                        "flex-1 px-2 py-2 rounded text-xs transition-all",
                        settings.gameSpeed === speed.id
                          ? "bg-primary/20 border border-primary text-primary"
                          : "bg-muted border border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Resources */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Starting Resources
                </label>
                <div className="flex gap-2 mt-2">
                  {resourceOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSettings(s => ({ ...s, startingResources: option.id }))}
                      className={cn(
                        "flex-1 px-3 py-2 rounded text-sm transition-all",
                        settings.startingResources === option.id
                          ? "bg-primary/20 border border-primary text-primary"
                          : "bg-muted border border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fog of War Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">Fog of War</label>
                <button
                  onClick={() => setSettings(s => ({ ...s, fogOfWar: !s.fogOfWar }))}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all",
                    settings.fogOfWar ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-foreground transition-transform",
                      settings.fogOfWar ? "translate-x-6" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 bg-card/50 rounded-xl border border-border p-4 flex flex-col min-h-[200px]">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Lobby Chat
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {chatMessages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No messages yet
                </p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span
                      className={cn(
                        "font-medium",
                        msg.sender === "System" ? "text-primary" : "text-accent"
                      )}
                    >
                      {msg.sender}:
                    </span>{" "}
                    <span className="text-foreground">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
