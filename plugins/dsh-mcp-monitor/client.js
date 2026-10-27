/**
 * MCP monitor, browser half.
 *
 * Registers one Settings section that reads `/mcp-monitor/servers` — the same
 * snapshot the `mcp_servers` tool returns — and renders it as a read-only list
 * of configured MCP servers with their live connection state and tools.
 *
 * Factories stay side-effect free: locale registration and slot registration
 * happen inside `apply`, through `ctx.effect` / `ctx.slots.inject`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-mcp-monitor',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'mcp.monitor'

    const en = {
      nav: 'MCP servers',
      title: 'MCP servers',
      subtitle: 'External MCP servers configured in this profile. Read-only: connection state and registered tools.',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      loading: 'Reading configured servers…',
      empty: 'No MCP servers are configured in this profile.',
      errorTitle: 'Could not read the MCP server list',
      retry: 'Retry',
      connected: 'Connected',
      notConnected: 'Not connected',
      disabled: 'Disabled',
      tools: 'Tools',
      showTools: 'Show tools',
      hideTools: 'Hide tools',
      noTools: 'This server exposes no tools.',
      transportStdio: 'stdio',
      transportHttp: 'HTTP',
      timeout: 'Tool timeout',
      reconnectOn: 'Auto-reconnect on',
      reconnectOff: 'Auto-reconnect off',
      updated: 'Updated',
    }

    const zh = {
      nav: 'MCP 服务器',
      title: 'MCP 服务器',
      subtitle: '当前 profile 中配置的外部 MCP 服务器，只读展示连接状态与已注册的工具。',
      refresh: '刷新',
      refreshing: '刷新中…',
      loading: '正在读取已配置的服务器…',
      empty: '当前 profile 没有配置任何 MCP 服务器。',
      errorTitle: '无法读取 MCP 服务器列表',
      retry: '重试',
      connected: '已连接',
      notConnected: '未连接',
      disabled: '已禁用',
      tools: '工具',
      showTools: '展开工具',
      hideTools: '收起工具',
      noTools: '该服务器没有暴露工具。',
      transportStdio: 'stdio',
      transportHttp: 'HTTP',
      timeout: '调用超时',
      reconnectOn: '自动重连开启',
      reconnectOff: '自动重连关闭',
      updated: '更新于',
    }

    const COLOR = {
      primary: 'var(--dsw-alias-label-primary)',
      secondary: 'var(--dsw-alias-label-secondary)',
      tertiary: 'var(--dsw-alias-label-tertiary)',
      border: 'var(--dsw-alias-border-l1)',
      surface: 'var(--dsw-alias-bg-layer-1)',
      success: 'var(--dsw-alias-state-success-primary)',
      warn: 'var(--dsw-alias-state-warn-primary)',
      error: 'var(--dsw-alias-state-error-primary)',
      link: 'var(--dsw-alias-link)',
    }

    const styles = {
      section: { display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 },
      header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' },
      heading: { margin: 0, fontSize: '15px', lineHeight: 1.4, fontWeight: 500, color: COLOR.primary },
      subtitle: { margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5, color: COLOR.tertiary, maxWidth: '60ch' },
      button: {
        appearance: 'none', border: `0.5px solid ${COLOR.border}`, background: 'transparent',
        color: COLOR.primary, fontSize: '12px', lineHeight: 1.2, padding: '5px 10px',
        borderRadius: '7px', cursor: 'pointer', flex: 'none',
      },
      linkButton: {
        appearance: 'none', border: 'none', background: 'none', padding: 0,
        color: COLOR.link, fontSize: '12px', lineHeight: 1.4, cursor: 'pointer',
      },
      list: { display: 'flex', flexDirection: 'column', gap: '8px' },
      card: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '10px',
        background: COLOR.surface, padding: '12px 14px', display: 'flex',
        flexDirection: 'column', gap: '6px', minWidth: 0,
      },
      cardTop: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
      dot: { width: '7px', height: '7px', borderRadius: '999px', flex: 'none' },
      serverName: { fontSize: '13px', fontWeight: 500, color: COLOR.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      chip: {
        fontSize: '11px', lineHeight: 1.4, color: COLOR.tertiary,
        border: `0.5px solid ${COLOR.border}`, borderRadius: '999px', padding: '1px 8px', flex: 'none',
      },
      status: { fontSize: '11px', lineHeight: 1.4, color: COLOR.secondary, flex: 'none' },
      target: {
        fontFamily: 'var(--dsw-font-family)',
        fontSize: '11.5px', lineHeight: 1.5, color: COLOR.tertiary,
        overflowWrap: 'anywhere', minWidth: 0,
      },
      meta: { display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', lineHeight: 1.4, color: COLOR.tertiary },
      tools: {
        display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '2px 0 0',
        padding: '8px 0 0', borderTop: `0.5px solid ${COLOR.border}`,
      },
      toolChip: {
        fontSize: '11px', lineHeight: 1.4, color: COLOR.secondary,
        background: 'var(--dsw-alias-bg-layer-2)', borderRadius: '6px', padding: '1px 6px',
      },
      notice: {
        border: `0.5px solid ${COLOR.border}`, borderRadius: '10px', padding: '12px 14px',
        fontSize: '12px', lineHeight: 1.5, color: COLOR.secondary,
      },
      errorText: { margin: '0 0 8px', fontSize: '12px', lineHeight: 1.5, color: COLOR.error },
    }

    function statusOf(server) {
      if (server.disabled) return { labelKey: 'disabled', color: COLOR.warn }
      if (server.connected) return { labelKey: 'connected', color: COLOR.success }
      return { labelKey: 'notConnected', color: COLOR.tertiary }
    }

    function ServerCard(props) {
      const { t } = props
      const server = props.server
      const [open, setOpen] = React.useState(false)
      const status = statusOf(server)
      const transportKey = server.transport === 'streamable-http' ? 'transportHttp' : 'transportStdio'
      const meta = [
        `${t('tools')}: ${server.toolCount}`,
        `${t('timeout')}: ${Math.round(server.toolCallTimeoutMs / 1000)}s`,
        t(server.reconnectEnabled ? 'reconnectOn' : 'reconnectOff'),
      ]
      return h('div', { style: styles.card },
        h('div', { style: styles.cardTop },
          h('span', { style: { ...styles.dot, background: status.color }, 'aria-hidden': true }),
          h('span', { style: styles.serverName, title: server.name }, server.name),
          h('span', { style: styles.chip }, t(transportKey)),
          h('span', { style: { flex: 1 } }),
          h('span', { style: { ...styles.status, color: server.connected ? COLOR.success : COLOR.secondary } },
            t(status.labelKey)),
        ),
        server.target !== '' && h('div', { style: styles.target }, server.target),
        h('div', { style: styles.meta }, ...meta.map((entry, index) => h('span', { key: index }, entry))),
        server.toolCount > 0 && h('div', null,
          h('button', {
            type: 'button',
            style: styles.linkButton,
            'aria-expanded': open,
            onClick: () => { setOpen(value => !value) },
          }, t(open ? 'hideTools' : 'showTools')),
          open && h('div', { style: styles.tools },
            ...server.tools.map(tool => h('span', { key: tool, style: styles.toolChip }, tool))),
        ),
        server.toolCount === 0 && !server.disabled && h('div', { style: styles.meta }, t('noTools')),
      )
    }

    function McpMonitorSection(props) {
      const { t } = props
      const [state, setState] = React.useState({ status: 'loading', servers: [], error: null, generatedAt: null })
      const ticket = React.useRef(0)
      const load = React.useCallback(() => {
        const mine = ++ticket.current
        setState(previous => ({ ...previous, status: previous.status === 'ready' ? 'refreshing' : 'loading', error: null }))
        fetch('/mcp-monitor/servers', { cache: 'no-store', headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
          })
          .then((data) => {
            if (mine !== ticket.current) return
            setState({
              status: data.ok === false ? 'error' : 'ready',
              servers: Array.isArray(data.servers) ? data.servers : [],
              error: data.ok === false ? String(data.error ?? 'unknown error') : null,
              generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : null,
            })
          })
          .catch((error) => {
            if (mine !== ticket.current) return
            setState({
              status: 'error',
              servers: [],
              error: error && error.message ? error.message : String(error),
              generatedAt: null,
            })
          })
      }, [])
      React.useEffect(() => { load() }, [load])

      const busy = state.status === 'loading' || state.status === 'refreshing'
      return h('section', { style: styles.section },
        h('div', { style: styles.header },
          h('div', null,
            h('h2', { style: styles.heading }, t('title')),
            h('p', { style: styles.subtitle }, t('subtitle')),
          ),
          h('button', {
            type: 'button', style: styles.button, disabled: busy,
            onClick: () => { load() },
          }, t(busy ? 'refreshing' : 'refresh')),
        ),
        state.status === 'loading' && h('div', { style: styles.notice, role: 'status' }, t('loading')),
        state.status === 'error' && h('div', { style: styles.notice, role: 'alert' },
          h('p', { style: styles.errorText }, `${t('errorTitle')}: ${state.error}`),
          h('button', { type: 'button', style: styles.linkButton, onClick: () => { load() } }, t('retry')),
        ),
        state.status !== 'error' && state.servers.length === 0 && state.status !== 'loading'
          && h('div', { style: styles.notice }, t('empty')),
        h('div', { style: styles.list },
          ...state.servers.map(server => h(ServerCard, { key: server.id, server, t })),
        ),
        state.generatedAt !== null && h('div', { style: styles.meta },
          `${t('updated')} ${new Date(state.generatedAt).toLocaleTimeString()}`),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'mcp-monitor: copy dictionaries')
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'mcp-monitor',
          order: 45,
          label: () => t('nav'),
          locale: NS,
        }, McpMonitorSection))
      },
    }
  },
})
