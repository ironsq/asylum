import type { RoomTemplate } from '../../types/room'

export const common: RoomTemplate = {
  id: 'common',
  name: 'Common Room',
  floor: [
    // Main area (3x2)
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
    // Extension (L-shape)
    { col: 3, row: 0 },
  ],
  walls: [
    // Top wall
    { col: 0, row: -1 }, { col: 1, row: -1 }, { col: 2, row: -1 }, { col: 3, row: -1 },
    // Bottom wall
    { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
    // Left wall (door at 0,1 creates opening at -1,1)
    // { col: -1, row: 1 },
    // Right wall (door at 3,0 creates opening at 4,0)
    // Right wall (lower part)
    { col: 3, row: 1 },
    // Corners
    { col: -1, row: -1 }, { col: 4, row: -1 },
    { col: -1, row: 2 },
    // Inner corner
    { col: 3, row: 1 },
  ],
  doors: [
    // Door on right side - floor edge inside room (opening at 4,0)
    { col: 3, row: 0 },
    // Door on left side - floor edge inside room (opening at -1,0) - distinct from floor[0] 0,0 spawn
    { col: 0, row: 1 },
  ],
}
