// Multiplayer Battletoads Game using Phaser and Socket.io
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // We'll handle gravity with BattletoadsPhysics
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Game state
let socket;
let localPlayer;
let remotePlayers = new Map();
let physics;
let cursors;
let gameLogic;
let mapLoader;
let playerId;
let levelMap;

// Game constants
const PLAYER_SPEED = 2;
const JUMP_FORCE = -8;
const GRAVITY = 0.3;

function preload() {
    // Load player sprite (placeholder - you'll need to add actual sprites)
    this.load.image('player', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDA4MEZGIi8+Cjwvc3ZnPg==');

    // Load level background
    this.load.image('background', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPg==');
}

async function create() {
    console.log('Initializing multiplayer Battletoads game...');

    // Check if Socket.io is available
    if (typeof io === 'undefined') {
        console.error('Socket.io client not loaded! Make sure /socket.io/socket.io.js is accessible');
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false, 0);
        }
        return;
    }

    // Initialize Socket.io connection with dynamic server URL
    const isProduction = window.location.protocol === 'https:';
    const serverUrl = isProduction
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:3000';

    console.log('Connecting to server:', serverUrl);
    socket = io(serverUrl, {
        transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    // Initialize Battletoads physics
    physics = new BattletoadsPhysics();

    // Initialize game logic and map loader
    gameLogic = new GameLogic();
    mapLoader = new LevelMapLoader(new Uint8Array(1024), 1); // Placeholder map data

    // Load level
    levelMap = mapLoader.loadLevel('test');

    // Create background
    this.add.tileSprite(0, 0, 2000, 2000, 'background').setOrigin(0, 0);

    // Set up socket event handlers
    setupSocketHandlers();

    // Create input handlers
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // Jump

    // Create local player
    createLocalPlayer.call(this);

    // Set up camera to follow player
    this.cameras.main.startFollow(localPlayer.sprite);
    this.cameras.main.setBounds(0, 0, 2000, 2000); // Large world bounds

    console.log('Game initialized successfully');
}

function update(time, delta) {
    if (!localPlayer) return;

    // Handle local player input
    handleLocalInput.call(this);

    // Update local player physics
    updateLocalPlayer(delta);

    // Send player state to server
    sendPlayerUpdate();

    // Update remote players
    updateRemotePlayers(delta);

    // Update camera and UI
    updateCamera.call(this);
}

function setupSocketHandlers() {
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        playerId = socket.id;

        // Update UI
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true, 1);
        }

        // Join the game
        socket.emit('playerJoin', {
            x: 400,
            y: 300,
            z: 0,
            state: 'idle'
        });
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false, 0);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false, 0);
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after', attemptNumber, 'attempts');
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true, remotePlayers.size + 1);
        }
    });

    socket.on('reconnect_error', (error) => {
        console.error('Reconnection failed:', error);
    });

    socket.on('currentPlayers', (players) => {
        console.log('Received current players:', players);
        players.forEach(playerData => {
            addRemotePlayer.call(this, playerData);
        });

        // Update player count
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true, players.length + 1);
        }
    });

    socket.on('playerJoined', (playerData) => {
        console.log('New player joined:', playerData);
        addRemotePlayer.call(this, playerData);

        // Update player count
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true, remotePlayers.size + 1);
        }
    });

    socket.on('remotePlayerUpdate', (playerData) => {
        updateRemotePlayer.call(this, playerData);
    });

    socket.on('playerLeft', (playerId) => {
        console.log('Player left:', playerId);
        removeRemotePlayer(playerId);

        // Update player count
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(true, remotePlayers.size + 1);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(false, 0);
        }
    });
}

function createLocalPlayer() {
    // Create physics player object
    localPlayer = physics.createPlayer(400, 300, 0);

    // Create Phaser sprite
    localPlayer.sprite = this.add.sprite(400, 300, 'player');
    localPlayer.sprite.setTint(0x00ff00); // Green for local player
    localPlayer.sprite.setScale(2); // Make player bigger

    console.log('Local player created at:', localPlayer.x >> 8, localPlayer.y >> 8);
}

function handleLocalInput() {
    const input = {
        left: cursors.left.isDown,
        right: cursors.right.isDown,
        jump: cursors.up.isDown || this.input.keyboard.checkDown(cursors.up, 250) ||
              Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))
    };

    // Update physics with input
    physics.updateObject(localPlayer, input);

    // Update sprite position (convert from fixed point)
    const pixelPos = physics.getPixelPosition(localPlayer);
    localPlayer.sprite.x = pixelPos.x;
    localPlayer.sprite.y = pixelPos.y;

    // Update sprite facing direction
    if (localPlayer.facingRight) {
        localPlayer.sprite.setScale(2, 2);
    } else {
        localPlayer.sprite.setScale(-2, 2);
    }
}

function updateLocalPlayer(delta) {
    // Additional local player updates can go here
    // Physics is already handled in handleLocalInput()
}

function sendPlayerUpdate() {
    if (socket && socket.connected && localPlayer) {
        const pixelPos = physics.getPixelPosition(localPlayer);
        socket.emit('playerUpdate', {
            x: pixelPos.x,
            y: pixelPos.y,
            z: pixelPos.z,
            vx: localPlayer.vx,
            vy: localPlayer.vy,
            vz: localPlayer.vz,
            state: localPlayer.state,
            facing: localPlayer.facingRight
        });
    }
}

function addRemotePlayer(playerData) {
    // Create remote player sprite
    const sprite = this.add.sprite(playerData.x, playerData.z, 'player');
    sprite.setTint(0xff0000); // Red for remote players
    sprite.setScale(2);

    // Store remote player data
    remotePlayers.set(playerData.id, {
        ...playerData,
        sprite: sprite,
        lastUpdate: Date.now()
    });

    console.log('Added remote player:', playerData.id);
}

function updateRemotePlayer(playerData) {
    const remotePlayer = remotePlayers.get(playerData.id);
    if (remotePlayer) {
        // Update remote player data
        Object.assign(remotePlayer, playerData);
        remotePlayer.lastUpdate = Date.now();

        // Update sprite position
        remotePlayer.sprite.x = playerData.x;
        remotePlayer.sprite.y = playerData.z;

        // Update sprite facing
        if (playerData.facing) {
            remotePlayer.sprite.setScale(2, 2);
        } else {
            remotePlayer.sprite.setScale(-2, 2);
        }
    }
}

function removeRemotePlayer(playerId) {
    const remotePlayer = remotePlayers.get(playerId);
    if (remotePlayer) {
        remotePlayer.sprite.destroy();
        remotePlayers.delete(playerId);
        console.log('Removed remote player:', playerId);
    }
}

function updateRemotePlayers(delta) {
    // Clean up inactive remote players (no updates for 5 seconds)
    const now = Date.now();
    for (const [id, player] of remotePlayers) {
        if (now - player.lastUpdate > 5000) {
            console.log('Removing inactive remote player:', id);
            removeRemotePlayer(id);
        }
    }
}

function updateCamera() {
    // Camera follows local player
    if (localPlayer && localPlayer.sprite) {
        this.cameras.main.centerOn(localPlayer.sprite.x, localPlayer.sprite.y);
    }
}
