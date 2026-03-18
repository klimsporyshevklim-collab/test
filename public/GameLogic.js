/**
 * Game Logic - Coordinate conversion and game state management
 * Handles conversion between Battletoads coordinate system and Phaser coordinate system
 */

class GameLogic {
    constructor() {
        // Battletoads coordinate system constants
        this.BTD_SCREEN_WIDTH = 320;
        this.BTD_SCREEN_HEIGHT = 224;
        this.BTD_WORLD_SCALE = 256; // Battletoads uses 8.8 fixed point

        // Phaser coordinate system constants
        this.PHASER_SCALE = 2; // 2x scale for better visibility
        this.PHASER_WORLD_WIDTH = this.BTD_SCREEN_WIDTH * this.PHASER_SCALE;
        this.PHASER_WORLD_HEIGHT = this.BTD_SCREEN_HEIGHT * this.PHASER_SCALE;

        // Camera and viewport settings
        this.CAMERA_DEADZONE = 50;
        this.CAMERA_LERP = 0.1;

        // Level bounds
        this.LEVEL_BOUNDS = {
            left: 0,
            right: this.PHASER_WORLD_WIDTH,
            top: 0,
            bottom: this.PHASER_WORLD_HEIGHT
        };
    }

    /**
     * Convert Battletoads coordinates to Phaser coordinates
     * Battletoads: X increases right, Y increases down, Z increases up
     * Phaser: X increases right, Y increases down
     */
    battletoadsToPhaser(btdX, btdY, btdZ = 0) {
        return {
            x: (btdX / this.BTD_WORLD_SCALE) * this.PHASER_SCALE,
            y: this.PHASER_WORLD_HEIGHT - ((btdY / this.BTD_WORLD_SCALE) * this.PHASER_SCALE),
            z: (btdZ / this.BTD_WORLD_SCALE) * this.PHASER_SCALE
        };
    }

    /**
     * Convert Phaser coordinates to Battletoads coordinates
     */
    phaserToBattletoads(phaserX, phaserY, phaserZ = 0) {
        return {
            x: (phaserX / this.PHASER_SCALE) * this.BTD_WORLD_SCALE,
            y: ((this.PHASER_WORLD_HEIGHT - phaserY) / this.PHASER_SCALE) * this.BTD_WORLD_SCALE,
            z: (phaserZ / this.PHASER_SCALE) * this.BTD_WORLD_SCALE
        };
    }

    /**
     * Convert velocity from Battletoads to Phaser
     */
    velocityBattletoadsToPhaser(btdVx, btdVy, btdVz = 0) {
        return {
            vx: (btdVx / this.BTD_WORLD_SCALE) * this.PHASER_SCALE,
            vy: -((btdVy / this.BTD_WORLD_SCALE) * this.PHASER_SCALE), // Y is inverted
            vz: (btdVz / this.BTD_WORLD_SCALE) * this.PHASER_SCALE
        };
    }

    /**
     * Convert velocity from Phaser to Battletoads
     */
    velocityPhaserToBattletoads(phaserVx, phaserVy, phaserVz = 0) {
        return {
            vx: (phaserVx / this.PHASER_SCALE) * this.BTD_WORLD_SCALE,
            vy: -((phaserVy / this.PHASER_SCALE) * this.BTD_WORLD_SCALE), // Y is inverted
            vz: (phaserVz / this.PHASER_SCALE) * this.BTD_WORLD_SCALE
        };
    }

    /**
     * Clamp position within level bounds
     */
    clampToBounds(x, y) {
        return {
            x: Math.max(this.LEVEL_BOUNDS.left, Math.min(this.LEVEL_BOUNDS.right, x)),
            y: Math.max(this.LEVEL_BOUNDS.top, Math.min(this.LEVEL_BOUNDS.bottom, y))
        };
    }

    /**
     * Check if position is within camera deadzone
     */
    isInCameraDeadzone(playerX, playerY, cameraX, cameraY) {
        const dx = Math.abs(playerX - cameraX);
        const dy = Math.abs(playerY - cameraY);
        return dx < this.CAMERA_DEADZONE && dy < this.CAMERA_DEADZONE;
    }

    /**
     * Calculate camera target position with lerping
     */
    calculateCameraTarget(playerX, playerY, currentCameraX, currentCameraY) {
        let targetX = currentCameraX;
        let targetY = currentCameraY;

        // Only move camera if player is outside deadzone
        if (!this.isInCameraDeadzone(playerX, playerY, currentCameraX, currentCameraY)) {
            targetX = playerX;
            targetY = playerY;
        }

        // Clamp camera to level bounds
        const halfWidth = this.PHASER_WORLD_WIDTH / 2;
        const halfHeight = this.PHASER_WORLD_HEIGHT / 2;

        targetX = Math.max(halfWidth, Math.min(this.LEVEL_BOUNDS.right - halfWidth, targetX));
        targetY = Math.max(halfHeight, Math.min(this.LEVEL_BOUNDS.bottom - halfHeight, targetY));

        // Apply lerping for smooth camera movement
        const newX = currentCameraX + (targetX - currentCameraX) * this.CAMERA_LERP;
        const newY = currentCameraY + (targetY - currentCameraY) * this.CAMERA_LERP;

        return { x: newX, y: newY };
    }

    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check collision between two rectangles
     */
    checkRectCollision(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                 rect2.x + rect2.width < rect1.x ||
                 rect1.y + rect1.height < rect2.y ||
                 rect2.y + rect2.height < rect1.y);
    }

    /**
     * Get collision rectangle for a player
     */
    getPlayerCollisionRect(player) {
        const pos = this.battletoadsToPhaser(player.x >> 8, player.y >> 8, player.z >> 8);
        return {
            x: pos.x - player.width / 2,
            y: pos.y - player.height,
            width: player.width,
            height: player.height
        };
    }

    /**
     * Handle player vs player collision
     */
    handlePlayerCollision(player1, player2) {
        const rect1 = this.getPlayerCollisionRect(player1);
        const rect2 = this.getPlayerCollisionRect(player2);

        if (this.checkRectCollision(rect1, rect2)) {
            // Simple separation - move players apart
            const center1 = { x: rect1.x + rect1.width / 2, y: rect1.y + rect1.height / 2 };
            const center2 = { x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height / 2 };

            const dx = center2.x - center1.x;
            const dy = center2.y - center1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const separation = 2; // pixels to separate
                const sepX = (dx / distance) * separation;
                const sepY = (dy / distance) * separation;

                // Move player1 away from player2
                const btdSep = this.phaserToBattletoads(sepX, sepY, 0);
                player1.x -= btdSep.x >> 8; // Convert back to fixed point adjustment
                player1.y -= btdSep.y >> 8;
            }
        }
    }

    /**
     * Update game state for all players
     */
    updateGameState(players, deltaTime) {
        // Handle player vs player collisions
        const playerIds = Object.keys(players);
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const player1 = players[playerIds[i]];
                const player2 = players[playerIds[j]];
                this.handlePlayerCollision(player1, player2);
            }
        }

        // Update player animations and states
        playerIds.forEach(id => {
            const player = players[id];
            // Additional game logic can be added here
        });
    }

    /**
     * Get game statistics
     */
    getGameStats(players) {
        const playerCount = Object.keys(players).length;
        const activePlayers = Object.values(players).filter(p => p.state !== 'idle').length;

        return {
            playerCount,
            activePlayers,
            serverTime: Date.now()
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLogic;
}