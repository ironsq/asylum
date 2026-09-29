import type { RoomTemplate } from '../../types/room'

export const cell: RoomTemplate = {
  id: 'cell',
  name: 'Cell',
  floor: [
    { col: 0, row: 0 }, { col: 1, row: 0 },
    { col: 0, row: 1 }, { col: 1, row: 1 },
  ],
  walls: [
    // Top wall
    { col: 0, row: -1 }, { col: 1, row: -1 },
    // Bottom wall
    { col: 0, row: 2 }, { col: 1, row: 2 },
    // Left wall
    { col: -1, row: 0 }, { col: -1, row: 1 },
    // Right wall (door at 1,0 creates opening at 2,0)
    { col: 2, row: 1 },
    // Corners
    { col: -1, row: -1 }, { col: 2, row: -1 },
    { col: -1, row: 2 }, { col: 2, row: 2 },
  ],
  doors: [
    // Door on right side - floor edge inside room (opening at 2,0)
    { col: 1, row: 0 },
  ],
}
