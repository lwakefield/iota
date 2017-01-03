import {ELEMENT_NODE, TEXT_NODE} from './constants'
import {createElement, getTagName, shallowCloneNode} from './vdom'
import {max, swap} from './util'
import {components} from './component'

const isComponent = node => (
  node.nodeType === ELEMENT_NODE &&
  !!components[node.tagName]
)
const getComponent = node => components[node.tagName]
// replace a with b
const replaceNode = (a, b) => a !== b && a.parentNode
  && a.parentNode.replaceChild(b, a)
// insserts b after a
const insertAfter = (a, b) => a.parentNode
  && a.parentNode.insertBefore(b, a.nextSibling)
const getFullKey = node => {
  return node && node.attributes && node.attributes.key ?
    `${getTagName(node)}.${node.attributes.key}` :
    null
}

export default class Patcher {
  // Patches nodeB onto nodeA
  constructor (nodeA) {
    this.lastNodeA = nodeA
  }
  patch(nodeA, nodeB) {
    if (arguments.length === 1) {
      this.patch(this.lastNodeA, nodeA)
      this.lastNodeA = nodeA
      return
    }

    // We expect nodeA and nodeB to be of the same type
    if (nodeA.nodeType !== nodeB.nodeType) {
      throw new Error('expected nodes to have the same type')
    }
    nodeB.el = nodeB.el || nodeA.el

    if (isComponent(nodeB)) {
      nodeB.component = nodeA.component || new (getComponent(nodeB))
      const component = nodeB.component
      !component.$el && component.mount(nodeA.el)

      component.setProps(nodeB.attributes.props || {})
      component.update()
      this.patchAttributes(nodeA, nodeB)
    } else if (nodeA.nodeType === TEXT_NODE) {
      nodeA.el.textContent = nodeB.textContent
    } else if (nodeA.nodeType === ELEMENT_NODE) {
      this.patchAttributes(nodeA, nodeB)
      this.patchChildren(nodeA, nodeB)
    }
  }
  patchAttributes(nodeA, nodeB) {
    // We expect nodeA to have already been mounted
    const attrsA = nodeA.attributes
    const attrsB = nodeB.attributes

    const keys = new Set([...Object.keys(attrsA), ...Object.keys(attrsB)])
    for (const key of keys) {
      if (key in attrsA && !(key in attrsB)) {
        nodeA.el.removeAttribute(key)
      } else if (attrsA[key] !== attrsB[key]) {
        nodeA.el.setAttribute(key, attrsB[key])
      }
    }

    nodeA.attributes = nodeB.attributes
  }
  patchChildren(nodeA, nodeB) {
    const childrenA = nodeA.children
    const childrenB = nodeB.children

    const nodeTypesMatch = (nodeA, nodeB) => {
      return nodeA.nodeType === nodeB.nodeType &&
        getTagName(nodeA) === getTagName(nodeB)
    }
    const len = max(childrenA.length, childrenB.length)

    const indexed = new Index()
    for (let i = 0; i < childrenA.length; i++) {
      const child = childrenA[i]
      const key = child.component ?
        child.component.constructor.name :
        getFullKey(child)
      if (key) {
        indexed.queue(key, child)
      }
    }

    function reconcile (childA, childB) {
      const [keyA, keyB] = [getFullKey(childA), getFullKey(childB)]
      const keyedChildA = indexed.dequeue(keyB)
      if (keyedChildA) {
        swap(childrenA, childA, keyedChildA)
        childA && replaceNode(childA.el, keyedChildA.el)
        return keyedChildA
      } else if (keyA && childB) {
        // We might want to use childA at a later point in time...
        childB.el = createElement(childB)
        replaceNode(childA.el, childB.el)
        return childB
      }
      return childA
    }

    for (let i = 0; i < len; i++) {
      let childA = childrenA[i]
      const childB = childrenB[i]

      childA = reconcile(childA, childB)

      if (i > 0 && childA && childA.el && !childA.el.parentNode) {
        // This happens when we remove a keyed node earlier in the loop
        // ie. case 2 in reconcile
        insertAfter(childrenA[i - 1].el, childA.el)
      }

      if (childA && childB) {
        if (nodeTypesMatch(childA, childB)) {
          childB.el = childB.el || childA.el
          this.patch(childA, childB)
        } else {
          childB.el = createElement(childB)
          replaceNode(childA.el, childB.el)
          this.patch(shallowCloneNode(childB), childB)
        }
      } else if (!childA) {
        childB.el = createElement(childB)
        nodeA.el.appendChild(childB.el)
        this.patch(shallowCloneNode(childB), childB)
      } else if (!childB) {
        nodeA.el.removeChild(childA.el)
      }

      childrenA[i] = childB
    }
  }
}

export class Index {
  constructor () {
    this.index = {}
    this.size = 0
  }
  queue (key, val) {
    if (!(key in this.index)) {
      this.index[key] = []
    }
    this.index[key].push(val)
    this.size++
  }
  peek (key) {
    return this.index[key]
  }
  dequeue (key) {
    if (!(key in this.index)) return null
    if (this.index[key].length) this.size--
    return this.index[key].shift() || null
  }
}
