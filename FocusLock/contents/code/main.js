let config = {
    enabled: true,
    switchLimit: 8,
    regenerationTime: 5000,
    whitelist: []
};

let state = {
    currentWindow: null,
    switchTokens: 8,
    lastRegeneration: Date.now()
};

function loadConfig() {
    config.switchLimit = readConfig("switchLimit", 8);

    const regenMinutes = readConfig("regenerationMinutes", 0);
    const regenSeconds = readConfig("regenerationSeconds", 5);
    config.regenerationTime = (regenMinutes * 60 + regenSeconds) * 1000;

    const whitelistStr = readConfig("whitelist", "");
    config.whitelist = whitelistStr ? whitelistStr.split(",").map(s => s.trim().toLowerCase()) : [];

    // Get shortcut from config
    config.shortcutKey = readConfig("shortcutKey", "");

    state.switchTokens = config.switchLimit;
    state.lastRegeneration = Date.now();
}

function regenerateTokens() {
    const now = Date.now();
    const timePassed = now - state.lastRegeneration;

    if (state.switchTokens < config.switchLimit) {
        const tokensToAdd = Math.floor(timePassed / config.regenerationTime);
        if (tokensToAdd > 0) {
            state.switchTokens = Math.min(config.switchLimit, state.switchTokens + tokensToAdd);
            state.lastRegeneration = now - (timePassed % config.regenerationTime);
        }
    }
}

function isWhitelisted(client) {
    if (!client || config.whitelist.length === 0) return false;

    const resClass = client.resourceClass ? client.resourceClass.toString().toLowerCase() : "";
    const resName = client.resourceName ? client.resourceName.toString().toLowerCase() : "";

    for (let i = 0; i < config.whitelist.length; i++) {
        const wl = config.whitelist[i];
        if (resClass.includes(wl) || resName.includes(wl)) {
            return true;
        }
    }
    return false;
}

function addSwitchToken() {
    if (state.switchTokens < config.switchLimit) {
        state.switchTokens++;
    }
}

function onActiveWindowChanged(client) {
    if (!client) return;

    if (client.specialWindow || client.dock || client.desktopWindow) {
        return;
    }

    if (state.currentWindow && state.currentWindow === client) {
        return;
    }

    if (!config.enabled) {
        state.currentWindow = client;
        return;
    }

    if (isWhitelisted(client)) {
        state.currentWindow = client;
        return;
    }

    regenerateTokens();

    if (state.switchTokens > 0) {
        state.switchTokens--;
        state.currentWindow = client;
        state.lastRegeneration = Date.now();
    } else {
        if (state.currentWindow) {
            workspace.activeWindow = state.currentWindow;
        }
    }
}

loadConfig();

workspace.windowActivated.connect(onActiveWindowChanged);

registerShortcut("FocusLockAddToken",
                "Focus Lock: Add Switch Token",
                config.shortcutKey,
                addSwitchToken);

if (workspace.activeWindow) {
    state.currentWindow = workspace.activeWindow;
}
