# Scene Spec

**Purpose:** Place pre-gen rooms, connect via doors/paths, designate scene-exit to other scene.

**Generator** `src/systems/layout/generator.ts`:

**Input:** `roomTemplates: RoomTemplate[]` static `spec/rooms.md`.

**Algorithm:** Random-toss + rotate + path if needed, flexible:
1. Shuffle `templates`
2. Place first room at `(0,0)` with random `rot 0-3`
3. For each next room: randomly try `direct door alignment` (door floor tiles adjacent, two yellows touching, no cyan) OR `path connection` (`door -> cyan path -> other door`). Try all `rot 0-3` x `existing door` x `new door` x `adjacent offset`. Check `isOverlapping` (floor vs floor/wall). Accept first non-overlapping; fallback distant placement only if no alignment found (to be researched for performance).
4. `normalizeToOrigin()` to fit viewport.
5. Designate `isEntry` first, `isExit` last.
6. `connectRooms()`: `paths: GridPosition[]` for `door->path->door` links. Scenic `cyan` paths only for dead-ends / inter-scene roads, not as fallback arbitrary, but path-mediated room link is allowed as type A.

**Two connection types:**
- **A) Path-mediated:** `room exit -> path (cyan) -> other room door` (path tiles bridging gap)
- **B) Direct:** `room doors aligned` (adjacent yellows, no path)

Scene must not place arbitrary yellow between rooms; it translates/rotates whole rooms so existing yellows align (A via path tiles, B via adjacency). **Path boundary:** `cyan` tiles must respect room boundary (`walls` `spec/rooms.md`) - never inside `floor`/`walls`, only adjacent to `door` floor edge at opening. **Every door must be adjacent to `cyan` path or be `scene exit` at boundary; never only to `white` walls.**

**Scene boundary & exits:** Scene has outer `white` wall ring covering `bbox` (all `floor`/`walls`/`doors` + `paths` bounds `src/systems/layout/generator.ts:33`), except at `scene exits`. **Spawn in room** (`0x88ff00` distinct, `floor` tile not a door, `src/systems/layout/generator.ts:162`), **exits at edge of scene via door OR via path** - if via `door` yellow `0xffff00` no color change, if via `path` fill cell with `cyan` `0x00ffff`. Every door not being scene exit must be `adjacent` to `cyan` path (never only to `white`).

**Scene-exit to other scene:** Multiple exits max 2. **First scene:** `spawn` inside room + **singular** exit at edge (door yellow or path cyan). **Later scenes:** up to `2` exits at edge, no spawn. `connectRooms` picks exits at `bbox` edge.

**Scenic paths:** No random dead-end cyan branching for now; cyan only for **A) path-mediated** room links.

**Paths vs Walls:** `isOverlapping` ensures new floor/walls don't overlap existing floors.

**Viewport guarantee & Dungeon Limits (MUST remain in frame):**
- Bbox is over **all** scene content: `floor|walls|doors|paths|entry|exit` (`getLayoutBounds` `src/systems/layout/generator.ts:33` includes `paths` and `entry/exit`; renderer `src/main.ts:29` mirrors it). `normalizeToOrigin()` shifts `minCol/minRow → 0,0` so origin is viewport-tied.
- **Dungeon Limits:** `S = gridCols + gridRows ≤ 28` (with `1920x1080` viewport `1720x880`, `HW=128 HH=64` → `Max S at scale 1 = floor(min(1720/128, 880/64)) = 13`; allowing FIT downscale to `~0.48` lifts limit to `28` — 27 at `0.497`, 28 at `0.479` still readable). Fixed spacing `6` (`src/systems/layout/generator.ts:296` positions `0,0 / 6,0 / 0,6`) keeps `3 rooms ≤ 28` after exit portal, avoids wall overlap after rotation (5 caused overlap). Generator MUST enforce: if computed `S > 28`, reject and re-place tighter (or assert in tests). Export `MAX_GRID_SUM = 28` and `fitsViewportLayout()` `src/systems/layout/generator.ts:60`.
- **Renderer guarantee:** `src/main.ts:32` computes `scale = min(viewportWidth/isoWidth, viewportHeight/isoHeight, 1)` via `computeViewportScale` `src/isometric.ts:87`, centers via `getViewportOffsets` `src/isometric.ts:101` at `ORIGIN_X=960 ORIGIN_Y=540` (`autoCenter` + `Scale.FIT` `src/main.ts:195`). This ensures every `getDiamondCorners` point is within `[0,1920]×[0,1080]` — verified by `diamondsFitInViewport` `src/isometric.ts:122` and tests `src/systems/layout/generator.test.ts:162`.

**Entry (spawn):** `spawnFloor = firstRoom.floor.find(f not in doors) || floor[0]` (`src/systems/layout/generator.ts:162`), drawn distinct `0x88ff00` not `0x00ff00` floor green, `src/main.ts:133`.

**Exit(s):** Unconnected door(s) (`exitDirection` N/S/E/W derived from door min/max `src/systems/layout/generator.ts:186`).

**Randomness:** Preview random per refresh; tests use deterministic seeds. Lock in ~3 seeds for reproducible verification, keep preview random with option to view locked seeds.

**Research:**
- **Random Room Placement + A*** (`Future Data Lab`): place rooms randomly, check `blockRoom()` overlap, then `A*` (`Manhattan` + binary heap, weighted straight) to connect doors; tunnel random if unconnected.
- **DunGen / Unreal ProceduralDungeon:** prefab rooms with doors, random select + align, `depth/breadth first`, `Can Loop` (any aligned door connects vs only used door), `Seed` `Random/Auto Increment/Fixed`, `Dungeon Limits` bbox reject.
- **Recursive door expansion** (`Unity Mihai`): maintain `open doors` list, pick one, filter rooms with matching door side, align, `occupied grid` overlap check (clone list for backtrack), recurse, backtrack on fail, guarantees fully connected.

**Recommendation for Asylum:** Implement recursive open-doors + `A*` path for type A. Use `DunGen` seed/limits pattern (`Random` preview, `Fixed` for 3 locked seeds as spec). Keep fixed `0,0/6,0/0,6` as fallback while research iterates.

**Visual:** `src/main.ts:121` draws cyan paths, `126` draws per-room yellows, `134` global exit arrow (debug).
