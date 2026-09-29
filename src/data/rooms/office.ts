import type { RoomTemplate } from '../../types/room'

export const office: RoomTemplate = {
  id: 'office',
  name: 'Office',
  floor: [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
    { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
  ],
  walls: [
    // Top wall
    { col: 0, row: -1 }, { col: 1, row: -1 }, { col: 2, row: -1 },
    // Bottom wall
    { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 },
    // Left wall
    { col: -1, row: 0 }, { col: -1, row: 1 }, { col: -1, row: 2 },
    // Right wall (door at 2,1 creates opening at 3,1)
    { col: 3, row: 0 }, { col: 3, row: 2 },
    // Corners
    { col: -1, row: -1 }, { col: 3, row: -1 },
    { col: -1, row: 3 }, { col: 3, row: 3 },
  ],
  doors: [
    // Door on right side - floor edge inside room (opening at 3,1)
    { col: 2, row: 1 },
  ],
}
