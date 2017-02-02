/* eslint-env jest */
import {ELEMENT_NODE, TEXT_NODE} from '../../src/constants'
import {arrToObj} from '../../src/util'
import {vnode, tnode} from '../../src/vdom'
import {attr} from '../../src/directives'

export const normalize = s => s.split('\n')
  .map(v => v.trim())
  .filter(v => !!v)
  .join('')

export function htoe(html) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = normalize(html)
  return wrapper.firstChild
}

export function htov(html) {
  return dtov(htoe(html))
}

export function dtov (node) {
  if (node.nodeType === ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase()
    const directives = arrToObj(
      Array.from(node.attributes),
      ({name, value}) => {
        const result = {[name]: attr(name, value)}
        result[name].instance = new (result[name].constructor)
        return result
      }
    )

    const options = {directives}
    // TODO make this more obvious in tests
    if (directives.key) {
      options.key = node.getAttribute('key')
      node.removeAttribute('key')
    }
    const children = Array.from(node.childNodes).map(dtov)
    const n = vnode(tagName, options, children)
    n.el = node
    return n
  } else if (node.nodeType === TEXT_NODE) {
    const n = tnode(node.textContent)
    n.el = node
    return n
  }

  return null
}

export function stub(obj, keys) {
  (keys instanceof Array ? keys : [keys])
    .forEach(k => mock(obj, k, jest.fn()))
}
export function unstub(obj, keys) {
  (keys instanceof Array ? keys : [keys])
    .forEach(k => unmock(obj, k))
}

export function spy(obj, keys) {
  (keys instanceof Array ? keys : [keys])
    .forEach(k => mock(obj, k, jest.fn(obj[k])))
}
export const unspy = unstub

export function mock(obj, key, fn) {
  if (!obj[`_${key}`]) {
    obj[`_${key}`] = obj[key]
  }

  obj[key] = fn
}

export function unmock(obj, key) {
  obj[key] = obj[`_${key}`]
  delete obj[`_${key}`]
}
