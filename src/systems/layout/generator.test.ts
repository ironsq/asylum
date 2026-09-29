import { describe, it, expect } from 'vitest'
import { generateLayout, getLayoutBounds, fitsViewportLayout, getRequiredScale, MAX_GRID_SUM } from './generator'
import { roomTemplates } from '../../data/rooms'
import type { GridPosition } from '../../types/room'
import { computeViewportScale, diamondsFitInViewport, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, HW, HH } from '../../isometric'

function rotatePos(pos: GridPosition, rot: number): GridPosition {
  const r = ((rot % 4) + 4) % 4
  switch (r) {
    case 0: return { col: pos.col, row: pos.row }
    case 1: return { col: pos.row, row: -pos.col }
    case 2: return { col: -pos.col, row: -pos.row }
    case 3: return { col: -pos.row, row: pos.col }
    default: return pos
  }
}

function rotateAll(positions: GridPosition[], rot: number): GridPosition[] {
  return positions.map(p => rotatePos(p, rot))
}

describe('Generator - spec compliance', () => {
  it('1 room: yellow door is floor tile inside green, wall opening exists, spawn distinct', () => {
    const office = roomTemplates.find(r=>r.id==='office')!
    // Direct check on template - door should be floor tile inside
    expect(office.floor.some(f=>f.col===2 && f.row===1)).toBe(true) // door floor edge
    expect(office.doors.some(d=>d.col===2 && d.row===1)).toBe(true)
    // wall opening at 3,1 should NOT exist
    expect(office.walls.some(w=>w.col===3 && w.row===1)).toBe(false)
    // spawn distinct will be tested via layout
    const layout = generateLayout([office])
    expect(layout.rooms.length).toBe(1)
    const doorAbs = { col: layout.rooms[0].origin.col+2, row: layout.rooms[0].origin.row+1 } // door floor tile
    expect(layout.entry.col===doorAbs.col && layout.entry.row===doorAbs.row).toBe(false)
  })

  it('rotation: for every template at rot 0-3, each door is a floor tile and wall has opening at door outward', () => {
    for (const tmpl of roomTemplates) {
      for (let rot = 0; rot < 4; rot++) {
        const floor = rotateAll(tmpl.floor, rot)
        const walls = rotateAll(tmpl.walls, rot)
        const doors = rotateAll(tmpl.doors, rot)
        const floorSet = new Set(floor.map(f => `${f.col},${f.row}`))
        const wallSet = new Set(walls.map(w => `${w.col},${w.row}`))
        for (const door of doors) {
          // spec/rooms.md: door is floor tile on edge inside room
          expect(floorSet.has(`${door.col},${door.row}`),
            `${tmpl.id} rot${rot}: door (${door.col},${door.row}) must be in floor`).toBe(true)
          // spec/rooms.md: wall tile outward from door is omitted (opening)
          const adjNonFloor = [
            { col: door.col + 1, row: door.row },
            { col: door.col - 1, row: door.row },
            { col: door.col, row: door.row + 1 },
            { col: door.col, row: door.row - 1 },
          ].filter(p => !floorSet.has(`${p.col},${p.row}`))
          const hasOpening = adjNonFloor.some(p => !wallSet.has(`${p.col},${p.row}`))
          expect(hasOpening,
            `${tmpl.id} rot${rot}: door (${door.col},${door.row}) must have wall opening (adjacent non-floor tile NOT in walls)`).toBe(true)
        }
      }
    }
  })

  it('3 rooms: every yellow either adjacent to another yellow or connected via cyan path, no hanging', () => {
    const layout = generateLayout(roomTemplates)
    const doors = layout.rooms.flatMap(r=> r.template.doors.map(d=> ({col:r.origin.col+d.col,row:r.origin.row+d.row})))
    expect(doors.length).toBe(4) // cell1+common2+office1
    // Count hanging doors (not adjacent to door nor path)
    const hanging = doors.filter(d=>{
      const adjDoor = doors.some(o=> o!==d && Math.abs(o.col-d.col)+Math.abs(o.row-d.row)===1)
      const adjPath = layout.paths.some(p=> Math.abs(p.col-d.col)+Math.abs(p.row-d.row)===1)
      return !adjDoor && !adjPath
    })
    // First scene has single exit hanging at scene edge - allow exactly 1 hanging (the scene exit)
    expect(hanging.length).toBeLessThanOrEqual(1)
  })

  it('3 rooms: spawn distinct from any door and inside a room floor', () => {
    const layout = generateLayout(roomTemplates)
    const doors = layout.rooms.flatMap(r=> r.template.doors.map(d=> `${r.origin.col+d.col},${r.origin.row+d.row}`))
    const entryKey = `${layout.entry.col},${layout.entry.row}`
    expect(doors).not.toContain(entryKey)
    const floors = layout.rooms.flatMap(r=> r.template.floor.map(f=> `${r.origin.col+f.col},${r.origin.row+f.row}`))
    expect(floors).toContain(entryKey)
  })

  it('3 rooms: entry and exit not same tile', () => {
    const layout = generateLayout(roomTemplates)
    expect(`${layout.entry.col},${layout.entry.row}`).not.toBe(`${layout.exit.col},${layout.exit.row}`)
  })

  it('spawn in room, exits at edge via door or path', () => {
    const layout = generateLayout(roomTemplates)
    const all = [
      ...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
      ...layout.rooms.flatMap(r=> r.template.doors.map(d=>({col:r.origin.col+d.col,row:r.origin.row+d.row}))),
      ...layout.paths
    ]
    const minCol=Math.min(...all.map(p=>p.col)), maxCol=Math.max(...all.map(p=>p.col)), minRow=Math.min(...all.map(p=>p.row)), maxRow=Math.max(...all.map(p=>p.row))
    const atEdgeLoose = (p:{col:number,row:number})=> p.col<=minCol+1||p.col>=maxCol-1||p.row<=minRow+1||p.row>=maxRow-1
    const atEdgeExact = (p:{col:number,row:number})=> p.col===minCol||p.col===maxCol||p.row===minRow||p.row===maxRow
    // spawn must be inside, not at exact edge
    const isSpawnAtEdge = atEdgeExact(layout.entry)
    expect(isSpawnAtEdge).toBe(false)
    // exit must be at edge via door or path (allow 1 tile inside because door floor is 1 inside wall opening)
    const exitAtEdge = atEdgeLoose(layout.exit) || layout.paths.some(p=> atEdgeLoose(p))
    expect(exitAtEdge).toBe(true)
    // every door must be adjacent to path or be at edge (scene exit)
    const doors = layout.rooms.flatMap(r=> r.template.doors.map(d=>({col:r.origin.col+d.col,row:r.origin.row+d.row})))
    for (const d of doors) {
      const adjPath = layout.paths.some(p=> Math.abs(p.col-d.col)+Math.abs(p.row-d.row)===1)
      const adjDoor = doors.some(o=> o!==d && Math.abs(o.col-d.col)+Math.abs(o.row-d.row)===1)
      const isAtEdge = atEdgeLoose(d)
      const ok = adjPath || adjDoor || isAtEdge
      expect(ok, `door ${d.col},${d.row} must be path-adjacent or edge exit, not wall`).toBe(true)
    }
  })

  it('paths never overlap room floors or walls (spec/scene.md path boundary)', () => {
    const layout = generateLayout(roomTemplates)
    const roomTiles = new Set(
      layout.rooms.flatMap(r => [
        ...r.template.floor.map(p => `${r.origin.col+p.col},${r.origin.row+p.row}`),
        ...r.template.walls.map(p => `${r.origin.col+p.col},${r.origin.row+p.row}`),
      ])
    )
    for (const p of layout.paths) {
      const key = `${p.col},${p.row}`
      expect(roomTiles.has(key),
        `path tile (${p.col},${p.row}) must not overlap room floor or wall`).toBe(false)
    }
  })

  it('entry and exit are in different rooms when multiple rooms exist', () => {
    const layout = generateLayout(roomTemplates)
    if (layout.rooms.length < 2) return
    const entryRoom = layout.rooms.find(r => {
      const origin = r.origin
      return r.template.floor.some(f => origin.col+f.col===layout.entry.col && origin.row+f.row===layout.entry.row)
    })
    const exitRoom = layout.rooms.find(r => {
      const origin = r.origin
      return r.template.floor.some(f => origin.col+f.col===layout.exit.col && origin.row+f.row===layout.exit.row)
    })
    // exit may be at scene boundary (path tile), so only check if exit is inside a room
    if (exitRoom) {
      expect(entryRoom).toBeDefined()
      expect(entryRoom!.template.id).not.toBe(exitRoom!.template.id)
    }
  })

  it('bbox fits 1080p viewport (scale logic)', () => {
    const layout = generateLayout(roomTemplates)
    const bounds = getLayoutBounds(layout)
    const { gridCols, gridRows } = bounds
    // Dungeon Limits: S=cols+rows must stay within MAX_GRID_SUM so scale never below readable threshold
    expect(gridCols + gridRows).toBeLessThanOrEqual(MAX_GRID_SUM)
    expect(gridCols + gridRows).toBeLessThanOrEqual(28)
    expect(fitsViewportLayout(layout)).toBe(true)
    // Scale guarantee: layout requires scale that keeps iso bbox inside 1720x880 viewport
    const scale = getRequiredScale(layout)
    expect(scale).toBeGreaterThan(0)
    expect(scale).toBeLessThanOrEqual(1)
    // At S<=27 scale >=0.49 (1720/(27*128)=0.497) — still readable, no clipping
    if (gridCols + gridRows > 13) {
      expect(scale).toBeGreaterThanOrEqual(0.45)
    }
    // No diamond corner may be clipped after FIT centering (spec/isometric.md Viewport invariant)
    const allTiles: GridPosition[] = [
      ...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
      ...layout.paths,
      layout.entry, layout.exit,
    ]
    const isoW = (gridCols+gridRows)*HW, isoH = (gridCols+gridRows)*HH
    expect(isoW * scale).toBeLessThanOrEqual(VIEWPORT_WIDTH + 0.001)
    expect(isoH * scale).toBeLessThanOrEqual(VIEWPORT_HEIGHT + 0.001)
    expect(diamondsFitInViewport(allTiles, bounds.minCol, bounds.minRow, scale)).toBe(true)
    // Direct computeViewportScale parity
    expect(computeViewportScale(gridCols, gridRows)).toBe(scale)
  })

  it('viewport invariant holds over 50 random layouts (Dungeon Limits + FIT)', () => {
    for (let i=0;i<50;i++) {
      const layout = generateLayout(roomTemplates)
      expect(fitsViewportLayout(layout), `iter ${i}: S=${getLayoutBounds(layout).gridCols+getLayoutBounds(layout).gridRows} must be ≤${MAX_GRID_SUM}`).toBe(true)
      const bounds = getLayoutBounds(layout)
      const scale = getRequiredScale(layout)
      expect(scale).toBeGreaterThan(0)
      expect(scale).toBeLessThanOrEqual(1)
      const allTiles: GridPosition[] = [
        ...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
        ...layout.paths,
        layout.entry, layout.exit,
      ]
      expect(diamondsFitInViewport(allTiles, bounds.minCol, bounds.minRow, scale), `iter ${i}: diamonds must fit in 1920x1080 after FIT`).toBe(true)
    }
  })

  it('single-room layout also respects viewport invariant', () => {
    const office = roomTemplates.find(r=>r.id==='office')!
    const layout = generateLayout([office])
    expect(fitsViewportLayout(layout)).toBe(true)
    const bounds = getLayoutBounds(layout)
    expect(diamondsFitInViewport(
      [...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))), ...layout.paths, layout.entry, layout.exit],
      bounds.minCol, bounds.minRow, getRequiredScale(layout)
    )).toBe(true)
  })
})
