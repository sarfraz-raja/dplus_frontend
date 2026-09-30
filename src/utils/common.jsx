import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

// react-hook-form `validate` rule for fields the backend requires to be whole numbers
// (e.g. frequency must be an int — a decimal would otherwise only fail later as a backend 422).
// Blank passes so `required` stays responsible for emptiness; a valueAsNumber blank (NaN) fails.
export const wholeNumber = (v) =>
    v === '' || v === undefined || v === null || Number.isInteger(Number(v)) || 'Must be a whole number'