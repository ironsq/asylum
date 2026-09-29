# Asylum - Isometric Dungeon Game

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack

- Phaser 4 (HTML5 game framework)
- TypeScript 7
- Vite 8 (dev server & bundler)
- React 19 (UI layer)
- Vitest 4 (testing)
- oxlint (linting)

## Project Structure

```
src/
├── isometric.ts          # Core isometric math and constants
├── isometric.test.ts     # Tests proving grid correctness
└── main.ts               # Phaser game scene
assets/
└── dungeon_tiles/        # Tile art organized by type
    ├── floor/            # Floor tile PNGs (256x512 each)
    └── walls/            # Wall tile PNGs (256x512 each, directional)
```

## Development

- `npm run dev` - Start dev server
- `npm run build` - Type check and build for production
- `npm run test` - Run tests (vitest)
- `npm run lint` - Lint (oxlint)

## Isometric Grid Reference

See [ISOMETRIC_GUIDE.md](./ISOMETRIC_GUIDE.md) for detailed reference on:
- Grid coordinate system
- Tile dimensions and origins
- How to place tiles correctly
- Wall placement rules
