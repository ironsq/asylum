# Agent Guide

## Project Type
Isometric dungeon game (Phaser 4 + TypeScript 7 + Vite 8 + React 19)

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Critical Settings
- Art size: **256 x 512** pixels per tile PNG
- Isometric diamond: **256 x 128** pixels (2:1 ratio)
- Tile origin: `setOrigin(0.5, 1.0)` - anchor at BOTTOM of art
- Place tiles at diamond's bottom point: `screenY = gridY + HH`

## Structure
```
src/
├── main.ts                    # Phaser game bootstrap
├── isometric.ts               # Grid math and constants
├── game/
│   └── scenes/                # Phaser scenes
├── data/
│   └── rooms/
│       ├── index.ts           # Exports all templates
│       ├── cell.ts            # 2x2 cell template
│       ├── common.ts          # 3x2 + extension (L-shape)
│       └── office.ts          # 3x3 office template
├── systems/
│   └── layout/
│       └── generator.ts       # Layout generator
└── types/
    └── room.ts                # TypeScript types
```

## Key Formulas
```typescript
HW = TILE_WIDTH / 2   // 128
HH = TILE_HEIGHT / 2  // 64
screenX = (col - row) * HW
screenY = (col + row) * HH
```

## Tile Placement
- Floor: `sprite.setOrigin(0.5, 1.0)`, position at `(gridX, gridY + HH)`
- Wall: same origin, different sprite variant based on room position

## Gotchas
- `TILE_HEIGHT = 128`, not 256 (the isometric diamond, not the art)
- Origin `1.0` not `0.375` - the visible diamond is at the bottom of the 512px art
- Walls need directional variants (`_N/_S/_E/_W`) based on which side of room

## Reference
See `ISOMETRIC_GUIDE.md` for detailed grid construction guide.
