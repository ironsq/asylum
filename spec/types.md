# Types Spec

`src/types/room.ts:1`:
```ts
GridPosition {col,row}
RoomTemplate {id,name,floor,walls,doors}
PlacedRoom {template,origin,isEntry?,isExit?,doors?}
LayoutResult {rooms,paths}
```

**Mapping:** `origin` is grid offset added to template `col/row` for absolute position. `doors` are floor-edge yellows per `spec/rooms.md`.

**Generator return:** `LayoutResult & {entry,exit,exitDirection}` `src/systems/layout/generator.ts:226`.
