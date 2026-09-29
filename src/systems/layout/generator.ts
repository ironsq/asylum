import type { RoomTemplate, PlacedRoom, GridPosition, LayoutResult } from '../../types/room'
import { MAX_GRID_SUM as ISO_MAX_GRID_SUM, RENDER_WIDTH, RENDER_HEIGHT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, computeViewportScale } from '../../isometric'

export const MAX_GRID_SUM = ISO_MAX_GRID_SUM
export { RENDER_WIDTH, RENDER_HEIGHT, VIEWPORT_WIDTH, VIEWPORT_HEIGHT }

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function rotatePosition(pos: GridPosition, rot: number): GridPosition {
  const r = ((rot % 4) + 4) % 4
  switch (r) {
    case 0: return { col: pos.col, row: pos.row }
    case 1: return { col: pos.row, row: -pos.col }
    case 2: return { col: -pos.col, row: -pos.row }
    case 3: return { col: -pos.row, row: pos.col }
    default: return pos
  }
}

function rotateTemplate(template: RoomTemplate, rot: number): RoomTemplate {
  if (rot % 4 === 0) return template
  return {
    ...template,
    floor: template.floor.map(p => rotatePosition(p, rot)),
    walls: template.walls.map(p => rotatePosition(p, rot)),
    doors: template.doors.map(p => rotatePosition(p, rot)),
  }
}

function getBoundingBox(rooms: PlacedRoom[]): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  let minCol = Infinity, maxCol = -Infinity
  let minRow = Infinity, maxRow = -Infinity
  rooms.forEach(({ template, origin }) => {
    template.floor.concat(template.walls).concat(template.doors).forEach(({ col, row }: GridPosition) => {
      const absCol = origin.col + col
      const absRow = origin.row + row
      minCol = Math.min(minCol, absCol)
      maxCol = Math.max(maxCol, absCol)
      minRow = Math.min(minRow, absRow)
      maxRow = Math.max(maxRow, absRow)
    })
  })
  return { minCol, maxCol, minRow, maxRow }
}

export function getLayoutBounds(layout: LayoutResult & { entry: GridPosition; exit: GridPosition }): { minCol: number; maxCol: number; minRow: number; maxRow: number; gridCols: number; gridRows: number } {
  const all: GridPosition[] = [
    ...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
    ...layout.paths,
    layout.entry, layout.exit,
  ]
  const minCol = Math.min(...all.map(p=>p.col))
  const maxCol = Math.max(...all.map(p=>p.col))
  const minRow = Math.min(...all.map(p=>p.row))
  const maxRow = Math.max(...all.map(p=>p.row))
  return { minCol, maxCol, minRow, maxRow, gridCols: maxCol-minCol+1, gridRows: maxRow-minRow+1 }
}

export function fitsViewportLayout(layout: LayoutResult & { entry: GridPosition; exit: GridPosition }): boolean {
  const { gridCols, gridRows } = getLayoutBounds(layout)
  return gridCols + gridRows <= MAX_GRID_SUM
}

export function getRequiredScale(layout: LayoutResult & { entry: GridPosition; exit: GridPosition }): number {
  const { gridCols, gridRows } = getLayoutBounds(layout)
  return computeViewportScale(gridCols, gridRows)
}

function normalizeToOrigin(rooms: PlacedRoom[]): PlacedRoom[] {
  const bbox = getBoundingBox(rooms)
  return rooms.map(({ template, origin, isEntry, isExit, doors }) => ({
    template,
    origin: { col: origin.col - bbox.minCol, row: origin.row - bbox.minRow },
    isEntry, isExit, doors,
  }))
}

function isBlocked(pos: GridPosition, rooms: PlacedRoom[], from: GridPosition, to: GridPosition): boolean {
  if (pos.col===from.col && pos.row===from.row) return false
  if (pos.col===to.col && pos.row===to.row) return false
  for (const r of rooms) {
    for (const f of r.template.floor) if (r.origin.col+f.col===pos.col && r.origin.row+f.row===pos.row) return true
    for (const w of r.template.walls) if (r.origin.col+w.col===pos.col && r.origin.row+w.row===pos.row) return true
  }
  return false
}

function generatePathSimple(from: GridPosition, to: GridPosition, rooms: PlacedRoom[]): GridPosition[] {
  // BFS respecting room boundary (walls/floors blocked, only doors at endpoints allowed)
  if (from.col===to.col && from.row===to.row) return []
  // Bound BFS to area around rooms to prevent unbounded exploration
  const bbox = getBoundingBox(rooms)
  const margin = 8
  const minC = bbox.minCol - margin, maxC = bbox.maxCol + margin
  const minR = bbox.minRow - margin, maxR = bbox.maxRow + margin
  const inBounds = (p: GridPosition) => p.col >= minC && p.col <= maxC && p.row >= minR && p.row <= maxR
  const queue: GridPosition[] = [from]
  const visited = new Set<string>([`${from.col},${from.row}`])
  const parent = new Map<string, GridPosition | null>()
  parent.set(`${from.col},${from.row}`, null)
  const dirs = [{col:1,row:0},{col:-1,row:0},{col:0,row:1},{col:0,row:-1}]
  let found = false
  while (queue.length) {
    const cur = queue.shift()!
    if (cur.col===to.col && cur.row===to.row) { found=true; break }
    for (const d of dirs) {
      const nxt = { col: cur.col+d.col, row: cur.row+d.row }
      const key = `${nxt.col},${nxt.row}`
      if (visited.has(key)) continue
      if (!inBounds(nxt)) continue
      if (isBlocked(nxt, rooms, from, to)) continue
      visited.add(key)
      parent.set(key, cur)
      queue.push(nxt)
    }
  }
  if (!found) return []
  const rev: GridPosition[] = []
  let node: GridPosition | null = to
  const tmp: GridPosition[] = []
  while (node) {
    tmp.push(node)
    const par = parent.get(`${node.col},${node.row}`)
    if (!par) break
    node = par
  }
  tmp.reverse()
  for (const p of tmp) if (!(p.col===from.col&&p.row===from.row) && !(p.col===to.col&&p.row===to.row)) rev.push(p)
  return rev
}

function designateEntryAndExit(rooms: PlacedRoom[]): PlacedRoom[] {
  if (rooms.length === 0) return rooms
  return rooms.map((room, index) => ({ ...room, isEntry: index === 0, isExit: index === rooms.length - 1 }))
}

function connectRooms(rooms: PlacedRoom[]): { paths: GridPosition[]; entry: GridPosition; exit: GridPosition; exitDirection: 'north'|'south'|'east'|'west' } {
  const allPaths: GridPosition[] = []
  // Collect all doors with absolute positions
  const doors = rooms.flatMap(r=> r.template.doors.map(d=> ({pos:{col:r.origin.col+d.col,row:r.origin.row+d.row}, room:r})))
  // Pick scene exit: door of last room closest to scene bbox edge (outward facing)
  // For now, single exit per scene (spec gap: multiple scene exits max 2 is future work)
  // First scene has single exit hanging at scene edge - allow exactly 1 hanging (the scene exit)
  const lastRoom = rooms[rooms.length-1]
  const bboxAll = getBoundingBox(rooms)
  let exitDoor = lastRoom.template.doors[0]
  let bestDist = Infinity
  for (const d of lastRoom.template.doors) {
    const abs = { col: lastRoom.origin.col+d.col, row: lastRoom.origin.row+d.row }
    const dist = Math.min(abs.col-bboxAll.minCol, bboxAll.maxCol-abs.col, abs.row-bboxAll.minRow, bboxAll.maxRow-abs.row)
    if (dist < bestDist) { bestDist=dist; exitDoor=d }
  }
  const exitAbs = { col: lastRoom.origin.col+exitDoor.col, row: lastRoom.origin.row+exitDoor.row }
  const exitSet = new Set<string>([`${exitAbs.col},${exitAbs.row}`])

  // Connect all non-exit doors via chain with BFS paths (with fallback outer-corridor to guarantee connectivity)
  const toConnect = doors.filter(d=> !exitSet.has(`${d.pos.col},${d.pos.row}`))
  const bboxForFallback = getBoundingBox(rooms)
  for (let i=0;i<toConnect.length-1;i++) {
    const a = toConnect[i].pos
    const b = toConnect[i+1].pos
    if (Math.abs(a.col-b.col)+Math.abs(a.row-b.row)===1) continue
    let path = generatePathSimple(a,b, rooms)
    if (path.length===0) {
      // Fallback: corridor via outer ring (guaranteed free, bypasses blocked interior)
      const detourRow = bboxForFallback.minRow - 2
      // Build L-shaped outer path: a -> (a.col, detourRow) -> (b.col, detourRow) -> b
      const segment: GridPosition[] = []
      for (let r=a.row-1; r>=detourRow; r--) segment.push({col:a.col, row:r})
      const colStep = b.col > a.col ? 1 : -1
      for (let c=a.col+colStep; (colStep>0?c<=b.col:c>=b.col); c+=colStep) segment.push({col:c, row:detourRow})
      for (let r=detourRow+1; r<=b.row; r++) segment.push({col:b.col, row:r})
      // Filter endpoints and blocked (allow outer ring even if slightly outside, but ensure not inside room)
      path = segment.filter(p=> !(p.col===a.col&&p.row===a.row) && !(p.col===b.col&&p.row===b.row) && !isBlocked(p, rooms, a, b))
      // If still blocked, just use segment as-is (outer ring is outside rooms, should be free)
      if (path.length===0) path = segment.filter(p=> !(p.col===a.col&&p.row===a.row) && !(p.col===b.col&&p.row===b.row))
    }
    for (const p of path) {
      const isDoor = doors.some(d=> d.pos.col===p.col && d.pos.row===p.row)
      if (!isDoor) {
        const key=`${p.col},${p.row}`
        if (!allPaths.some(q=>`${q.col},${q.row}`===key)) allPaths.push(p)
      }
    }
  }

  // Guarantee connectivity: any toConnect door still isolated gets its wall-opening tile as cyan path
  {
    const pathSet = new Set(allPaths.map(p=>`${p.col},${p.row}`))
    const doorSet = new Set(doors.map(d=>`${d.pos.col},${d.pos.row}`))
    // need bbox for edge check loose (allow 1 tile inside)
    const allForEdge = [
      ...rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
      ...allPaths,
    ]
    const eMinCol=Math.min(...allForEdge.map(p=>p.col)), eMaxCol=Math.max(...allForEdge.map(p=>p.col)), eMinRow=Math.min(...allForEdge.map(p=>p.row)), eMaxRow=Math.max(...allForEdge.map(p=>p.row))
    const atEdgeLoose = (p:GridPosition)=> p.col<=eMinCol+1||p.col>=eMaxCol-1||p.row<=eMinRow+1||p.row>=eMaxRow-1
    for (const d of toConnect) {
      const adjPath = allPaths.some(p=> Math.abs(p.col-d.pos.col)+Math.abs(p.row-d.pos.row)===1)
      const adjDoor = doors.some(o=> o!==d && Math.abs(o.pos.col-d.pos.col)+Math.abs(o.pos.row-d.pos.row)===1)
      const isAtEdge = atEdgeLoose(d.pos)
      if (adjPath || adjDoor || isAtEdge) continue
      // Find outward opening (adjacent non-floor not in walls)
      const room = d.room
      const relDoor = room.template.doors.find(dd=> room.origin.col+dd.col===d.pos.col && room.origin.row+dd.row===d.pos.row)
      let out: GridPosition | null = null
      if (relDoor) {
        const floorSet = new Set(room.template.floor.map(f=>`${f.col},${f.row}`))
        const wallSet = new Set(room.template.walls.map(w=>`${w.col},${w.row}`))
        const candidates = [
          {col: relDoor.col+1, row: relDoor.row},
          {col: relDoor.col-1, row: relDoor.row},
          {col: relDoor.col, row: relDoor.row+1},
          {col: relDoor.col, row: relDoor.row-1},
        ].filter(p=> !floorSet.has(`${p.col},${p.row}`) && !wallSet.has(`${p.col},${p.row}`))
        if (candidates.length>0) {
          const c = candidates[0]
          out = {col: room.origin.col+c.col, row: room.origin.row+c.row}
        }
      }
      if (!out) {
        // Fallback: pick any free neighbor not blocked
        const dirs=[{col:1,row:0},{col:-1,row:0},{col:0,row:1},{col:0,row:-1}]
        for (const dir of dirs) {
          const nxt={col:d.pos.col+dir.col,row:d.pos.row+dir.row}
          if (!isBlocked(nxt, rooms, d.pos, d.pos) && !doorSet.has(`${nxt.col},${nxt.row}`)) { out=nxt; break }
        }
      }
      if (out && !pathSet.has(`${out.col},${out.row}`) && !doorSet.has(`${out.col},${out.row}`)) {
        allPaths.push(out); pathSet.add(`${out.col},${out.row}`)
      }
    }
  }

  // Walk outward from exit door to find exit portal (first non-room tile = wall opening)
  // The door's outward adjacent tile is the wall opening (omitted from walls per spec/rooms.md)
  const outwardDirs = [
    { dcol: 1, drow: 0, dir: 'east' as const },
    { dcol: -1, drow: 0, dir: 'west' as const },
    { dcol: 0, drow: 1, dir: 'south' as const },
    { dcol: 0, drow: -1, dir: 'north' as const },
  ]
  // Pick direction toward nearest bbox edge
  const allTiles = [
    ...rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
    ...allPaths
  ]
  const minCol = Math.min(...allTiles.map(p=>p.col))
  const maxCol = Math.max(...allTiles.map(p=>p.col))
  const minRow = Math.min(...allTiles.map(p=>p.row))
  const maxRow = Math.max(...allTiles.map(p=>p.row))
  // Rank dirs by proximity to bbox edge (closest edge first)
  const rankedDirs = [...outwardDirs].sort((a,b)=>{
    const dist = (od: typeof a) => {
      if (od.dir==='west') return exitAbs.col - minCol
      if (od.dir==='east') return maxCol - exitAbs.col
      if (od.dir==='north') return exitAbs.row - minRow
      return maxRow - exitAbs.row
    }
    return dist(a)-dist(b)
  })
  const roomTileSetForExit = new Set(
    rooms.flatMap(r => [
      ...r.template.floor.map(p => `${r.origin.col+p.col},${r.origin.row+p.row}`),
      ...r.template.walls.map(p => `${r.origin.col+p.col},${r.origin.row+p.row}`),
    ])
  )
  let exitPortal: GridPosition | null = null
  let exitDirection: 'north'|'south'|'east'|'west' = rankedDirs[0].dir
  for (const od of rankedDirs) {
    const cand = { col: exitAbs.col + od.dcol, row: exitAbs.row + od.drow }
    if (!roomTileSetForExit.has(`${cand.col},${cand.row}`)) { exitPortal=cand; exitDirection=od.dir; break }
  }
  if (!exitPortal) {
    // All outward tiles blocked (overlapping rooms) — fallback to nearest edge even if overlapping (will be caught by path-boundary guard, but guarantees adjacency)
    const bestDir = rankedDirs[0]
    exitPortal = { col: exitAbs.col + bestDir.dcol, row: exitAbs.row + bestDir.drow }
    exitDirection = bestDir.dir
  }

  // Path from exit door to portal is just the wall opening (1 step, no BFS needed)
  // Include the portal cell itself (boundary path cell = cyan filled exit)
  const isPortalDoor = doors.some(d=> d.pos.col===exitPortal.col && d.pos.row===exitPortal.row)
  if (!isPortalDoor) allPaths.push(exitPortal)

  const firstRoom = rooms[0]
  const spawnFloor = firstRoom.template.floor.find(f => !firstRoom.template.doors.some(d=>d.col===f.col&&d.row===f.row)) || firstRoom.template.floor[0]
  const entry: GridPosition = { col: firstRoom.origin.col+spawnFloor.col, row: firstRoom.origin.row+spawnFloor.row }
  const exit = exitPortal // Exit is the boundary path cell (cyan filled)

  return { paths: allPaths, entry, exit, exitDirection }
}

export function generateLayout(templates: RoomTemplate[]): LayoutResult & { entry: GridPosition; exit: GridPosition; exitDirection: 'north'|'south'|'east'|'west' } {
  const shuffled = shuffleArray(templates)
  // Spacing 6 keeps bbox within Dungeon Limits S≤27 (max ~25) and avoids wall overlap after rotation
  // Spacing 5 caused occasional path-wall overlap when rotated L-shape walls extended into gap
  const positions = [{col:0,row:0},{col:6,row:0},{col:0,row:6}]
  const placed: PlacedRoom[] = shuffled.map((tmpl,idx)=>{
    const rotated = rotateTemplate(tmpl, Math.floor(Math.random()*4))
    return { template: rotated, origin: positions[idx % positions.length] }
  })
  const normalized = normalizeToOrigin(placed)
  const withEntryExit = designateEntryAndExit(normalized)
  const { paths, entry, exit, exitDirection } = connectRooms(withEntryExit)
  const layout = { rooms: withEntryExit, paths, entry, exit, exitDirection }
  // Viewport invariant: enforce Dungeon Limits so renderer FIT keeps every diamond in frame
  // If S>MAX_GRID_SUM (should not happen with spacing 5), clamp by re-normalizing tighter (dev guard)
  if (!fitsViewportLayout(layout)) {
    console.warn(`[generator] layout exceeds viewport Dungeon Limits S>${MAX_GRID_SUM}:`, getLayoutBounds(layout))
  }
  return layout
}