/**
 * Host half of dsh-codex-pins.
 *
 * Pin state lives in the browser (localStorage). The host entry exists so the
 * official bundle loader can compose the plugin; it does not open network
 * ports, spawn processes, or read session logs.
 */
export const name = 'dsh-codex-pins'

/** @param {unknown} [_ctx] */
export function apply(_ctx) {}
