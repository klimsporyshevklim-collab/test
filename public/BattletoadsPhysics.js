/**
 * Battletoads Physics Engine
 * Implements authentic Battletoads movement mechanics with subpixel precision
 */

class BattletoadsPhysics {
    constructor() {
        this.gravity = 0.5; // Gravity acceleration
        this.maxFallSpeed = 8.0; // Maximum falling speed
        this.jumpPower = -12.0; // Initial jump velocity (negative = up)
        this.moveSpeed = 3.0; // Horizontal movement speed
        this.acceleration = 0.5; // Horizontal acceleration
        this.deceleration = 0.8; // Horizontal deceleration when no input
        this.airControl = 0.3; // Air control multiplier
        this.maxSpeed = 6.0; // Maximum horizontal speed

        // Player states
        this.STATES = {
            IDLE: 'idle',
            WALK: 'walk',
            JUMP: 'jump',
            FALL: 'fall'
        };
    }

    /**
     * Initialize a player object with physics properties
     */
    createPlayer(x = 0, y = 0, z = 0) {
        return {
            // Position (subpixel precision)
            x: x << 8, // Convert to 8.8 fixed point
            y: y << 8,
            z: z << 8,

            // Velocity (subpixel precision)
            vx: 0,
            vy: 0,
            vz: 0,

            // State
            state: this.STATES.IDLE,
            onGround: false,
            facingRight: true,

            // Collision box (in pixels)
            width: 16,
            height: 24,

            // Animation
            frame: 0,
            frameTimer: 0
        };
    }

    /**
     * Update player physics
     * @param {Object} player - Player object
     * @param {Object} input - Input state {left, right, jump}
     * @param {Function} collisionCallback - Function to check collisions
     */
    updateObject(player, input, collisionCallback = null) {
        const oldX = player.x;
        const oldY = player.y;
        const oldZ = player.z;

        // Handle horizontal movement
        this.handleHorizontalMovement(player, input);

        // Handle jumping
        this.handleJumping(player, input);

        // Apply gravity
        this.applyGravity(player);

        // Apply velocity to position
        player.x += player.vx;
        player.y += player.vy;
        player.z += player.vz;

        // Check collisions if callback provided
        if (collisionCallback) {
            collisionCallback(player, oldX, oldY, oldZ);
        }

        // Update state based on movement
        this.updateState(player);

        // Update animation
        this.updateAnimation(player);
    }

    /**
     * Handle horizontal movement input
     */
    handleHorizontalMovement(player, input) {
        let targetSpeed = 0;

        if (input.left && !input.right) {
            targetSpeed = -this.moveSpeed;
            player.facingRight = false;
        } else if (input.right && !input.left) {
            targetSpeed = this.moveSpeed;
            player.facingRight = true;
        }

        // Apply acceleration/deceleration
        if (targetSpeed !== 0) {
            // Accelerate towards target speed
            if (player.onGround) {
                player.vx += (targetSpeed - (player.vx >> 8)) * this.acceleration;
            } else {
                // Less control in air
                player.vx += (targetSpeed - (player.vx >> 8)) * this.airControl;
            }
        } else {
            // Decelerate when no input
            if (player.onGround) {
                player.vx = player.vx * this.deceleration;
            }
        }

        // Clamp horizontal speed
        const maxSpeedFixed = this.maxSpeed << 8;
        if (player.vx > maxSpeedFixed) player.vx = maxSpeedFixed;
        if (player.vx < -maxSpeedFixed) player.vx = -maxSpeedFixed;

        // Stop completely if very slow
        if (Math.abs(player.vx) < 32) player.vx = 0; // Less than 0.125 pixels
    }

    /**
     * Handle jumping input
     */
    handleJumping(player, input) {
        if (input.jump && player.onGround && player.state !== this.STATES.JUMP) {
            player.vy = this.jumpPower << 8; // Convert to fixed point
            player.onGround = false;
            player.state = this.STATES.JUMP;
        }
    }

    /**
     * Apply gravity to player
     */
    applyGravity(player) {
        if (!player.onGround) {
            player.vy += this.gravity << 8; // Convert gravity to fixed point

            // Clamp falling speed
            const maxFallSpeedFixed = this.maxFallSpeed << 8;
            if (player.vy > maxFallSpeedFixed) {
                player.vy = maxFallSpeedFixed;
            }
        }
    }

    /**
     * Update player state based on movement
     */
    updateState(player) {
        const speed = Math.abs(player.vx >> 8); // Convert back to pixels

        if (!player.onGround) {
            if (player.vy < 0) {
                player.state = this.STATES.JUMP;
            } else {
                player.state = this.STATES.FALL;
            }
        } else {
            if (speed > 0.1) {
                player.state = this.STATES.WALK;
            } else {
                player.state = this.STATES.IDLE;
            }
        }
    }

    /**
     * Update animation frame
     */
    updateAnimation(player) {
        player.frameTimer++;

        // Animation speed based on state
        let animSpeed = 8; // Default

        switch (player.state) {
            case this.STATES.WALK:
                animSpeed = Math.max(4, 12 - Math.abs(player.vx >> 8));
                break;
            case this.STATES.IDLE:
                animSpeed = 16;
                break;
            case this.STATES.JUMP:
            case this.STATES.FALL:
                animSpeed = 4;
                break;
        }

        if (player.frameTimer >= animSpeed) {
            player.frame++;
            player.frameTimer = 0;
        }
    }

    /**
     * Get player position in pixels (convert from fixed point)
     */
    getPixelPosition(player) {
        return {
            x: player.x >> 8,
            y: player.y >> 8,
            z: player.z >> 8
        };
    }

    /**
     * Set player position in pixels (convert to fixed point)
     */
    setPixelPosition(player, x, y, z) {
        player.x = x << 8;
        player.y = y << 8;
        player.z = z << 8;
    }

    /**
     * Check if player is on ground (simple collision detection)
     */
    checkGroundCollision(player, groundY) {
        const pixelY = player.y >> 8;
        const pixelHeight = player.height;

        if (pixelY + pixelHeight >= groundY && player.vy > 0) {
            player.y = (groundY - pixelHeight) << 8;
            player.vy = 0;
            player.onGround = true;
            return true;
        }

        player.onGround = false;
        return false;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattletoadsPhysics;
}