# Isometric Grid Guide

Reference for building rooms in this isometric dungeon game.

## Grid Coordinate System

```
        (0,-1)   (1,-1)   (2,-1)
      /        \ /        \ /        \
(-1,0)   (0,0)   (1,0)   (2,0)   (3,0)
      \        / \        / \        /
      (-1,1)   (0,1)   (1,1)   (2,1)   (3,1)
      /        \ /        \ /        \
(-1,2)   (0,2)   (1,2)   (2,2)   (3,2)
      \        / \        / \        /
        (0,3)   (1,3)   (2,3)
```

- **col** increases to the right (east)
- **row** increases downward (south)
- (0,0) is the top-left of the floor area

## Tile Dimensions

| Property | Value | Source |
|----------|-------|--------|
| Art size | 256 x 512 px | Actual PNG dimensions |
| Isometric diamond | 256 x 128 px | Godot `tile_size` |
| Diamond half-width (HW) | 128 px | `TILE_WIDTH / 2` |
| Diamond half-height (HH) | 64 px | `TILE_HEIGHT / 2` |

## Coordinate Conversion

From grid to screen:

```typescript
screenX = (col - row) * HW
screenY = (col + row) * HH
```

Example: (1,1) → screenX = 0, screenY = 128

## Tile Placement

### Floor Tiles

```typescript
// Grid position
const gridPos = toScreen(col, row)
const screenX = offsetX + gridPos.x
const screenY = offsetY + gridPos.y + HH  // bottom of diamond

// Sprite placement
sprite = this.add.image(screenX, screenY, 'floor_tile')
sprite.setOrigin(0.5, 1.0)  // anchor at bottom center
sprite.setScale(SCALE)
```

**Key:** Origin is `(0.5, 1.0)` - anchor at the BOTTOM of the 512px art, positioned at the diamond's bottom point.

### Wall Tiles

Walls use different origin than floors:

```typescript
sprite = this.add.image(screenX, screenY, 'wall_N')
sprite.setOrigin(0.5, 1.0)  // same as floor - anchor at bottom
```

**Key:** Wall base (bottom of art) sits at the floor level. Wall art extends upward.

## Directional Wall Variants

Wall tiles have directional variants: `_N`, `_S`, `_E`, `_W`

Selection rules for a room:
- **Top wall** (row < min): use `_N` variant
- **Bottom wall** (row > max): use `_S` variant  
- **Right wall** (col > max): use `_E` variant
- **Left wall** (col < min): use `_W` variant
- **Corners**: use variant of the dominant adjacent side

## Room Construction Pattern

### Basic Room (3x3 floor + walls)

```typescript
const floorTiles = [
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
  { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
  { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
]

const wallTiles = [
  // Top wall (row -1)
  { col: 0, row: -1 }, { col: 1, row: -1 }, { col: 2, row: -1 },
  // Bottom wall (row 3)
  { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 },
  // Left wall (col -1)
  { col: -1, row: 0 }, { col: -1, row: 1 }, { col: -1, row: 2 },
  // Right wall (col 3)
  { col: 3, row: 0 }, { col: 3, row: 1 }, { col: 3, row: 2 },
  // Corners
  { col: -1, row: -1 }, { col: 3, row: -1 },
  { col: -1, row: 3 }, { col: 3, row: 3 },
]
```

### Rendering Order

1. Draw floor tiles first (lower z-index)
2. Draw wall tiles on top
3. Use Phaser's depth sorting for complex layouts

## Common Mistakes

1. **Wrong origin**: Using `setOrigin(0.5, 0.5)` centers the art, but the isometric diamond is at the bottom. Use `setOrigin(0.5, 1.0)`.

2. **Wrong diamond size**: The isometric diamond is 256x128 (2:1 ratio), not 256x256. Use `TILE_HEIGHT = 128`.

3. **Wrong placement position**: Tile should be placed at the diamond's bottom point (`gridPos.y + HH`), not the center (`gridPos.y`).

4. **Missing directional variants**: Walls must use `_N/_S/_E/_W` variants based on their position in the room.

## Testing

Run `npm run test` to verify:
- Grid coordinate conversion is correct
- Adjacent tiles share edges
- Room layout logic works

Tests are in `src/isometric.test.ts`.
