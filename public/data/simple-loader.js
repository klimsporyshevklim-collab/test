// ==========================================
// 🔴 ВЗЛОМ БРАУЗЕРА (VIRTUAL GAMEPAD PATCH)
// ==========================================
(function() {
    // Состояние нашего виртуального геймпада (Player 2)
    window.VirtualPad = {
        axes: [0, 0, 0, 0],
        buttons: Array(17).fill({ pressed: false, value: 0 }),
        connected: true,
        id: "Firebase Virtual Controller",
        index: 1, // ЭТО ВТОРОЙ ИГРОК
        mapping: "standard",
        timestamp: Date.now()
    };

    // Сохраняем настоящую функцию браузера
    const originalGetGamepads = navigator.getGamepads;

    // Подменяем функцию
    navigator.getGamepads = function() {
        // Получаем реальные геймпады (если есть)
        const gamepads = originalGetGamepads.apply(navigator);
        
        // Создаем массив геймпадов
        const pads = [];
        pads[0] = gamepads[0] || null; // P1 (Реальный или пусто)
        pads[1] = window.VirtualPad;   // P2 (НАШ ВИРТУАЛЬНЫЙ)
        pads[2] = null;
        pads[3] = null;
        
        return pads;
    };
    
    console.log("🔥 Браузер взломан: Виртуальный геймпад P2 активирован");
})();

// ==========================================
// 🟢 ДАЛЕЕ ИДЕТ СТАНДАРТНЫЙ КОД EMULATORJS
// ==========================================
(async function() {
    const scripts = [
        "emulator.js", "nipplejs.js", "shaders.js", "storage.js",
        "gamepad.js", "GameManager.js", "socket.io.min.js", "compression.js"
    ];

    const folderPath = (path) => path.substring(0, path.length - path.split("/").pop().length);
    let scriptPath = (typeof window.EJS_pathtodata === "string") ? window.EJS_pathtodata : folderPath((new URL(document.currentScript.src)).pathname);
    if (!scriptPath.endsWith("/")) scriptPath += "/";

    function loadScript(file) {
        return new Promise(function(resolve) {
            let script = document.createElement("script");
            script.src = ("undefined" != typeof EJS_paths && typeof EJS_paths[file] === "string") ? EJS_paths[file] : (file.endsWith("emulator.min.js") ? scriptPath + file : scriptPath + "src/" + file);
            script.onload = resolve;
            script.onerror = () => filesmissing(file).then(resolve);
            document.head.appendChild(script);
        })
    }

    function loadStyle(file) {
        return new Promise(function(resolve) {
            let css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = ("undefined" != typeof EJS_paths && typeof EJS_paths[file] === "string") ? EJS_paths[file] : scriptPath + file;
            css.onload = resolve;
            css.onerror = () => filesmissing(file).then(resolve);
            document.head.appendChild(css);
        })
    }

    async function filesmissing(file) {
        if (file.includes(".min.") && !file.includes("socket")) {
            if (file === "emulator.min.js") {
                for (let i = 0; i < scripts.length; i++) await loadScript(scripts[i]);
            } else {
                await loadStyle("emulator.css");
            }
        }
    }

    if (("undefined" != typeof EJS_DEBUG_XX && true === EJS_DEBUG_XX)) {
        for (let i = 0; i < scripts.length; i++) await loadScript(scripts[i]);
        await loadStyle("emulator.css");
    } else {
        await loadScript("emulator.min.js");
        await loadStyle("emulator.min.css");
    }

    const config = {};
    config.gameUrl = window.EJS_gameUrl;
    config.dataPath = scriptPath;
    config.system = window.EJS_core;
    config.filePaths = window.EJS_paths;

    window.EJS_emulator = new EmulatorJS(EJS_player, config);
})();
