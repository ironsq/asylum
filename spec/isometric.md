# Isometric Spec

**Art:** 256x512 PNG per tile, visible diamond 256x128 at bottom of art.

**Constants** `src/isometric.ts:3` `TILE_WIDTH=256 TILE_HEIGHT=128 ART_WIDTH=256 ART_HEIGHT=512`

```
HW = TILE_WIDTH/2 = 128
HH = TILE_HEIGHT/2 = 64
screenX = (col - row) * HW
screenY = (col + row) * HH
origin = (0.5, 1.0) anchor at bottom of art, place at (gridX, gridY+HH)
```

**Helpers** `src/isometric.ts:14-35` `gridToScreen`, `getDiamondCorners`, `areTilesAdjacent`, `getNeighbors`.

**Diamond corners** center `(cx,cy)`:
- top `(cx, cy-HH)`, right `(cx+HW, cy)`, bottom `(cx,cy+HH)`, left `(cx-HW,cy)`

**Edge vectors:** `(HW,HH)` 26.565° and `(-HW,HH)` 153.435°.

**Render target:** `1920x1080` (1080p) `src/main.ts:204`, `Scale.FIT` with `autoCenter` for proportional fullscreen scaling. `ORIGIN_X=960 ORIGIN_Y=540` + padding `100` → viewport `1720x880` (see `src/isometric.ts:5`).

**Scale:** `scale = min(viewportWidth/isoWidth, viewportHeight/isoHeight,1)` in `src/main.ts:32` via `computeViewportScale` `src/isometric.ts:87`.

**Viewport invariant (MUST remain in frame):** Every placed tile's diamond (`getDiamondCorners`) MUST be fully inside the `1920x1080` canvas after `FIT` scaling and **centered** offsets.
- `isoWidth = (gridCols+gridRows)*HW`, `isoHeight = (gridCols+gridRows)*HH` (`HW=128 HH=64`).
- `gridCols = maxCol-minCol+1`, `gridRows = maxRow-minRow+1` over all `floor|walls|doors|paths|entry|exit` (see `getLayoutBounds` `src/systems/layout/generator.ts:38`).
- Generator guarantees `normalizeToOrigin()` + **Dungeon Limits** `S=gridCols+gridRows ≤ 28` so required `scale ≥ 0.48` (readable, no excessive downscale) — see `spec/scene.md` Limits. Any layout exceeding `28` is rejected/re-placed.
- Renderer guarantees `Scale.FIT` + `autoCenter` (`src/main.ts:195`) and `scale = min(viewportWidth/isoWidth, viewportHeight/isoHeight, 1)` with centered offsets `getViewportOffsets` (`src/isometric.ts:101`, `src/main.ts:38`) at `ORIGIN_X=960 ORIGIN_Y=540-40`, so `0 ≤ corner ≤ canvas` for all diamonds. No tile may be clipped — checked by `diamondsFitInViewport` `src/isometric.ts:122`.

**Reference:** `ISOMETRIC_GUIDE.md`
