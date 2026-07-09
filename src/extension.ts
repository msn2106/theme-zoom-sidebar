import * as vscode from "vscode";

type WebviewMessage =
  | { type: "ready" }
  | { type: "openThemePicker" }
  | { type: "setTheme"; theme: string }
  | { type: "addFavorite"; theme: string }
  | { type: "removeFavorite"; theme: string }
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "zoomReset" };

const viewType = "themeZoomSidebar.controls";
const favoriteThemesKey = "favoriteThemes";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ThemeZoomViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewType, provider),
    vscode.commands.registerCommand("themeZoomSidebar.openThemePicker", () => provider.openThemePicker()),
    vscode.commands.registerCommand("themeZoomSidebar.zoomIn", () => provider.zoomIn()),
    vscode.commands.registerCommand("themeZoomSidebar.zoomOut", () => provider.zoomOut()),
    vscode.commands.registerCommand("themeZoomSidebar.zoomReset", () => provider.zoomReset()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("workbench.colorTheme") || event.affectsConfiguration("window.zoomLevel")) {
        provider.refresh();
      }
    })
  );
}

export function deactivate() {}

class ThemeZoomViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => this.handleMessage(message));
  }

  refresh(): void {
    this.postState();
  }

  async openThemePicker(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.selectTheme");
    this.refresh();
  }

  async zoomIn(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.zoomIn");
    this.refresh();
  }

  async zoomOut(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.zoomOut");
    this.refresh();
  }

  async zoomReset(): Promise<void> {
    await vscode.commands.executeCommand("workbench.action.zoomReset");
    this.refresh();
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        this.postState();
        break;
      case "openThemePicker":
        await this.openThemePicker();
        break;
      case "setTheme":
        await this.setTheme(message.theme);
        break;
      case "addFavorite":
        await this.addFavorite(message.theme);
        break;
      case "removeFavorite":
        await this.removeFavorite(message.theme);
        break;
      case "zoomIn":
        await this.zoomIn();
        break;
      case "zoomOut":
        await this.zoomOut();
        break;
      case "zoomReset":
        await this.zoomReset();
        break;
    }
  }

  private async setTheme(theme: string): Promise<void> {
    await vscode.workspace.getConfiguration("workbench").update("colorTheme", theme, vscode.ConfigurationTarget.Global);
    this.refresh();
  }

  private async addFavorite(theme: string): Promise<void> {
    const favorites = this.getFavoriteThemes();

    if (!favorites.includes(theme)) {
      await this.context.globalState.update(favoriteThemesKey, [...favorites, theme]);
    }

    this.refresh();
  }

  private async removeFavorite(theme: string): Promise<void> {
    await this.context.globalState.update(
      favoriteThemesKey,
      this.getFavoriteThemes().filter((favorite) => favorite !== theme)
    );

    this.refresh();
  }

  private postState(): void {
    this.view?.webview.postMessage({
      type: "state",
      themes: this.getThemes(),
      currentTheme: this.getCurrentTheme(),
      favorites: this.getFavoriteThemes(),
      zoomLevel: this.getZoomLevel()
    });
  }

  private getThemes(): string[] {
    const themes = vscode.extensions.all.flatMap((extension) => {
      const contributes = extension.packageJSON?.contributes;
      const contributedThemes = Array.isArray(contributes?.themes) ? contributes.themes : [];

      return contributedThemes
        .map((theme: { label?: unknown; id?: unknown }) => theme.label ?? theme.id)
        .filter((theme: unknown): theme is string => typeof theme === "string");
    });

    return [...new Set(themes)].sort((themeA, themeB) => themeA.localeCompare(themeB));
  }

  private getCurrentTheme(): string {
    return vscode.workspace.getConfiguration("workbench").get("colorTheme", "Default Dark Modern");
  }

  private getZoomLevel(): number {
    return vscode.workspace.getConfiguration("window").get("zoomLevel", 0);
  }

  private getFavoriteThemes(): string[] {
    return this.context.globalState.get<string[]>(favoriteThemesKey, []);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Theme Zoom</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 14px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .section {
      margin-bottom: 18px;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    h2 {
      margin: 0;
      font-size: 11px;
      line-height: 1.4;
      letter-spacing: 0;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      font-weight: 700;
    }

    .current {
      margin: 0 0 10px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.4;
      word-break: break-word;
    }

    select,
    button {
      width: 100%;
      box-sizing: border-box;
      border-radius: 4px;
      border: 1px solid var(--vscode-input-border, transparent);
      font: inherit;
    }

    select {
      min-height: 30px;
      padding: 4px 8px;
      color: var(--vscode-dropdown-foreground);
      background: var(--vscode-dropdown-background);
    }

    button {
      min-height: 30px;
      padding: 5px 9px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-border, transparent);
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.icon {
      width: 34px;
      min-width: 34px;
      padding: 0;
      font-size: 16px;
      line-height: 1;
    }

    .stack {
      display: grid;
      gap: 8px;
    }

    .row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .theme-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 34px;
      gap: 8px;
      align-items: center;
    }

    .favorite {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 34px;
      gap: 8px;
      align-items: center;
    }

    .favorite button:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    .empty {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <section class="section">
    <div class="label-row">
      <h2>Theme</h2>
    </div>
    <p class="current" id="currentTheme">Loading theme...</p>
    <div class="stack">
      <button id="openThemePicker" title="Open the built-in theme picker">Open Theme Picker</button>
      <div class="theme-row">
        <select id="themeSelect" aria-label="Installed themes"></select>
        <button class="icon secondary" id="addFavorite" title="Add selected theme to favorites">+</button>
      </div>
      <button class="secondary" id="applyTheme" title="Apply selected theme">Apply Selected Theme</button>
    </div>
  </section>

  <section class="section">
    <div class="label-row">
      <h2>Favorites</h2>
    </div>
    <div class="stack" id="favorites"></div>
  </section>

  <section class="section">
    <div class="label-row">
      <h2>Zoom</h2>
    </div>
    <p class="current" id="zoomLevel">Zoom level: 0</p>
    <div class="row">
      <button class="icon" id="zoomOut" title="Zoom out">-</button>
      <button class="icon secondary" id="zoomReset" title="Reset zoom">0</button>
      <button class="icon" id="zoomIn" title="Zoom in">+</button>
    </div>
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = {
      themes: [],
      currentTheme: "",
      favorites: [],
      zoomLevel: 0
    };

    const currentTheme = document.getElementById("currentTheme");
    const themeSelect = document.getElementById("themeSelect");
    const favorites = document.getElementById("favorites");
    const zoomLevel = document.getElementById("zoomLevel");

    document.getElementById("openThemePicker").addEventListener("click", () => post("openThemePicker"));
    document.getElementById("applyTheme").addEventListener("click", () => post("setTheme", { theme: themeSelect.value }));
    document.getElementById("addFavorite").addEventListener("click", () => post("addFavorite", { theme: themeSelect.value }));
    document.getElementById("zoomIn").addEventListener("click", () => post("zoomIn"));
    document.getElementById("zoomOut").addEventListener("click", () => post("zoomOut"));
    document.getElementById("zoomReset").addEventListener("click", () => post("zoomReset"));

    window.addEventListener("message", (event) => {
      if (event.data.type !== "state") {
        return;
      }

      Object.assign(state, event.data);
      render();
    });

    function post(type, body = {}) {
      vscode.postMessage({ type, ...body });
    }

    function render() {
      currentTheme.textContent = "Current: " + state.currentTheme;
      zoomLevel.textContent = "Zoom level: " + state.zoomLevel;

      themeSelect.replaceChildren(...state.themes.map((theme) => {
        const option = document.createElement("option");
        option.value = theme;
        option.textContent = theme;
        option.selected = theme === state.currentTheme;
        return option;
      }));

      if (!state.themes.includes(state.currentTheme)) {
        const option = document.createElement("option");
        option.value = state.currentTheme;
        option.textContent = state.currentTheme;
        option.selected = true;
        themeSelect.prepend(option);
      }

      favorites.replaceChildren();

      if (state.favorites.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No favorites yet.";
        favorites.append(empty);
        return;
      }

      for (const theme of state.favorites) {
        const row = document.createElement("div");
        row.className = "favorite";

        const apply = document.createElement("button");
        apply.className = "secondary";
        apply.textContent = theme;
        apply.title = "Apply " + theme;
        apply.addEventListener("click", () => post("setTheme", { theme }));

        const remove = document.createElement("button");
        remove.className = "icon secondary";
        remove.textContent = "x";
        remove.title = "Remove " + theme + " from favorites";
        remove.addEventListener("click", () => post("removeFavorite", { theme }));

        row.append(apply, remove);
        favorites.append(row);
      }
    }

    post("ready");
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
