/**
 * Level Map Loader - Handles 3D collision maps and floor height calculation
 * Based on Battletoads level data structure
 */

class LevelMapLoader {
    constructor() {
        this.mapData = null;
        this.collisionMap = null;
        this.floorHeights = null;

        // Map dimensions
        this.MAP_WIDTH = 320;
        this.MAP_HEIGHT = 224;
        this.MAP_DEPTH = 256; // Z-axis depth

        // Collision constants
        this.COLLISION_SOLID = 1;
        this.COLLISION_EMPTY = 0;
        this.COLLISION_SLOPE = 2;

        // Floor height cache for performance
        this.heightCache = new Map();
    }

    /**
     * Load level data from a ROM or data file
     * For now, creates a simple test level
     */
    loadLevel(levelName = 'test') {
        console.log(`Loading level: ${levelName}`);

        // Create a simple test level
        this.createTestLevel();

        // Build collision map
        this.buildCollisionMap();

        // Pre-calculate floor heights
        this.calculateFloorHeights();

        return {
            mapData: this.mapData,
            collisionMap: this.collisionMap,
            floorHeights: this.floorHeights
        };
    }

    /**
     * Create a simple test level with platforms and slopes
     */
    createTestLevel() {
        this.mapData = {
            name: 'Test Level',
            width: this.MAP_WIDTH,
            height: this.MAP_HEIGHT,
            depth: this.MAP_DEPTH,
            tiles: []
        };

        // Initialize empty tile map
        for (let z = 0; z < this.MAP_DEPTH; z++) {
            this.mapData.tiles[z] = [];
            for (let y = 0; y < this.MAP_HEIGHT; y++) {
                this.mapData.tiles[z][y] = [];
                for (let x = 0; x < this.MAP_WIDTH; x++) {
                    this.mapData.tiles[z][y][x] = this.COLLISION_EMPTY;
                }
            }
        }

        // Create ground platform
        this.fillBox(0, this.MAP_HEIGHT - 32, 0, this.MAP_WIDTH, 32, 64, this.COLLISION_SOLID);

        // Create some floating platforms
        this.fillBox(100, this.MAP_HEIGHT - 80, 0, 64, 16, 32, this.COLLISION_SOLID);
        this.fillBox(200, this.MAP_HEIGHT - 120, 0, 48, 16, 32, this.COLLISION_SOLID);

        // Create a slope
        this.createSlope(50, this.MAP_HEIGHT - 64, 0, 32, 16, 1); // Rising slope

        console.log('Test level created');
    }

    /**
     * Fill a 3D box with collision data
     */
    fillBox(startX, startY, startZ, width, height, depth, collisionType) {
        for (let z = startZ; z < startZ + depth && z < this.MAP_DEPTH; z++) {
            for (let y = startY; y < startY + height && y < this.MAP_HEIGHT; y++) {
                for (let x = startX; x < startX + width && x < this.MAP_WIDTH; x++) {
                    this.mapData.tiles[z][y][x] = collisionType;
                }
            }
        }
    }

    /**
     * Create a slope in the level
     */
    createSlope(startX, startY, startZ, length, height, direction) {
        for (let i = 0; i < length; i++) {
            const slopeHeight = Math.floor((i / length) * height);
            const y = startY - (direction > 0 ? slopeHeight : 0);

            for (let h = 0; h < slopeHeight + 1; h++) {
                if (startY - h >= 0 && startY - h < this.MAP_HEIGHT) {
                    this.mapData.tiles[startZ][startY - h][startX + i] = this.COLLISION_SLOPE;
                }
            }
        }
    }

    /**
     * Build 2D collision map from 3D data (top-down view)
     */
    buildCollisionMap() {
        this.collisionMap = [];

        for (let y = 0; y < this.MAP_HEIGHT; y++) {
            this.collisionMap[y] = [];
            for (let x = 0; x < this.MAP_WIDTH; x++) {
                // Check if any Z-level has collision at this X,Y
                let hasCollision = false;
                for (let z = 0; z < this.MAP_DEPTH; z++) {
                    if (this.mapData.tiles[z][y][x] !== this.COLLISION_EMPTY) {
                        hasCollision = true;
                        break;
                    }
                }
                this.collisionMap[y][x] = hasCollision ? this.COLLISION_SOLID : this.COLLISION_EMPTY;
            }
        }
    }

    /**
     * Pre-calculate floor heights for performance
     */
    calculateFloorHeights() {
        this.floorHeights = [];

        for (let x = 0; x < this.MAP_WIDTH; x++) {
            this.floorHeights[x] = [];
            for (let z = 0; z < this.MAP_DEPTH; z++) {
                let floorY = this.MAP_HEIGHT; // Default to bottom

                // Find the highest solid tile at this X,Z position
                for (let y = this.MAP_HEIGHT - 1; y >= 0; y--) {
                    if (this.mapData.tiles[z][y][x] === this.COLLISION_SOLID) {
                        floorY = y;
                        break;
                    }
                }

                this.floorHeights[x][z] = floorY;
            }
        }
    }

    /**
     * Get floor height at a specific position
     */
    getFloorHeight(worldX, worldZ) {
        const x = Math.floor(worldX);
        const z = Math.floor(worldZ);

        if (x < 0 || x >= this.MAP_WIDTH || z < 0 || z >= this.MAP_DEPTH) {
            return this.MAP_HEIGHT; // Outside map = bottom
        }

        return this.floorHeights[x][z];
    }

    /**
     * Check collision at a specific position
     */
    checkCollision(worldX, worldY, worldZ) {
        const x = Math.floor(worldX);
        const y = Math.floor(worldY);
        const z = Math.floor(worldZ);

        if (x < 0 || x >= this.MAP_WIDTH ||
            y < 0 || y >= this.MAP_HEIGHT ||
            z < 0 || z >= this.MAP_DEPTH) {
            return false; // Outside map bounds
        }

        return this.mapData.tiles[z][y][x] !== this.COLLISION_EMPTY;
    }

    /**
     * Check if a bounding box collides with the level
     */
    checkBoundingBoxCollision(x, y, z, width, height, depth) {
        // Check all corners of the bounding box
        const corners = [
            {x: x, y: y, z: z},
            {x: x + width, y: y, z: z},
            {x: x, y: y + height, z: z},
            {x: x + width, y: y + height, z: z},
            {x: x, y: y, z: z + depth},
            {x: x + width, y: y, z: z + depth},
            {x: x, y: y + height, z: z + depth},
            {x: x + width, y: y + height, z: z + depth}
        ];

        for (const corner of corners) {
            if (this.checkCollision(corner.x, corner.y, corner.z)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get slope information at a position
     */
    getSlopeInfo(worldX, worldZ) {
        const x = Math.floor(worldX);
        const z = Math.floor(worldZ);

        if (x < 0 || x >= this.MAP_WIDTH || z < 0 || z >= this.MAP_DEPTH) {
            return { isSlope: false, height: 0, normal: { x: 0, y: 1 } };
        }

        const tileType = this.mapData.tiles[z][this.floorHeights[x][z]][x];

        if (tileType === this.COLLISION_SLOPE) {
            // Calculate slope normal (simplified)
            return {
                isSlope: true,
                height: this.floorHeights[x][z],
                normal: { x: 0.5, y: 0.866 } // 30-degree slope
            };
        }

        return { isSlope: false, height: this.floorHeights[x][z], normal: { x: 0, y: 1 } };
    }

    /**
     * Raycast against the level geometry
     */
    raycast(startX, startY, startZ, dirX, dirY, dirZ, maxDistance = 1000) {
        let x = startX;
        let y = startY;
        let z = startZ;

        const stepSize = 1;
        const steps = Math.floor(maxDistance / stepSize);

        for (let i = 0; i < steps; i++) {
            if (this.checkCollision(x, y, z)) {
                return {
                    hit: true,
                    distance: i * stepSize,
                    position: { x, y, z }
                };
            }

            x += dirX * stepSize;
            y += dirY * stepSize;
            z += dirZ * stepSize;
        }

        return { hit: false, distance: maxDistance };
    }

    /**
     * Get level bounds
     */
    getBounds() {
        return {
            minX: 0,
            maxX: this.MAP_WIDTH,
            minY: 0,
            maxY: this.MAP_HEIGHT,
            minZ: 0,
            maxZ: this.MAP_DEPTH
        };
    }

    /**
     * Clear height cache (call when level changes)
     */
    clearCache() {
        this.heightCache.clear();
    }

    /**
     * Get level info for debugging
     */
    getLevelInfo() {
        return {
            name: this.mapData?.name || 'No level loaded',
            dimensions: {
                width: this.MAP_WIDTH,
                height: this.MAP_HEIGHT,
                depth: this.MAP_DEPTH
            },
            collisionTiles: this.collisionMap ?
                this.collisionMap.flat().filter(tile => tile === this.COLLISION_SOLID).length : 0
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelMapLoader;
}