# dsh-codex-pins

English | [中文](README.zh.md)

Codex-style **pinned sessions** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The sidebar splits into two panes — **Pinned** and **Recents** — each with its own heading and scroll. Pinned chats do not repeat in Recents.

```
┌─ sidebar ─────────────────────┐
│  New session                  │
│                               │
│  Pinned                       │
│    📌 Fix login flow      3h  │
│    📌 Weekly review       2d  │
│  ───────────────────────────  │
│  Recents                      │
│    other sessions…            │
└───────────────────────────────┘
```

## Install

```sh
dsh plugin --profile web add github:robbyisrobby/dsh-codex-pins
dsh plugin --profile desktop add github:robbyisrobby/dsh-codex-pins
```

Restart DeepSeek Harness (or DSH Desktop), then:

1. Hover a session row and click the pin.
2. Or open a session and click the pin in the conversation header.
3. The sidebar shows **Pinned** on top and **Recents** below. Click a pinned row to open it; click the pin again to move it back to Recents.

## Why this plugin

Community pin plugins either reorder rows inside a workspace or hide the list behind a footer panel. Codex (and ChatGPT) keep Pinned and Recents as two separate panes. That is the whole product.

## Behaviour

- Newest pin is listed first.
- Pins persist in `localStorage` (`dsh-codex-pins.v1`), per browser origin.
- If you previously used `dsh-session-pin`, existing local pins are imported once.
- At most 50 pins. Stale ids are dropped when the session catalog is ready.
- UI-only: no model traffic, no host HTTP routes, no session-log reads, no install scripts.

## Uninstall

```sh
dsh plugin --profile desktop remove dsh-codex-pins
dsh plugin --profile web remove dsh-codex-pins
```

## License

MIT
