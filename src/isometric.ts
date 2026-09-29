// Isometric math - single source of truth for coordinate conversion

export const TILE_WIDTH = 256
export const TILE_HEIGHT = 128  // 2:1 isometric diamond

export const ART_WIDTH = 256
export const ART_HEIGHT = 512

// Render target + viewport - single source of truth for FIT guarantee
export const RENDER_WIDTH = 1920
export const RENDER_HEIGHT = 1080
export const VIEWPORT_PADDING = 100
export const VIEWPORT_WIDTH = RENDER_WIDTH - VIEWPORT_PADDING * 2   // 1720
export const VIEWPORT_HEIGHT = RENDER_HEIGHT - VIEWPORT_PADDING * 2 // 880
export const ORIGIN_X = RENDER_WIDTH / 2   // 960
export const ORIGIN_Y = RENDER_HEIGHT / 2  // 540

// Dungeon Limits: max grid extent S = gridCols+gridRows that stays readable at min scale ~0.48
// 27 at 0.497, 28 at 0.479 — 28 accommodates spacing 6 needed to avoid wall overlap after rotation
export const MAX_GRID_SUM = 28
export const HW = TILE_WIDTH / 2 // 128
export const HH = TILE_HEIGHT / 2 // 64

/**
 * Convert grid coordinates to screen coordinates
 * For 2:1 isometric: screenX = (col - row) * tileWidth/2
 *                    screenY = (col + row) * tileHeight/2
 */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2)
  }
}

/**
 * Get the four corners of an isometric diamond at grid position
 */
export function getDiamondCorners(col: number, row: number) {
  const center = gridToScreen(col, row)
  const hw = TILE_WIDTH / 2
  const hh = TILE_HEIGHT / 2

  return [
    { x: center.x, y: center.y - hh },
    { x: center.x + hw, y: center.y },
    { x: center.x, y: center.y + hh },
    { x: center.x - hw, y: center.y }
  ]
}

/**
 * Check if two diamonds share an edge (are adjacent)
 */
export function areTilesAdjacent(col1: number, row1: number, col2: number, row2: number): boolean {
  const corners1 = getDiamondCorners(col1, row1)
  const corners2 = getDiamondCorners(col2, row2)

  let shared = 0
  for (const c1 of corners1) {
    for (const c2 of corners2) {
      if (Math.abs(c1.x - c2.x) < 0.001 && Math.abs(c1.y - c2.y) < 0.001) {
        shared++
      }
    }
  }

  return shared === 2
}

/**
 * Get expected neighbors for a tile at (col, row)
 */
export function getNeighbors(col: number, row: number) {
  return [
    { col: col + 1, row, direction: 'east' as const },
    { col: col - 1, row, direction: 'west' as const },
    { col, row: row + 1, direction: 'south' as const },
    { col, row: row - 1, direction: 'north' as const },
  ]
}

export function getIsoSize(gridCols: number, gridRows: number): { width: number; height: number } {
  const sum = gridCols + gridRows
  return { width: sum * HW, height: sum * HH }
}

export function computeViewportScale(gridCols: number, gridRows: number): number {
  const { width: isoWidth, height: isoHeight } = getIsoSize(gridCols, gridRows)
  if (isoWidth === 0 || isoHeight === 0) return 1
  return Math.min(VIEWPORT_WIDTH / isoWidth, VIEWPORT_HEIGHT / isoHeight, 1)
}

export function fitsViewport(gridCols: number, gridRows: number): boolean {
  return gridCols + gridRows <= MAX_GRID_SUM
}

export function getViewportOffsets(
  tiles: { col: number; row: number }[],
  minCol: number,
  minRow: number,
  scale: number,
): { offsetX: number; offsetY: number } {
  if (tiles.length === 0) return { offsetX: ORIGIN_X, offsetY: ORIGIN_Y - 40 }
  let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity
  for (const t of tiles) {
    const relCol = t.col - minCol
    const relRow = t.row - minRow
    const cx = (relCol - relRow) * HW * scale
    const cy = (relCol + relRow) * HH * scale
    minCx = Math.min(minCx, cx)
    maxCx = Math.max(maxCx, cx)
    minCy = Math.min(minCy, cy)
    maxCy = Math.max(maxCy, cy)
  }
  const centerX = (minCx + maxCx) / 2
  const centerY = (minCy + maxCy) / 2
  return { offsetX: ORIGIN_X - centerX, offsetY: (ORIGIN_Y - 40) - centerY }
}

/**
 * Verify every diamond corner stays within canvas after FIT centering at given scale/origin.
 * Uses centered offsets (see getViewportOffsets) so entire iso bbox is centered at ORIGIN,
 * mirroring src/main.ts renderer — guarantees scene remains in frame.
 */
export function diamondsFitInViewport(
  tiles: { col: number; row: number }[],
  minCol: number,
  minRow: number,
  scale: number,
): boolean {
  const hw = HW * scale
  const hh = HH * scale
  const { offsetX, offsetY } = getViewportOffsets(tiles, minCol, minRow, scale)
  for (const t of tiles) {
    const relCol = t.col - minCol
    const relRow = t.row - minRow
    const cx = offsetX + (relCol - relRow) * HW * scale
    const cy = offsetY + (relCol + relRow) * HH * scale
    const corners = [
      { x: cx, y: cy - hh },
      { x: cx + hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx - hw, y: cy },
    ]
    for (const c of corners) {
      if (c.x < -1 || c.x > RENDER_WIDTH + 1 || c.y < -1 || c.y > RENDER_HEIGHT + 1) return false
    }
  }
  return true
}

/**
 * Wall tile variants based on direction
 */
export function getWallVariant(col: number, row: number, roomMin: {col: number, row: number}, roomMax: {col: number, row: number}): string {
  if (row < roomMin.row) return 'N'
  if (row > roomMax.row) return 'S'
  if (col > roomMax.col) return 'E'
  if (col < roomMin.col) return 'W'

  if (row <= roomMin.row && col <= roomMin.col) return 'W'
  if (row <= roomMin.row && col >= roomMax.col) return 'E'
  if (row >= roomMax.row && col <= roomMin.col) return 'W'
  if (row >= roomMax.row && col >= roomMax.col) return 'E'

  return 'N'
}
