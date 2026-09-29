import { describe, it, expect } from 'vitest'
import {
  gridToScreen,
  getDiamondCorners,
  areTilesAdjacent,
  getNeighbors,
  TILE_WIDTH,
  TILE_HEIGHT
} from './isometric'
import { generateLayout } from './systems/layout/generator'
import { roomTemplates } from './data/rooms'

describe('Isometric Projection', () => {
  describe('gridToScreen', () => {
    it('origin maps to (0, 0)', () => {
      expect(gridToScreen(0, 0)).toEqual({ x: 0, y: 0 })
    })

    it('moving right (+col) goes right and down', () => {
      const pos = gridToScreen(1, 0)
      expect(pos.x).toBe(TILE_WIDTH / 2)
      expect(pos.y).toBe(TILE_HEIGHT / 2)
    })

    it('moving down (+row) goes left and down', () => {
      const pos = gridToScreen(0, 1)
      expect(pos.x).toBe(-TILE_WIDTH / 2)
      expect(pos.y).toBe(TILE_HEIGHT / 2)
    })

    it('moving diagonally (+col, +row) goes straight down', () => {
      const pos = gridToScreen(1, 1)
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(TILE_HEIGHT)
    })
  })

  describe('Diamond corners', () => {
    it('tile at (0,0) has correct diamond shape', () => {
      const corners = getDiamondCorners(0, 0)
      const hw = TILE_WIDTH / 2
      const hh = TILE_HEIGHT / 2

      expect(corners[0]).toEqual({ x: 0, y: -hh })
      expect(corners[1]).toEqual({ x: hw, y: 0 })
      expect(corners[2]).toEqual({ x: 0, y: hh })
      expect(corners[3]).toEqual({ x: -hw, y: 0 })
    })
  })

  describe('Tile adjacency', () => {
    const testCases = [
      { a: { col: 0, row: 0 }, b: { col: 1, row: 0 }, shouldConnect: true, label: 'right neighbor' },
      { a: { col: 0, row: 0 }, b: { col: 0, row: 1 }, shouldConnect: true, label: 'bottom neighbor' },
      { a: { col: 0, row: 0 }, b: { col: -1, row: 0 }, shouldConnect: true, label: 'left neighbor' },
      { a: { col: 0, row: 0 }, b: { col: 0, row: -1 }, shouldConnect: true, label: 'top neighbor' },
      { a: { col: 0, row: 0 }, b: { col: 1, row: 1 }, shouldConnect: false, label: 'diagonal (should NOT connect)' },
      { a: { col: 0, row: 0 }, b: { col: 2, row: 0 }, shouldConnect: false, label: 'two tiles away (should NOT connect)' },
    ]

    testCases.forEach(({ a, b, shouldConnect, label }) => {
      it(`${label}: (${a.col},${a.row}) and (${b.col},${b.row})`, () => {
        expect(areTilesAdjacent(a.col, a.row, b.col, b.row)).toBe(shouldConnect)
      })
    })
  })

  describe('Room layout', () => {
    it('floor tile at (0,0) connects to wall tile at (0,-1)', () => {
      expect(areTilesAdjacent(0, 0, 0, -1)).toBe(true)
    })

    it('all floor tiles in a 3x3 room connect to their neighbors', () => {
      const floorTiles = [
        { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
        { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
        { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
      ]

      for (const tile of floorTiles) {
        const neighbors = getNeighbors(tile.col, tile.row)
        for (const neighbor of neighbors) {
          if (floorTiles.some(f => f.col === neighbor.col && f.row === neighbor.row)) {
            expect(areTilesAdjacent(tile.col, tile.row, neighbor.col, neighbor.row)).toBe(true)
          }
        }
      }
    })

    it('wall ring surrounds floor with no gaps', () => {
      const floorTiles = [
        { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
        { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
        { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
      ]

      const edgeWalls = [
        { col: 0, row: -1 }, { col: 1, row: -1 }, { col: 2, row: -1 },
        { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 },
        { col: -1, row: 0 }, { col: -1, row: 1 }, { col: -1, row: 2 },
        { col: 3, row: 0 }, { col: 3, row: 1 }, { col: 3, row: 2 },
      ]

      const cornerWalls = [
        { col: -1, row: -1 }, { col: 3, row: -1 },
        { col: -1, row: 3 }, { col: 3, row: 3 },
      ]

      for (const wall of edgeWalls) {
        const adjacentToFloor = floorTiles.some(floor =>
          areTilesAdjacent(wall.col, wall.row, floor.col, floor.row)
        )
        expect(adjacentToFloor).toBe(true)
      }

      for (const corner of cornerWalls) {
        const adjacentToEdgeWall = edgeWalls.some(edge =>
          areTilesAdjacent(corner.col, corner.row, edge.col, edge.row)
        )
        expect(adjacentToEdgeWall).toBe(true)
      }

      const edgeFloorTiles = floorTiles.filter(f =>
        f.col === 0 || f.col === 2 || f.row === 0 || f.row === 2
      )
      for (const floor of edgeFloorTiles) {
        const adjacentToWall = edgeWalls.some(wall =>
          areTilesAdjacent(floor.col, floor.row, wall.col, wall.row)
        )
        expect(adjacentToWall).toBe(true)
      }
    })
  })

  describe('Layout generation', () => {
    it('generates valid layout without throwing', () => {
      expect(() => generateLayout(roomTemplates)).not.toThrow()
    })

    it('generates layout with entry and exit', () => {
      const layout = generateLayout(roomTemplates)
      expect(layout.entry).toBeDefined()
      expect(layout.exit).toBeDefined()
      expect(layout.entry.col).toBeGreaterThanOrEqual(0)
      expect(layout.entry.row).toBeGreaterThanOrEqual(0)
      expect(layout.exit.col).toBeGreaterThanOrEqual(0)
      expect(layout.exit.row).toBeGreaterThanOrEqual(0)
    })

    it('generates layout with rooms', () => {
      const layout = generateLayout(roomTemplates)
      expect(layout.rooms.length).toBe(3)
    })

    it('generates layout multiple times without error', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => generateLayout(roomTemplates)).not.toThrow()
      }
    })
  })
})
