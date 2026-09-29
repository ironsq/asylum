# Rooms Spec

**Static templates** `src/data/rooms/index.ts:6` = `[cell, common, office]`. Generated once, reused per browser refresh (shuffle only).

**Interface** `src/types/room.ts:6`:
```ts
floor: GridPosition[] // green filled
walls: GridPosition[] // white boundary
doors: GridPosition[] // yellow exit/entry, owned by room
```

**Current shapes:**
- `cell.ts` `2x2` square `{(0,0),(1,0),(0,1),(1,1)}`, 1 door `floor edge` `1,0` (was wall `2,0`), walls `8` with opening at `2,0`
- `common.ts` `L` `7` tiles `{(0,0),(1,0),(2,0),(3,0),(0,1),(1,1),(2,1)}`, 2 doors `3,0` & `0,0` floor edges, walls `8` with openings at `4,0`/`-1,0` removed
- `office.ts` `3x3` `{(0,0)-(2,2)}` `9` tiles, 1 door `2,1` floor edge, walls `10` with opening at `3,1` removed

**Door rule:** Door is **floor tile on green edge inside room**, wall has opening outward (no wall tile beyond door). Yellow `src/main.ts:127` draws on `origin+door` with `0xffff00` fill, inside green block, not on wall ring outside. Wall tile outward from door is omitted (`walls` excludes `(door+ outward)`). `common` west door moved to `0,1` to keep distinct from `floor[0] 0,0` spawn. **Every door must be adjacent to `cyan` path tile or be designated `scene exit` at boundary; never adjacent only to `white` wall cells.**

**Spawn rule:** Spawn is **not a door**, inside room floor distinct from any door, distinct color `0x88ff00` vs floor `0x00ff00`/`yellow`, scene-determined (`src/systems/layout/generator.ts:162`), used on game start / re-spawn, does not track player.

**Rotation:** Scene may rotate whole template `0/90/180/270 cw` via `rotatePosition` in `src/systems/layout/generator.ts:14`, applied to floor/walls/doors together.

**Ownership:** Room handles yellow cells; scene never creates arbitrary yellows between rooms.

**Gap 1:** Verify `walls` opening matches door floor edge for each rotation.

**Preview:** `src/main.ts:95-128` draws floor green, walls white (boundary), doors yellow per-room.
