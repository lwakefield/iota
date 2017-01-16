import {FORM_ELS, BOOLEAN_ATTRS} from './constants'
// replace a with b
export const replaceNode = (a, b) => a && b && a !== b &&
  a.parentNode && a.parentNode.replaceChild(b, a)
// insserts b after a
export const insertAfter = (a, b) => a.parentNode
  && a.parentNode.insertBefore(b, a.nextSibling)
export const removeNode = (a) => a.parentNode
  && a.parentNode.removeChild(a)

const FORM_EL_REGEX = new RegExp(FORM_ELS.join('|'))
export const isFormEl = node => FORM_EL_REGEX.test(node.tagName.toLowerCase())
export const isBoolAttr = name => BOOLEAN_ATTRS.indexOf(name) !== -1

export function setAttribute (el, name, value) {
  if (isBoolAttr(name) && (value === 'false' || !value)) {
    el.removeAttribute(name)
  } else {
    el.setAttribute(name, value)
  }
}
