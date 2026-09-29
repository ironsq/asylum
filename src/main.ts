import Phaser from "phaser";
import {
  TILE_WIDTH, TILE_HEIGHT,
  RENDER_WIDTH, RENDER_HEIGHT,
  VIEWPORT_WIDTH, VIEWPORT_HEIGHT,
  computeViewportScale,
  getViewportOffsets,
} from "./isometric";
import { roomTemplates } from "./data/rooms";
import { generateLayout, getLayoutBounds } from "./systems/layout/generator";
import type { GridPosition } from "./types/room";

const BASE_HW = TILE_WIDTH / 2;
const BASE_HH = TILE_HEIGHT / 2;

const toScreen = (col: number, row: number, scale: number) => ({
  x: (col - row) * BASE_HW * scale,
  y: (col + row) * BASE_HH * scale,
});

class IsometricScene extends Phaser.Scene {
  constructor() {
    super("Isometric");
  }

  create() {
    const layout = generateLayout(roomTemplates);

    // Viewport invariant: bbox over ALL scene content (floor|walls|doors|paths|entry|exit) via getLayoutBounds
    const bounds = getLayoutBounds(layout)
    const { minCol, maxCol, minRow, maxRow, gridCols, gridRows } = bounds

    // FIT guarantee: scale ensures every diamond fits 1920x1080 canvas (see spec/isometric.md Viewport invariant)
    const scale = computeViewportScale(gridCols, gridRows)

    void VIEWPORT_WIDTH; void VIEWPORT_HEIGHT; // viewport dims consumed via computeViewportScale
    // Centered offsets: bbox centered at ORIGIN (with -40 title nudge) so scene remains in frame
    const allTilesForOffset: GridPosition[] = [
      ...layout.rooms.flatMap(r=> [...r.template.floor, ...r.template.walls, ...r.template.doors].map(p=>({col:r.origin.col+p.col,row:r.origin.row+p.row}))),
      ...layout.paths,
      layout.entry, layout.exit,
    ]
    const { offsetX, offsetY } = getViewportOffsets(allTilesForOffset, minCol, minRow, scale)

    const drawDiamond = (
      col: number,
      row: number,
      color: number,
      filled: boolean = false,
    ) => {
      const pos = toScreen(col - minCol, row - minRow, scale);
      const x = offsetX + pos.x;
      const y = offsetY + pos.y;
      const hw = BASE_HW * scale;
      const hh = BASE_HH * scale;
      const g = this.add.graphics();
      if (filled) {
        g.fillStyle(color, 0.4);
        g.beginPath();
        g.moveTo(x, y - hh);
        g.lineTo(x + hw, y);
        g.lineTo(x, y + hh);
        g.lineTo(x - hw, y);
        g.closePath();
        g.fillPath();
      }
      g.lineStyle(2, color, 1);
      g.beginPath();
      g.moveTo(x, y - hh);
      g.lineTo(x + hw, y);
      g.lineTo(x, y + hh);
      g.lineTo(x - hw, y);
      g.closePath();
      g.strokePath();
    };

    // Draw floor tiles (filled green)
    layout.rooms.forEach(({ template, origin }) => {
      template.floor.forEach(({ col, row }: GridPosition) => {
        drawDiamond(origin.col + col, origin.row + row, 0x00ff00, true);
      });
    });

    // Draw wall-floor boundary (white)
    layout.rooms.forEach(({ template, origin }) => {
      const floorPositions = template.floor.map((f: GridPosition) => ({
        col: origin.col + f.col,
        row: origin.row + f.row,
      }));

      template.walls.forEach(({ col, row }: GridPosition) => {
        const absCol = origin.col + col;
        const absRow = origin.row + row;
        const isBoundary = floorPositions.some(
          (f) =>
            (Math.abs(f.col - absCol) === 1 && f.row === absRow) ||
            (Math.abs(f.row - absRow) === 1 && f.col === absCol),
        );
        if (isBoundary) {
          drawDiamond(absCol, absRow, 0xffffff);
        }
      });
    });

    // Draw scene boundary white ring with openings at scene exits (door or path cell at edge)
    const sceneExits = new Set<string>([
      `${layout.exit.col},${layout.exit.row}`,
    ]);
    // Also consider path cells at bbox edge as exits (cyan portal)
    layout.paths.forEach((p) => {
      if (
        p.col === minCol ||
        p.col === maxCol ||
        p.row === minRow ||
        p.row === maxRow
      )
        sceneExits.add(`${p.col},${p.row}`);
    });
    for (let col = minCol - 1; col <= maxCol + 1; col++) {
      for (let row = minRow - 1; row <= maxRow + 1; row++) {
        const isPerimeter =
          col === minCol - 1 ||
          col === maxCol + 1 ||
          row === minRow - 1 ||
          row === maxRow + 1;
        if (!isPerimeter) continue;
        const key = `${col},${row}`;
        if (sceneExits.has(key)) continue; // opening at exit
        // Don't overwrite existing floor/wall/door/path
        const occupied =
          layout.rooms.some(
            (r) =>
              r.template.floor.some(
                (f) =>
                  r.origin.col + f.col === col && r.origin.row + f.row === row,
              ) ||
              r.template.walls.some(
                (w) =>
                  r.origin.col + w.col === col && r.origin.row + w.row === row,
              ) ||
              r.template.doors.some(
                (d) =>
                  r.origin.col + d.col === col && r.origin.row + d.row === row,
              ),
          ) || layout.paths.some((p) => p.col === col && p.row === row);
        if (occupied) continue;
        // Only draw where adjacent to something inside (to avoid sparse ring)
        const adjacentInside =
          layout.rooms.some((r) =>
            r.template.floor.some(
              (f) =>
                Math.abs(r.origin.col + f.col - col) +
                  Math.abs(r.origin.row + f.row - row) ===
                1,
            ),
          ) ||
          layout.paths.some(
            (p) => Math.abs(p.col - col) + Math.abs(p.row - row) === 1,
          );
        if (!adjacentInside) continue;
        drawDiamond(col, row, 0xffffff);
      }
    }

    // Draw paths (cyan)
    layout.paths.forEach(({ col, row }: GridPosition) => {
      drawDiamond(col, row, 0x00ffff);
    });

    // Draw per-room doors as yellow cells (room-level entry/exit)
    layout.rooms.forEach(({ template, origin }) => {
      template.doors.forEach(({ col, row }: GridPosition) => {
        drawDiamond(origin.col + col, origin.row + row, 0xffff00, true);
      });
    });
    // Scene-determined spawn (distinct from floor/door, not tracking player) - bright lime
    drawDiamond(layout.entry.col, layout.entry.row, 0x88ff00, true);
    // Scene exit portal (re-draw over per-room yellow for emphasis)
    drawDiamond(layout.exit.col, layout.exit.row, 0xffff00, true);

    // Title
    this.add.text(20, 20, "Room Layout Preview (Refresh for new layout)", {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "monospace",
    });
    this.add.text(
      20,
      50,
      "Green Fill=Floor | White=Boundary | Cyan=Path | Green=Spawn | Yellow=Exit",
      {
        fontSize: "12px",
        color: "#cccccc",
        fontFamily: "monospace",
      },
    );
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: RENDER_WIDTH,
  height: RENDER_HEIGHT,
  backgroundColor: "#1a1a2e",
  scene: IsometricScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

