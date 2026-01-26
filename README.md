# 🎮 RTS StarCraft Game

A fully-featured **StarCraft-style Real-Time Strategy game** built with React. Single-file implementation with no external dependencies beyond React.

![Game Preview](https://img.shields.io/badge/React-18.2-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🏰 Three Playable Races
- **Protoss** - Shields, Warp construction, Pylon power
- **Zerg** - Regeneration, Morph construction, Larva system  
- **Terran** - Repair, SCV construction, Addons

### ⚔️ Combat System
- Multiple unit types per race (Marines, Zealots, Zerglings, Stalkers, Tanks, etc.)
- Projectile system with different types (bullets, plasma, acid, etc.)
- Splash damage, bonus damage vs armor types
- Abilities: Blink, Stimpack, Siege Mode

### 🏗️ Economy & Production
- Mineral and Gas harvesting
- Supply management
- Production queues with visual feedback
- Tech tree requirements

### 🎯 Advanced Controls
- **Shift-queue**: Queue multiple commands
- **Control groups**: Ctrl+1-9 to set, 1-9 to select, double-tap to center
- **Attack-move**: A + Right-click
- **Patrol**: P + Right-click
- **Formation movement**: Units maintain relative positions

### 🤖 AI Opponent
- 4 difficulty levels (Easy, Normal, Hard, Insane)
- Automatic worker management
- Army production and attack waves
- Base defense

### 🗺️ Map Features
- Fog of War (explored/visible states)
- Minimap with click navigation
- Procedurally generated obstacles
- Multiple resource locations

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/rts-starcraft-game.git

# Navigate to project
cd rts-starcraft-game

# Install dependencies
npm install

# Start the game
npm start
```

## 🎮 Controls

| Action | Control |
|--------|---------|
| Move camera | WASD / Arrow keys / Edge scroll |
| Select units | Left-click / Drag box |
| Move/Attack | Right-click |
| Attack-move | A + Right-click |
| Patrol | P + Right-click |
| Queue command | Shift + Right-click |
| Stop | S |
| Hold position | H |
| Create group | Ctrl + 1-9 |
| Select group | 1-9 (double-tap to center) |
| Center on selection | Space |
| Go to base | F1 |
| Zoom | Mouse wheel |

## 🏗️ Building

### Production Hotkeys
Each unit has a hotkey shown in brackets (e.g., `[A]` for Marine)

### Construction
1. Select a worker
2. Click building button or press hotkey
3. Place with left-click
4. Shift+click to queue multiple buildings

## 📁 Project Structure

```
rts-starcraft-game/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Complete game (~1500 lines)
│   └── index.js        # React entry point
├── package.json
└── README.md
```

## 🛠️ Technical Details

- **Framework**: React 18
- **Rendering**: HTML5 Canvas
- **Audio**: Web Audio API (procedural sounds)
- **State**: Class-based game engine + React hooks for UI
- **Pathfinding**: A* algorithm with 8-directional movement
- **Collision**: Steering behaviors / separation forces

## 📜 License

MIT License - feel free to use, modify, and distribute.

## 🙏 Credits

Inspired by Blizzard's StarCraft series. This is a fan-made educational project.

---

**Enjoy the game! ⚔️🎮**
