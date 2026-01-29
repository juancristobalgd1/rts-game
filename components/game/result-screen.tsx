"use client"

import { cn } from "@/lib/utils"
import type { GameResult } from "@/lib/game/types"

interface ResultScreenProps {
  result: GameResult
  onReturnToMenu: () => void
  onPlayAgain: () => void
}

export function ResultScreen({ result, onReturnToMenu, onPlayAgain }: ResultScreenProps) {
  const isVictory = result === "victory"

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />

      {/* Glow effect based on result */}
      <div
        className={cn(
          "absolute inset-0 opacity-30 transition-all duration-700",
          isVictory
            ? "bg-gradient-radial from-green-500/40 to-transparent"
            : "bg-gradient-radial from-red-500/40 to-transparent"
        )}
        style={{
          background: `radial-gradient(ellipse at center, ${isVictory ? "#22c55e40" : "#ef444440"} 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Result Title */}
        <div>
          <h1
            className={cn(
              "font-sans text-6xl md:text-8xl font-bold tracking-wider",
              isVictory ? "text-green-400" : "text-red-400"
            )}
            style={{
              textShadow: `0 0 60px ${isVictory ? "#22c55e" : "#ef4444"}80`,
            }}
          >
            {isVictory ? "VICTORY" : "DEFEAT"}
          </h1>
          <p className="text-muted-foreground tracking-[0.4em] text-sm mt-4 uppercase">
            {isVictory
              ? "Your forces have emerged triumphant"
              : "Your forces have been overwhelmed"}
          </p>
        </div>

        {/* Stats placeholder */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6 min-w-[300px]">
          <h3 className="text-lg font-semibold text-foreground mb-4">Battle Statistics</h3>
          <div className="space-y-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Units Built</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Units Lost</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Enemies Destroyed</span>
              <span className="text-foreground">--</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Resources Gathered</span>
              <span className="text-foreground">--</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <button
            onClick={onPlayAgain}
            className={cn(
              "px-10 py-4 rounded-lg font-semibold text-lg tracking-wide transition-all duration-300",
              "hover:scale-105 active:scale-95",
              isVictory
                ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/25"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/25"
            )}
          >
            PLAY AGAIN
          </button>

          <button
            onClick={onReturnToMenu}
            className={cn(
              "px-8 py-4 rounded-lg font-semibold text-lg tracking-wide transition-all duration-300",
              "bg-card border-2 border-border hover:border-primary/50",
              "text-foreground hover:text-primary",
              "hover:scale-105 active:scale-95"
            )}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
