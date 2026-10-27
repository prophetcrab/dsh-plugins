/**
 * MCP monitor, Host half.
 *
 * Reads the composed Loader entries for `@deepseek-ai/dsh-mcp-client` rows — the
 * only place an external MCP server is configured in a DSH profile — and joins
 * each one with the tools currently registered under its `mcp__<name>__` prefix.
 * The join is the live signal: a server whose tools are registered is connected.
 *
 * Read-only by design: no config is written, and stdio `env` / HTTP `headers`
 * (the two places credentials live) never leave the Host.
 *
 * @module dsh-mcp-monitor
 */

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'mcp-monitor'

/** Required services: the tool registry and the composed loader entries. */
export const inject = ['tools', 'loader']

/** The MCP bridge package whose rows describe external servers. */
const MCP_CLIENT_PACKAGE = '@deepseek-ai/dsh-mcp-client'

/** Route the Settings section reads. */
const ROUTE_PATH = '/mcp-monitor/servers'

/**
 * Read the registered tool names from whichever projection this build ships.
 * `schemas()` exists in both the packaged and source ToolsService; `definitions()`
 * is the newer source-only projection, kept as a fallback.
 * @param tools - the Host tools service.
 * @returns registered model-facing tool names.
 */
function registeredToolNames(tools) {
  if (typeof tools.schemas === 'function') return tools.schemas().map(schema => schema.name)
  if (typeof tools.definitions === 'function') return tools.definitions().map(definition => definition.name)
  return []
}

/**
 * Collect the configured servers and their live state.
 * @param ctx - the Host plugin context.
 * @returns a JSON-serializable snapshot.
 */
function snapshot(ctx) {
  const registered = registeredToolNames(ctx.tools)
  const servers = []
  for (const entry of ctx.loader.entries()) {
    if (entry.options.name !== MCP_CLIENT_PACKAGE) continue
    const config = entry.options.config ?? {}
    const serverName = config.serverName
    if (typeof serverName !== 'string' || serverName.length === 0) continue
    const prefix = `mcp__${serverName}__`
    const tools = registered
      .filter(tool => tool.startsWith(prefix))
      .map(tool => tool.slice(prefix.length))
      .sort((left, right) => left.localeCompare(right))
    const disabled = entry.disabled === true
    const transport = config.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
    servers.push({
      id: typeof entry.options.id === 'string' ? entry.options.id : serverName,
      name: serverName,
      transport,
      // Command and endpoint are safe to show; env and headers are not.
      target: transport === 'stdio'
        ? [config.command, ...(Array.isArray(config.args) ? config.args : [])]
            .filter(part => typeof part === 'string' && part.length > 0)
            .join(' ')
        : typeof config.url === 'string' ? config.url : '',
      disabled,
      connected: !disabled && tools.length > 0,
      toolCount: tools.length,
      tools,
      toolCallTimeoutMs: typeof config.toolCallTimeoutMs === 'number' ? config.toolCallTimeoutMs : 60000,
      reconnectEnabled: config.reconnect?.enabled !== false,
    })
  }
  servers.sort((left, right) => left.name.localeCompare(right.name))
  return { generatedAt: new Date().toISOString(), servers }
}

/** Register the model-facing tool and the route the Settings section reads. */
export function apply(ctx) {
  const read = () => {
    try {
      return { ok: true, ...snapshot(ctx) }
    } catch (error) {
      // A read failure is reported, never thrown: the route would answer 400
      // with an empty body and leave the Settings page guessing.
      return {
        ok: false,
        generatedAt: new Date().toISOString(),
        servers: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  ctx.tools.register({
    name: 'mcp_servers',
    description:
      'List the external MCP servers configured in this profile: transport, endpoint or command, '
      + 'whether the server is connected, and the tools it currently registers. Read-only.',
    parameters: {
      type: 'object',
      properties: {
        server: {
          type: 'string',
          description: 'Optional server name to narrow the result to one server.',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    execute: async (args) => {
      const all = read()
      const wanted = typeof args?.server === 'string' ? args.server : undefined
      const result = wanted === undefined
        ? all
        : { ...all, servers: all.servers.filter(server => server.name === wanted) }
      return JSON.stringify(result, null, 2)
    },
  })

  // Optional: profiles without the Web host mount no HTTP route, and the tool
  // still answers. The Client half shows its error state in that case.
  //
  // `handler` (not the newer `resource` form): the Desktop build's webserver
  // dispatches only `route.handler(req, res)`, and a route without one rejects
  // every request with 400.
  ctx.inject(['webServer'], (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: (req, res) => {
        const payload = Buffer.from(JSON.stringify(read()), 'utf8')
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(payload.length),
          'cache-control': 'no-store',
        })
        res.end(req.method === 'HEAD' ? undefined : payload)
      },
    }), 'mcp-monitor: servers route')
  })
}
