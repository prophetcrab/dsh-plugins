# dsh-plugins

Personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugins, plus the market index that publishes them.

Market index: **https://prophetcrab.github.io/dsh-plugins/index.json**

## Plugins

### `dsh-mcp-monitor`

Read-only inventory of the MCP servers configured in the current profile: transport, command or endpoint,
whether the server is connected, and the tools it registers.

- Settings → **MCP servers**: one row per configured server, with a live status dot, tool count and an
  expandable tool list.
- Tool `mcp_servers`: the same snapshot for the agent, optionally filtered by server name.

The join is the live signal — a server whose `mcp__<name>__*` tools are registered is connected. Credentials
in stdio `env` and HTTP `headers` never leave the Host.

### `dsh-live-preview`

A right-sidebar **Live preview** tab with two sources:

- **Web**: an embedded iframe for any http(s) URL (dev servers, localhost).
- **Window**: live JPEG frames of a running native window (Godot, a desktop app), 2/5/8 fps.

Agent tools `preview_open` and `preview_status` open the tab automatically while you work, so a UI change is
visible without asking. Windows are captured with `screencapture`, which needs Screen Recording permission for
the app that runs DSH.

> **Platform note**: the bundled `bin/window-list` helper is macOS arm64. Web preview works on any platform;
> window preview currently requires macOS.

## Install

Add the market index in Settings → Plugins → Discover (or put it in your profile's `cordis.patch.yml`
`plugin-market` row), then install from there.

Manual install: add the package as a profile dependency and activate its bundle row. For example, in
`~/.dsh/profiles/<profile>/package.json`:

```json
{
  "dependencies": {
    "dsh-live-preview": "github:prophetcrab/dsh-plugins#main"
  }
}
```

## Repository layout

```
plugins/dsh-mcp-monitor/   bundle package
plugins/dsh-live-preview/  bundle package
market/plugins.txt         source list for the index generator
docs/index.json            generated market index (GitHub Pages)
```

## License

MIT
