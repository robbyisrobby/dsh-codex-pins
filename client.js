// dsh-codex-pins browser half: Codex-style pinned sessions above the sidebar tree.
window.__ModuleLoader__.load({
  id: 'dsh-codex-pins',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var name = 'dsh-codex-pins'
    var inject = ['sessions']

    var STORAGE_KEY = 'dsh-codex-pins.v1'
    var LEGACY_STORAGE_KEY = 'dsh.session-pin.pinned'
    var MAX_PINS = 50
    var SESSION_ID_RE = /^session-[A-Za-z0-9-]{6,}$/
    var SECTION_ATTR = 'data-dsh-codex-pins'
    var ROW_BTN_CLASS = 'dsh-codex-pins-row-btn'
    var PLUGIN_ID = 'dsh-codex-pins'
    var LOCALE_NS = 'dsh-codex-pins'
    var PIN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>'

    var COPY = {
      zh: { heading: '置顶', pin: '置顶会话', unpin: '取消置顶', empty: '没有已置顶的会话', limit: '置顶已满（最多 50 个）' },
      en: { heading: 'Pinned', pin: 'Pin session', unpin: 'Unpin session', empty: 'No pinned sessions', limit: 'Pin limit reached (50)' },
    }

    function normalizePins(value) {
      var out = []
      var seen = {}
      if (!Array.isArray(value)) return out
      for (var i = 0; i < value.length; i++) {
        var item = value[i]
        if (typeof item !== 'string' || !SESSION_ID_RE.test(item) || seen[item]) continue
        seen[item] = true
        out.push(item)
        if (out.length >= MAX_PINS) break
      }
      return out
    }

    function decodeStoredPins(raw) {
      if (Array.isArray(raw)) return normalizePins(raw)
      if (raw && typeof raw === 'object' && Array.isArray(raw.pinned)) return normalizePins(raw.pinned)
      return []
    }

    function setPinned(pinned, sessionId, next) {
      var current = normalizePins(pinned)
      if (!SESSION_ID_RE.test(sessionId)) return { pinned: current, limited: false }
      var has = current.indexOf(sessionId) !== -1
      if (next) {
        if (has) return { pinned: [sessionId].concat(current.filter(function (id) { return id !== sessionId })), limited: false }
        if (current.length >= MAX_PINS) return { pinned: current, limited: true }
        return { pinned: [sessionId].concat(current), limited: false }
      }
      if (!has) return { pinned: current, limited: false }
      return { pinned: current.filter(function (id) { return id !== sessionId }), limited: false }
    }

    function prunePins(pinned, liveIds) {
      var live = {}
      for (var i = 0; i < liveIds.length; i++) live[liveIds[i]] = true
      return normalizePins(pinned).filter(function (id) { return live[id] })
    }

    function titlesToIds(list) {
      var map = new Map()
      for (var i = 0; i < list.ids.length; i++) {
        var id = list.ids[i]
        var row = list.byId[id]
        var title = String((row && (row.displayTitle || row.title)) || '').trim()
        if (!title) continue
        var bucket = map.get(title)
        if (bucket) bucket.push(id)
        else map.set(title, [id])
      }
      return map
    }

    function sessionIdForTitle(title, byTitle, currentId) {
      var ids = byTitle.get(title)
      if (!ids || ids.length === 0) return undefined
      if (ids.length === 1) return ids[0]
      if (currentId && ids.indexOf(currentId) !== -1) return currentId
      return undefined
    }

    function formatPinTime(updatedAt, lang, now) {
      if (typeof updatedAt !== 'number' || !(updatedAt > 0)) return ''
      var stamp = now == null ? Date.now() : now
      var diff = Math.max(0, stamp - updatedAt)
      var MIN = 60000, HOUR = 3600000, DAY = 86400000
      if (diff < MIN) return lang === 'zh' ? '刚刚' : 'now'
      if (diff < HOUR) {
        var n = Math.floor(diff / MIN)
        return lang === 'zh' ? n + '分钟' : n + 'm'
      }
      if (diff < DAY) {
        var h = Math.floor(diff / HOUR)
        return lang === 'zh' ? h + '小时' : h + 'h'
      }
      if (diff < 30 * DAY) {
        var d = Math.floor(diff / DAY)
        return lang === 'zh' ? d + '天' : d + 'd'
      }
      if (diff < 365 * DAY) {
        var m = Math.floor(diff / (30 * DAY))
        return lang === 'zh' ? m + '个月' : m + 'mo'
      }
      var y = Math.floor(diff / (365 * DAY))
      return lang === 'zh' ? y + '年' : y + 'y'
    }

    function safeStorage() {
      return {
        getItem: function (key) {
          try { return window.localStorage.getItem(key) } catch { return null }
        },
        setItem: function (key, value) {
          try { window.localStorage.setItem(key, value) } catch { /* quota / private mode */ }
        },
      }
    }

    function readPins(storage) {
      try {
        var ours = storage.getItem(STORAGE_KEY)
        if (ours) return decodeStoredPins(JSON.parse(ours))
      } catch { /* fall through */ }
      try {
        var legacy = storage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) {
          var migrated = decodeStoredPins(JSON.parse(legacy))
          if (migrated.length > 0) storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, pinned: migrated }))
          return migrated
        }
      } catch { /* ignore */ }
      return []
    }

    function writePins(storage, pinned) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, pinned: normalizePins(pinned) }))
    }

    function createStore(storage, events) {
      var pinned = readPins(storage)
      var listeners = new Set()
      var notify = function () {
        listeners.forEach(function (fn) { fn() })
      }
      var onStorage = function (event) {
        if (event.key !== null && event.key !== STORAGE_KEY) return
        try {
          pinned = decodeStoredPins(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'))
        } catch {
          pinned = []
        }
        notify()
      }
      events.addEventListener('storage', onStorage)
      return {
        get: function () { return pinned.slice() },
        isPinned: function (id) { return pinned.indexOf(id) !== -1 },
        set: function (sessionId, next) {
          var result = setPinned(pinned, sessionId, next)
          pinned = result.pinned
          writePins(storage, pinned)
          notify()
          return result
        },
        prune: function (liveIds) {
          var next = prunePins(pinned, liveIds)
          if (next.length === pinned.length && next.every(function (id, i) { return id === pinned[i] })) return
          pinned = next
          writePins(storage, pinned)
          notify()
        },
        subscribe: function (fn) {
          listeners.add(fn)
          return function () { listeners.delete(fn) }
        },
        dispose: function () {
          events.removeEventListener('storage', onStorage)
          listeners.clear()
        },
      }
    }

    var STYLE_TEXT = [
      '[' + SECTION_ATTR + ']{flex:none;padding:4px 0 8px;user-select:none;}',
      '.dsh-codex-pins-heading{display:flex;align-items:center;gap:8px;height:28px;padding:0 8px;color:var(--dsw-alias-label-secondary,#8b949e);font-size:12px;font-weight:600;letter-spacing:.02em;}',
      '.dsh-codex-pins-heading svg{flex:none;opacity:.85;}',
      '.dsh-codex-pins-list{display:flex;flex-direction:column;gap:1px;}',
      '.dsh-codex-pins-row{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:34px;padding:0 8px;border-radius:8px;color:var(--dsw-alias-label-primary,#e6edf3);cursor:pointer;font-size:13px;}',
      '.dsh-codex-pins-row:hover,.dsh-codex-pins-row:focus-visible{background:color-mix(in srgb, var(--dsw-alias-label-primary,#e6edf3) 8%, transparent);}',
      '.dsh-codex-pins-row[aria-current="true"]{background:color-mix(in srgb, var(--dsw-alias-label-primary,#e6edf3) 12%, transparent);}',
      '.dsh-codex-pins-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsh-codex-pins-time{flex:none;color:var(--dsw-alias-label-secondary,#8b949e);font-size:11px;}',
      '.dsh-codex-pins-toggle{all:unset;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;color:#eab308;cursor:pointer;flex:none;}',
      '.dsh-codex-pins-toggle:hover{background:rgba(234,179,8,.14);}',
      'button.' + ROW_BTN_CLASS + '{all:unset;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-right:4px;border-radius:4px;color:#8b949e;cursor:pointer;flex:none;opacity:0;}',
      '[role="treeitem"]:hover > button.' + ROW_BTN_CLASS + ',button.' + ROW_BTN_CLASS + '.is-pinned,button.' + ROW_BTN_CLASS + ':focus-visible{opacity:1;}',
      'button.' + ROW_BTN_CLASS + '.is-pinned{color:#eab308;}',
      'button.' + ROW_BTN_CLASS + ':hover{background:rgba(140,149,159,.12);}',
    ].join('')

    function injectStyles() {
      var existing = document.querySelector('style[data-plugin="' + PLUGIN_ID + '"]')
      if (existing) return existing
      var tag = document.createElement('style')
      tag.dataset.plugin = PLUGIN_ID
      tag.textContent = STYLE_TEXT
      document.head.appendChild(tag)
      return tag
    }

    function detectLang(ctx) {
      try {
        var locale = ctx.locale
        var snap = locale && (locale.getLocale ? locale.getLocale() : locale.getSnapshot && locale.getSnapshot())
        var active = snap && typeof snap.active === 'string' ? snap.active : ''
        if (active.toLowerCase().indexOf('zh') === 0) return 'zh'
        if (active) return 'en'
      } catch { /* ignore */ }
      var nav = (navigator.language || '').toLowerCase()
      return nav.indexOf('zh') === 0 ? 'zh' : 'en'
    }

    function t(lang, key) {
      return (COPY[lang] || COPY.en)[key] || COPY.en[key] || key
    }

    function sessionList(ctx) {
      return ctx.sessions.list.getSnapshot()
    }

    function findSessionTree(doc) {
      var trees = doc.querySelectorAll('[role="tree"]')
      for (var i = 0; i < trees.length; i++) {
        if (trees[i].closest('[' + SECTION_ATTR + ']')) continue
        if (trees[i].querySelector('[role="treeitem"][aria-selected]')) return trees[i]
      }
      for (var j = 0; j < trees.length; j++) {
        if (!trees[j].closest('[' + SECTION_ATTR + ']')) return trees[j]
      }
      return null
    }

    function titleFromRow(row) {
      var nodes = row.querySelectorAll('span')
      for (var i = 0; i < nodes.length; i++) {
        var text = (nodes[i].textContent || '').trim()
        if (text && !nodes[i].querySelector('svg,button') && text.length < 200) {
          if (nodes[i].children.length === 0) return text
        }
      }
      return (row.textContent || '').trim().split('\n')[0] || ''
    }

    function isOurSection(node) {
      return node && node.closest && node.closest('[' + SECTION_ATTR + ']')
    }

    function mountSidebar(ctx, store) {
      var doc = document
      var scheduled = false
      var lang = detectLang(ctx)

      var render = function () {
        scheduled = false
        lang = detectLang(ctx)
        var list = sessionList(ctx)
        if (list.phase === 'ready') store.prune(list.ids)
        var pinned = store.get()
        var tree = findSessionTree(doc)
        var existing = doc.querySelector('[' + SECTION_ATTR + ']')
        if (!tree) return
        if (pinned.length === 0) {
          if (existing) existing.remove()
          paintOfficialRows(list, [])
          return
        }
        var section = existing
        if (!section) {
          section = doc.createElement('div')
          section.setAttribute(SECTION_ATTR, '')
          var heading = doc.createElement('div')
          heading.className = 'dsh-codex-pins-heading'
          heading.innerHTML = PIN_SVG
          var headingLabel = doc.createElement('span')
          heading.appendChild(headingLabel)
          var listEl = doc.createElement('div')
          listEl.className = 'dsh-codex-pins-list'
          listEl.setAttribute('role', 'list')
          section.appendChild(heading)
          section.appendChild(listEl)
        }
        if (section.parentNode !== tree.parentNode || section.nextSibling !== tree) {
          tree.parentNode.insertBefore(section, tree)
        }
        var headingText = section.querySelector('.dsh-codex-pins-heading span')
        if (headingText) headingText.textContent = t(lang, 'heading')
        var listRoot = section.querySelector('.dsh-codex-pins-list')
        if (!listRoot) return
        var seen = {}
        var rows = listRoot.querySelectorAll('.dsh-codex-pins-row')
        for (var r = 0; r < rows.length; r++) {
          var existingId = rows[r].getAttribute('data-session-id')
          if (pinned.indexOf(existingId) === -1) rows[r].remove()
          else seen[existingId] = rows[r]
        }
        var current = list.current
        for (var i = 0; i < pinned.length; i++) {
          var id = pinned[i]
          var row = seen[id]
          if (!row) {
            row = doc.createElement('button')
            row.type = 'button'
            row.className = 'dsh-codex-pins-row'
            row.setAttribute('data-session-id', id)
            row.setAttribute('role', 'listitem')
            var pinBtn = doc.createElement('span')
            pinBtn.className = 'dsh-codex-pins-toggle'
            pinBtn.innerHTML = PIN_SVG
            var titleEl = doc.createElement('span')
            titleEl.className = 'dsh-codex-pins-title'
            var timeEl = doc.createElement('span')
            timeEl.className = 'dsh-codex-pins-time'
            row.appendChild(pinBtn)
            row.appendChild(titleEl)
            row.appendChild(timeEl)
            row.addEventListener('click', function (event) {
              var target = event.currentTarget
              var sid = target.getAttribute('data-session-id')
              if (event.target.closest && event.target.closest('.dsh-codex-pins-toggle')) {
                event.preventDefault()
                event.stopPropagation()
                store.set(sid, false)
                return
              }
              if (sid && typeof ctx.sessions.open === 'function') ctx.sessions.open(sid)
            })
            listRoot.appendChild(row)
          }
          var summary = list.byId[id]
          var title = summary && (summary.displayTitle || summary.title) ? (summary.displayTitle || summary.title) : id
          var titleNode = row.querySelector('.dsh-codex-pins-title')
          if (titleNode && titleNode.textContent !== title) titleNode.textContent = title
          var timeNode = row.querySelector('.dsh-codex-pins-time')
          var timeText = summary ? formatPinTime(summary.updatedAt, lang) : ''
          if (timeNode && timeNode.textContent !== timeText) timeNode.textContent = timeText
          var toggle = row.querySelector('.dsh-codex-pins-toggle')
          if (toggle) {
            toggle.setAttribute('aria-label', t(lang, 'unpin'))
            toggle.title = t(lang, 'unpin')
          }
          if (id === current) row.setAttribute('aria-current', 'true')
          else row.removeAttribute('aria-current')
          if (listRoot.children[i] !== row) listRoot.insertBefore(row, listRoot.children[i] || null)
        }
        paintOfficialRows(list, pinned)
      }

      var paintOfficialRows = function (list, pinned) {
        var byTitle = titlesToIds(list)
        var pinnedSet = {}
        for (var p = 0; p < pinned.length; p++) pinnedSet[pinned[p]] = true
        var rows = doc.querySelectorAll('[role="treeitem"][aria-selected]')
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i]
          if (!(row instanceof HTMLElement) || isOurSection(row)) continue
          var title = titleFromRow(row)
          var id = sessionIdForTitle(title, byTitle, list.current)
          var btn = row.querySelector(':scope > button.' + ROW_BTN_CLASS)
          if (!id) {
            if (btn) btn.remove()
            continue
          }
          if (!btn) {
            btn = doc.createElement('button')
            btn.type = 'button'
            btn.className = ROW_BTN_CLASS
            btn.innerHTML = PIN_SVG
            btn.addEventListener('click', function (event) {
              event.preventDefault()
              event.stopPropagation()
              var sid = event.currentTarget.getAttribute('data-session-id')
              if (!sid) return
              var result = store.set(sid, !store.isPinned(sid))
              if (result.limited) event.currentTarget.title = t(detectLang(ctx), 'limit')
            })
            row.insertBefore(btn, row.firstChild)
          }
          btn.setAttribute('data-session-id', id)
          var isPinned = !!pinnedSet[id]
          btn.classList.toggle('is-pinned', isPinned)
          btn.setAttribute('aria-pressed', String(isPinned))
          var label = t(lang, isPinned ? 'unpin' : 'pin')
          btn.title = label
          btn.setAttribute('aria-label', label)
        }
      }

      var schedule = function () {
        if (scheduled) return
        scheduled = true
        var run = function () { render() }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
        else setTimeout(run, 0)
      }

      var observer = new MutationObserver(schedule)
      observer.observe(doc.body, { childList: true, subtree: true, characterData: true })
      var unsubStore = store.subscribe(schedule)
      var unsubSessions = ctx.sessions.list.subscribe(schedule)
      schedule()
      return function () {
        unsubSessions()
        unsubStore()
        observer.disconnect()
        var section = doc.querySelector('[' + SECTION_ATTR + ']')
        if (section) section.remove()
        var buttons = doc.querySelectorAll('button.' + ROW_BTN_CLASS)
        for (var i = 0; i < buttons.length; i++) buttons[i].remove()
      }
    }

    function HeaderPin(props) {
      var React = require('react')
      var pin = props.pin
      var id = props.sessionId
      if (!id) return null
      var isPinned = React.useSyncExternalStore(pin.subscribe, function () { return pin.isPinned(id) })
      var lang = props.lang ? props.lang() : 'en'
      var label = t(lang, isPinned ? 'unpin' : 'pin')
      return React.createElement('button', {
        type: 'button',
        className: ROW_BTN_CLASS + (isPinned ? ' is-pinned' : ''),
        title: label,
        'aria-label': label,
        'aria-pressed': isPinned,
        style: { opacity: 1, width: '24px', height: '24px' },
        onClick: function (event) {
          event.stopPropagation()
          pin.set(id, !isPinned)
        },
      }, React.createElement('span', { dangerouslySetInnerHTML: { __html: PIN_SVG } }))
    }

    function apply(ctx) {
      var styleTag = injectStyles()
      var store = createStore(safeStorage(), window)
      ctx.effect(function () {
        return function () {
          store.dispose()
          if (styleTag && styleTag.parentNode) styleTag.remove()
        }
      }, 'dsh-codex-pins: store')
      ctx.effect(function () {
        return mountSidebar(ctx, store)
      }, 'dsh-codex-pins: sidebar')

      ctx.inject(['slots'], function (scoped) {
        scoped.effect(function () {
          return scoped.slots.inject('conversation.session.header.actions', function () {
            return scoped.slots.register({
              name: 'conversation.session.header.actions',
              id: PLUGIN_ID,
              order: 40,
              inject: function () {
                return {
                  pin: store,
                  lang: function () { return detectLang(ctx) },
                }
              },
            }, HeaderPin)
          })
        }, 'dsh-codex-pins: header pin')
      })

      ctx.inject(['locale'], function (scoped) {
        scoped.effect(function () {
          return scoped.locale.register(LOCALE_NS, COPY)
        }, 'dsh-codex-pins: dictionaries')
      })
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = name
    return module.exports
  },
})
