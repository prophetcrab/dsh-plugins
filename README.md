# dsh-plugins

The personal [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin market index.
This repository holds **only the list**: every plugin lives in its own repository.

Market index: **https://prophetcrab.github.io/dsh-plugins/index.json**

Add it in Settings → Plugins → Discover (or in your profile's `plugin-market` row) to browse and install.

## Listed plugins

| Plugin | What it does | Repository |
|---|---|---|
| `dsh-mcp-monitor` | Read-only inventory of configured MCP servers: connection state and registered tools | [dsh-mcp-monitor](https://github.com/prophetcrab/dsh-mcp-monitor) |
| `dsh-live-preview` | Right-sidebar live preview of a web page, or live frames of a running native window | [dsh-live-preview](https://github.com/prophetcrab/dsh-live-preview) |
| `dshtavern` | Role-play tavern: a director picks who speaks, each character answers from its own card | [DSHTavern](https://github.com/prophetcrab/DSHTavern) |
| `evoverse` | Agent world self-evolution engine, built as a DSH plugin | [evoverse](https://github.com/prophetcrab/evoverse) |

## Keeping it current

`.github/workflows/refresh-index.yml` regenerates `docs/index.json` every six hours (and on demand, and when
`market/plugins.txt` changes), then commits the result. A plugin's new release tag therefore reaches the store
without any manual step — each plugin repository just needs its own `vX.Y.Z` tag or a version bump on its default
branch.

The generator itself is vendored under `tools/market-generator/` (see its `NOTICE.md`) so CI does not clone the
whole DSH workspace.

## How the index is built

`market/plugins.txt` lists the Git repositories to read. The index is produced by the official
`@deepseek-ai/dsh-plugin-market-generator` from a DSH source checkout:

```sh
cd /path/to/deepseek-harness
node --import tsx/esm apps/plugin-market-generator/src/bin.ts \
  --input /path/to/dsh-plugins/market/plugins.txt \
  --output /path/to/dsh-plugins/docs/index.json \
  --title "Crab's DSH plugins" \
  --description "Personal DeepSeek Harness plugins: MCP server monitor, live preview, role-play tavern, and the evoverse agent world."
```

Then commit `docs/index.json`. A plugin's versions come from its release tags (`vX.Y.Z`) or its default branch,
so publishing an update means: bump the version in that plugin's own repository, push, then regenerate this index.

## Repository layout

```
market/plugins.txt   source list for the generator
docs/index.json      generated market index (GitHub Pages)
```

## License

MIT
