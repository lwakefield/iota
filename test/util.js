import {expect} from 'chai'

import {ELEMENT_NODE, TEXT_NODE} from '../src/constants'
import {arrToObj} from '../src/util'
import {vnode, tnode} from '../src/vdom'

export const normalize = s => s.split('\n')
  .map(v => v.trim())
  .filter(v => !!v)
  .join('')

export function assertCodeIsEqual(codeA, codeB) {
  expect(normalize(codeA)).to.eql(normalize(codeB))
}

export function assertHtmlIsEqual(nodeA, nodeB) {
  assertCodeIsEqual(
    typeof nodeA === 'string' ? nodeA.trim() : nodeA.outerHTML,
    typeof nodeB === 'string' ? nodeB.trim() : nodeB.outerHTML
  )
}

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
    const attributes = arrToObj(
      Array.from(node.attributes),
      ({name, value}) => ({[name]: value})
    )
    const options = {attributes}
    // TODO make this more obvious in tests
    if (attributes.key) {
      node.removeAttribute('key')
      options.key = attributes.key
      delete attributes.key
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

export const mockOnClass = (cls, prop, mock) => {
  // have we already mocked it?
  if (!cls.prototype[`_${prop}`]) {
    cls.prototype[`_${prop}`] = cls.prototype[prop]
  }
  cls.prototype[prop] = mock
}
export const unmockOnClass = (cls, prop) => {
  cls.prototype[prop] = cls.prototype[`_${prop}`]
  cls.prototype[`_${prop}`] = undefined
}
