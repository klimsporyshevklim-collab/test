class SegaEmulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // …
        this.inputState = [0,0];
        this.keyMap = { ArrowUp:1, ArrowDown:2, … };
        this._boundKeyHandler = this._onKeyEvent.bind(this);
    }

    async init(romUrl) {
        window.Module = window.Module || {};
        window.Module.canvas = this.canvas;
        window.Module.noInitialRun = true;
        // load glue script …
        await new Promise((r,rej)=>{…});
        await new Promise(r=>{Module.onRuntimeInitialized = r;});
        this.Module = Module;
        // wrap functions, register input callback
        this.Module._inputCallback = this._inputCallback.bind(this);
        this.retro_set_input_poll(this.Module._inputCallback);
        // fetch ROM and write to MEMFS
        const resp = await fetch(romUrl);
        const romData = new Uint8Array(await resp.arrayBuffer());
        this.Module.FS.writeFile('/game.bin', romData);
        this.retro_init();
        if (!this.retro_load_game('/game.bin')) throw Error('…');
        window.addEventListener('keydown', this._boundKeyHandler);
        window.addEventListener('keyup', this._boundKeyHandler);
        this._running = true;
        requestAnimationFrame(this._runFrame.bind(this));
    }

    injectInput(playerIndex, buttonName, isPressed) { … }
    simulateInput(playerIndex, btn, pressed) { this.injectInput(playerIndex, btn, pressed); }
    _inputCallback(port) { return this.inputState[port]||0; }
    _runFrame() { if(this._running) { this.retro_run(); requestAnimationFrame(this._runFrame.bind(this)); } }
    destroy() { … }
}
