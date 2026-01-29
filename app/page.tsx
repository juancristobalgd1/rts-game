"use client"

import { useState, useCallback } from "react"
import { MainMenu } from "@/components/game/main-menu"
import { MultiplayerLobby } from "@/components/game/multiplayer-lobby"
import { GameView } from "@/components/game/game-view"
import { ResultScreen } from "@/components/game/result-screen"
import type { FactionId, DifficultyLevel, GameState, GameResult, LobbySettings, PlayerProfile } from "@/lib/game/types"

export default function GalacticConquest() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [selectedFaction, setSelectedFaction] = useState<FactionId>("terran")
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("normal")
  const [gameResult, setGameResult] = useState<GameResult>(null)
  const [isMultiplayer, setIsMultiplayer] = useState(false)

  const handleStartGame = useCallback(() => {
    setGameState("game")
  }, [])

  const handleOpenLobby = useCallback(() => {
    setIsMultiplayer(true)
    setGameState("lobby")
  }, [])

  const handleStartMultiplayer = useCallback((settings: LobbySettings, players: PlayerProfile[]) => {
    // For now, start single player game with selected settings
    setGameState("game")
  }, [])

  const handleGameEnd = useCallback((result: GameResult) => {
    setGameResult(result)
    setGameState("result")
  }, [])

  const handleReturnToMenu = useCallback(() => {
    setGameState("menu")
    setGameResult(null)
    setIsMultiplayer(false)
  }, [])

  const handleLeaveLobby = useCallback(() => {
    setGameState("menu")
    setIsMultiplayer(false)
  }, [])

  return (
    <main className="w-screen h-screen overflow-hidden bg-background">
      {gameState === "menu" && (
        <MainMenu
          selectedFaction={selectedFaction}
          onFactionChange={setSelectedFaction}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onStartGame={handleStartGame}
          onOpenLobby={handleOpenLobby}
        />
      )}

      {gameState === "lobby" && (
        <MultiplayerLobby
          playerFaction={selectedFaction}
          onStartGame={handleStartMultiplayer}
          onLeave={handleLeaveLobby}
        />
      )}

      {gameState === "game" && (
        <GameView
          faction={selectedFaction}
          difficulty={difficulty}
          onGameEnd={handleGameEnd}
        />
      )}

      {gameState === "result" && (
        <ResultScreen
          result={gameResult}
          onReturnToMenu={handleReturnToMenu}
          onPlayAgain={handleStartGame}
        />
      )}
    </main>
  )
}
