import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// OLD: import { twMerge } from 'tailwind-merge' — the plain merger didn't know our custom font sizes
// (text-dbe-head/-body/-meta, tailwind.config.js), read them as text COLORS and dropped them whenever
// a real color (text-slate-200…) followed. Register them as font sizes.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['dbe-head', 'dbe-h1', 'dbe-h2', 'dbe-h3', 'dbe-body', 'dbe-meta', 'ui-title', 'ui-heading', 'ui-body', 'ui-small', 'ui-micro'] }] } },
})

export const cn = (...inputs) => {
    return twMerge(clsx(inputs))
  }

// Assurance API doc §14: 404/409/422 carry an actionable `msg` to show as-is, but a 500 should
// only ever show a generic message. `res` is what Api.* resolves with (it never rejects on an
// HTTP error status — see utils/api.js).
export const getApiErrorMessage = (res) => {
    if (res?.status >= 500) return 'Something went wrong, please retry.'
    return res?.data?.msg || `Request failed (status ${res?.status ?? 'unknown'}).`
}

// Global default database (Custom Query → DB Config, Admin-set). GET /querybuilder/getDatabase
// marks at most one item with is_default: true. Every database dropdown uses these two so the
// default is found and labelled the same way everywhere.
export const getDefaultDb = (databaseList) => (databaseList || []).find((db) => db?.is_default) || null
export const dbOptionLabel = (db) => (db?.is_default ? `${db.label} (Default)` : db?.label)

// react-hook-form `validate` rule for fields the backend requires to be whole numbers
// (e.g. frequency must be an int — a decimal would otherwise only fail later as a backend 422).
// Blank passes so `required` stays responsible for emptiness; a valueAsNumber blank (NaN) fails.
export const wholeNumber = (v) =>
    v === '' || v === undefined || v === null || Number.isInteger(Number(v)) || 'Must be a whole number'
// Copies text to the clipboard; resolves true/false. `navigator.clipboard` only exists on a
// secure page (https or localhost) — on a plain-http deployment (e.g. http://dyserver2:5173)
// it's undefined and copy silently did nothing, so this falls back to a hidden textarea +
// execCommand('copy'), which still works there.
export const copyToClipboard = async (text) => {
  const value = String(text ?? '')
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // fall through to the legacy path
    }
  }
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok
}
