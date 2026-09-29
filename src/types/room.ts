export interface GridPosition {
  col: number
  row: number
}

export interface RoomTemplate {
  id: string
  name: string
  floor: GridPosition[]
  walls: GridPosition[]
  doors: GridPosition[]
}

export interface PlacedRoom {
  template: RoomTemplate
  origin: GridPosition
  isEntry?: boolean
  isExit?: boolean
  doors?: GridPosition[]
}

export interface LayoutResult {
  rooms: PlacedRoom[]
  paths: GridPosition[]
}
