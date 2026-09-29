# SPEC Index - Asylum Isometric Dungeon

Master catalogue. Agent and user consult here to find detailed specs.

**Project:** Isometric dungeon (Phaser 4 + TypeScript + Vite, tiles 256x512 art, 256x128 diamond `src/isometric.ts`)

| Spec | File | Status | Covers |
|------|------|--------|--------|
| Isometric | `spec/isometric.md` | draft | Grid math, `HW=128 HH=64`, `toScreen`, `getDiamondCorners`, origin `0.5,1.0` |
| Rooms | `spec/rooms.md` | draft | Templates `src/data/rooms/*`, floor/walls/doors (yellow) ownership, rotation |
| Scene | `spec/scene.md` | draft | Layout `src/systems/layout/generator.ts`, placement/rotation/alignment, direct vs path connections, scene-exit to other scene, scenic paths |
| Arrow | `spec/arrow.md` | deprecated | Debug arrow for agent feedback only, not needed in production |
| Types | `spec/types.md` | todo | `src/types/room.ts` interfaces |

**Render target:** `1920x1080` (1080p) → `Scale.FIT` fullscreen proportional (see `isometric.md`).

**Reading order:** `isometric.md` -> `rooms.md` -> `scene.md`

**Update rule:** Any gap/ambiguity/uncertainty → ask via tool before editing spec.

**Source of truth:** `src/data/rooms/index.ts` (static templates), `src/systems/layout/generator.ts` (placement), `src/main.ts` (render preview).

## Open Gaps
- [x] Room walls opening at door floor edge - verified `walls` excludes outward tile (`cell 2,0` `office 3,1` `common 4,0/-1,0`)
- [x] Spawn distinct from door - `common 0,1` vs `0,0`, entry picks non-door floor
- [x] Scene placement algorithm research - filled: random-toss + A* (Manhattan) vs DunGen open-doors + backtrack vs recursive door expansion; recommendation recursive + A* with seed Fixed/Random and Dungeon Limits (see `spec/scene.md` Research)
- [x] Scenic paths - none for now, cyan only for room-room path-mediated links
- [x] Render target 1080p FIT scaling - `src/main.ts` now `1920x1080` `Scale.FIT` `autoCenter` (was `1280x800`), viewport invariant enforced
- [x] Viewport invariant (scene must remain in frame) - `spec/isometric.md` + `spec/scene.md` Dungeon Limits `S≤28` (27 at 0.497, 28 at 0.479), `normalizeToOrigin` + `computeViewportScale`/`getViewportOffsets`/`diamondsFitInViewport` `src/isometric.ts:87` + renderer FIT centering `src/main.ts:32,195`, generator `MAX_GRID_SUM` `src/systems/layout/generator.ts:60`, tests `src/systems/layout/generator.test.ts:163`
- [ ] Multiple scene exits (max 2, first scene 1+spawn) - generator currently single exit, extend to 2
