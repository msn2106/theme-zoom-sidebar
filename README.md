# Theme Zoom Sidebar

Theme Zoom Sidebar is a small VS Code and Cursor extension that puts theme switching and zoom controls in the left activity bar.

It is built for people who switch visual context often: light and dark themes, presentation zoom, screen sharing, demos, or focused coding sessions.

## Features

- Open the built-in VS Code theme picker.
- Apply installed color themes from a sidebar dropdown.
- Save favorite themes and switch to them in one click.
- Zoom in, zoom out, or reset zoom from the same panel.
- See the current color theme and window zoom level.
- Use keyboard shortcuts for theme picker and zoom actions.

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Open theme picker | `Cmd+Option+T` | `Ctrl+Alt+T` |
| Zoom in | `Cmd+Option+=` | `Ctrl+Alt+=` |
| Zoom out | `Cmd+Option+-` | `Ctrl+Alt+-` |
| Reset zoom | `Cmd+Option+0` | `Ctrl+Alt+0` |

## Development

Install dependencies:

```bash
npm install
```

Compile the extension:

```bash
npm run compile
```

Run locally:

1. Open this folder in VS Code or Cursor.
2. Press `F5`.
3. In the Extension Development Host window, open the Theme Zoom activity-bar view.

## Project Structure

```text
src/extension.ts      Extension source code and sidebar webview
media/icon.svg       Activity bar icon
docs/index.html      GitHub Pages landing page
docs/icon.svg        Landing page icon
package.json         Extension manifest
```

## Package as VSIX

Create a local installable extension package:

```bash
npx @vscode/vsce package
```

Install the generated `.vsix` in VS Code or Cursor:

1. Open the Extensions panel.
2. Select the overflow menu.
3. Choose **Install from VSIX...**.
4. Select the generated file.

## Publish

To publish on the Visual Studio Marketplace, create a publisher account, update the `publisher` value in `package.json`, then run:

```bash
npx @vscode/vsce login <publisher-id>
npx @vscode/vsce publish
```

Official publishing guide:

https://code.visualstudio.com/api/working-with-extensions/publishing-extension

## GitHub Pages

The landing page lives in `docs/`. GitHub Pages can be configured to serve from:

```text
Branch: main
Folder: /docs
```

## License

MIT License. See `LICENSE` for details.
