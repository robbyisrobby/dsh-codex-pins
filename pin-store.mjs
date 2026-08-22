/** Pure pin-list helpers. Browser and tests share this module. */

export const STORAGE_KEY = 'dsh-codex-pins.v1'
export const LEGACY_STORAGE_KEY = 'dsh.session-pin.pinned'
export const MAX_PINS = 50
export const SESSION_ID_RE = /^session-[A-Za-z0-9-]{6,}$/

/**
 * Keep a stable, unique, well-formed session-id list.
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizePins(value) {
  const out = []
  const seen = new Set()
  if (!Array.isArray(value)) return out
  for (const item of value) {
    if (typeof item !== 'string' || !SESSION_ID_RE.test(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
    if (out.length >= MAX_PINS) break
  }
  return out
}

/**
 * Decode this plugin's document or dsh-session-pin's localStorage envelope.
 * @param {unknown} raw
 * @returns {string[]}
 */
export function decodeStoredPins(raw) {
  if (Array.isArray(raw)) return normalizePins(raw)
  if (raw && typeof raw === 'object' && Array.isArray(/** @type {{ pinned?: unknown }} */ (raw).pinned)) {
    return normalizePins(/** @type {{ pinned: unknown }} */ (raw).pinned)
  }
  return []
}

/**
 * Toggle a session in the pinned list. Newest pin goes first (Codex order).
 * @param {string[]} pinned
 * @param {string} sessionId
 * @param {boolean} next
 * @returns {{ pinned: string[], limited: boolean }}
 */
export function setPinned(pinned, sessionId, next) {
  const current = normalizePins(pinned)
  if (!SESSION_ID_RE.test(sessionId)) return { pinned: current, limited: false }
  const has = current.includes(sessionId)
  if (next) {
    if (has) return { pinned: [sessionId, ...current.filter((id) => id !== sessionId)], limited: false }
    if (current.length >= MAX_PINS) return { pinned: current, limited: true }
    return { pinned: [sessionId, ...current], limited: false }
  }
  if (!has) return { pinned: current, limited: false }
  return { pinned: current.filter((id) => id !== sessionId), limited: false }
}

/**
 * Drop ids that are no longer in the live session catalog.
 * @param {string[]} pinned
 * @param {Iterable<string>} liveIds
 * @returns {string[]}
 */
export function prunePins(pinned, liveIds) {
  const live = new Set(liveIds)
  return normalizePins(pinned).filter((id) => live.has(id))
}

/**
 * Map display titles onto session ids. Duplicate titles are kept as arrays.
 * @param {{ ids: string[], byId: Record<string, { displayTitle?: string, title?: string } | undefined> }} list
 * @returns {Map<string, string[]>}
 */
export function titlesToIds(list) {
  const map = new Map()
  for (const id of list.ids) {
    const row = list.byId[id]
    const title = (row?.displayTitle || row?.title || '').trim()
    if (title === '') continue
    const bucket = map.get(title)
    if (bucket) bucket.push(id)
    else map.set(title, [id])
  }
  return map
}

/**
 * Prefer a unique title match; if several share a title, prefer the current session.
 * @param {string} title
 * @param {Map<string, string[]>} byTitle
 * @param {string | undefined} currentId
 * @returns {string | undefined}
 */
export function sessionIdForTitle(title, byTitle, currentId) {
  const ids = byTitle.get(title)
  if (ids === undefined || ids.length === 0) return undefined
  if (ids.length === 1) return ids[0]
  if (currentId && ids.includes(currentId)) return currentId
  return undefined
}

/**
 * Relative time label. `lang` is `zh` or `en`.
 * @param {number | undefined} updatedAt
 * @param {'zh' | 'en'} lang
 * @param {number} [now]
 */
export function formatPinTime(updatedAt, lang, now = Date.now()) {
  if (typeof updatedAt !== 'number' || !(updatedAt > 0)) return ''
  const diff = Math.max(0, now - updatedAt)
  const MIN = 60_000
  const HOUR = 3_600_000
  const DAY = 86_400_000
  if (diff < MIN) return lang === 'zh' ? '刚刚' : 'now'
  if (diff < HOUR) {
    const n = Math.floor(diff / MIN)
    return lang === 'zh' ? `${n}分钟` : `${n}m`
  }
  if (diff < DAY) {
    const n = Math.floor(diff / HOUR)
    return lang === 'zh' ? `${n}小时` : `${n}h`
  }
  if (diff < 30 * DAY) {
    const n = Math.floor(diff / DAY)
    return lang === 'zh' ? `${n}天` : `${n}d`
  }
  if (diff < 365 * DAY) {
    const n = Math.floor(diff / (30 * DAY))
    return lang === 'zh' ? `${n}个月` : `${n}mo`
  }
  const n = Math.floor(diff / (365 * DAY))
  return lang === 'zh' ? `${n}年` : `${n}y`
}
