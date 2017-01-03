import {ELEMENT_NODE, TEXT_NODE} from './constants'

export function vnode (tagName, attributes = {}, children = []) {
  return {tagName, attributes, children, nodeType: ELEMENT_NODE}
}

export function tnode (text) {
  return {textContent: text, nodeType: TEXT_NODE}
}

export function shallowCloneNode (node) {
  const {tagName, attributes, el, textContent, nodeType} = node
  if (node.nodeType === ELEMENT_NODE) {
    return Object.assign({}, {tagName, attributes, el, nodeType, children: []})
  } else if (node.nodeType === TEXT_NODE) {
    return Object.assign({}, {textContent, nodeType, el})
  }
  return null
}

export function getTagName (node) {
  return node.tagName
    ? node.tagName.toLowerCase()
    : null
}

export function createElement (node) {
  if (node.nodeType === ELEMENT_NODE) {
    const el = document.createElement(node.tagName)
    const attrs = node.attributes
    for (const key in attrs) {
      el.setAttribute(key, attrs[key])
    }
    return el
  } else if (node.nodeType === TEXT_NODE) {
    return document.createTextNode(node.textContent)
  }
  return null
}
