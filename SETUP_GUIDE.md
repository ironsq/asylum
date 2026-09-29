# Isometric Dungeon - Godot 4 Setup Guide

## Project Structure
```
res://
├── assets/
│   └── dungeon_tiles/
│       ├── floor/       (stone, dirt, planks tiles)
│       ├── walls/       (stoneWall variants)
│       └── props/       (barrels, crates, furniture)
├── scenes/
│   └── world.tscn       (main game scene)
├── scripts/
│   └── main.gd          (main game script)
├── tilesets/
└── project.godot
```

## Asset Summary
- **Tile Size:** 256 x 512 pixels (1:2 ratio)
- **Tile Shape:** Isometric
- **Layers:** 3 (Floor, Walls, Props)

## Setup Steps in Godot Editor

### 1. Configure TileSet for Floor Layer
1. Click on `TileMapLayer_Floor` in the Scene tree
2. In Inspector, find **Tile Set** > click **"+"** > New TileSet
3. Click **"Open TileSet Editor"** at the bottom panel
4. In the TileSet panel:
   - Click **"Add TileSet Source"** > **"Atlas"**
   - Navigate to: `res://assets/dungeon_tiles/floor/`
   - Select all floor PNG files (hold Shift to select multiple)
   - Click **"Open"**

5. Configure the atlas in the dialog:
   - **Texture Size:** Leave as auto-detected
   - **Tile Size:** Set to `256` x `512`
   - **Tile Spacing:** `0`
   - **Margin:** `0`
   - Click **"Add Source"**

### 2. Configure TileSet for Walls Layer
1. Click on `TileMapLayer_Walls`
2. In the TileSet editor, click **"Add TileSet Source"** > **"Atlas"**
3. Navigate to: `res://assets/dungeon_tiles/walls/`
4. Select all wall PNG files
5. Set **Tile Size:** `256` x `512`
6. Click **"Add Source"**

### 3. Configure TileSet for Props Layer
1. Click on `TileMapLayer_Props`
2. In the TileSet editor, click **"Add TileSet Source"** > **"Atlas"**
3. Navigate to: `res://assets/dungeon_tiles/props/`
4. Select all prop PNG files
5. Set **Tile Size:** `256` x `512`
6. Click **"Add Source"**

### 4. Paint Your Dungeon
1. Select a TileMapLayer in the Scene tree
2. In the TileSet panel, select a tile from the atlas
3. Click on the viewport to paint tiles
4. Paint floor tiles first (Layer 0)
5. Then paint walls (Layer 1)
6. Finally add props (Layer 2)

### 5. Test the Scene
1. Press **F5** to run the project
2. You should see your isometric tiles rendered
3. Adjust camera zoom if needed:
   - Select Camera2D
   - In Inspector > Zoom: Set X and Y values (e.g., 0.5 for 2x zoom out)

## Important Settings

### TileMapLayer Properties
- **Y Sort Enabled:** ON (critical for depth)
- **Tile Shape:** Isometric
- **Tile Size:** 256 x 512
- **Tile Offset Axis:** Vertical Offset

### Camera2D Settings
- **Position:** 640, 360 (center of 1280x720 viewport)
- **Anchor Mode:** Drag Center (default)
- **Enabled:** ON

## Tips
- Tiles are large (256x512). You may want to scale them down
- Each tile has 4 directions: _N, _S, _E, _W
- Use directional tiles to create walls that face the right way
- Enable "Y Sort" on all TileMapLayers for proper depth

## Next Steps
1. Add player character with isometric movement
2. Implement collision detection
3. Add lighting effects
4. Create UI elements
