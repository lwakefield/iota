import {ELEMENT_NODE, TEXT_NODE} from './constants'
import {createElement, getTagName, shallowCloneNode} from './vdom'
import {max, swap} from './util'
import {components} from './component'
import {insertAfter, replaceNode, removeNode, isFormEl} from './dom'

const isComponent = node => (
  node &&
  node.nodeType === ELEMENT_NODE &&
  !!components[node.tagName]
)
const getComponent = node => components[node.tagName]
const getFullKey = node => {
  const hasKey = node && node.options && node.options.key !== undefined
  if (!hasKey && isComponent(node)) {
    return node.tagName
  }
  return hasKey ?
    `${getTagName(node)}.${node.options.key}` :
    null
}
const nodeTypesMatch = (nodeA, nodeB) => {
  return nodeA && nodeB &&
    nodeA.nodeType === nodeB.nodeType &&
    getTagName(nodeA) === getTagName(nodeB)
}

export default class Patcher {
  // Patches nodeB onto nodeA
  constructor (nodeA) {
    this.nodeA = nodeA
  }
  patch(nodeA, nodeB) {
    if (arguments.length === 1) {
      this.patch(this.nodeA, nodeA)
      return
    }

    // We expect nodeA and nodeB to be of the same type
    if (nodeA.nodeType !== nodeB.nodeType) {
      throw new Error('expected nodes to have the same type')
    }

    if (isComponent(nodeB)) {
      nodeA.component = nodeA.component || new (getComponent(nodeB))
      const component = nodeA.component
      component.setProps(nodeB.options.props || {})

      if (!component.$el) {
        component.mount(nodeA.el)
        nodeA.el = component.$el
        this.patchAttributes(nodeA, nodeB)
        return
      }

      component.update()
      this.patchEvents(nodeA, nodeB)
      this.patchAttributes(nodeA, nodeB)
    } else if (nodeA.nodeType === TEXT_NODE) {
      nodeA.el.textContent = nodeB.textContent
    } else if (nodeA.nodeType === ELEMENT_NODE) {
      this.patchEvents(nodeA, nodeB)
      this.patchAttributes(nodeA, nodeB)
      this.patchChildren(nodeA, nodeB)
    }
  }
  patchAttributes(nodeA, nodeB) {
    const attrsA = nodeA.options.attributes || {}
    const attrsB = nodeB.options.attributes || {}

    for (const key in attrsA) {
      if (!(key in attrsB)) {
        nodeA.el.removeAttribute(key)
      }
    }
    for (const key in attrsB) {
      if (attrsA[key] != attrsB[key]) {
        if (key === 'value' && isFormEl(nodeA.el)) {
          nodeA.el.value = attrsB.value
        }
        nodeA.el.setAttribute(key, attrsB[key])
      }
    }

    nodeA.options.attributes = nodeB.options.attributes
  }
  patchEvents(nodeA, nodeB) {
    const eventsA = nodeA.options.events || {}
    const eventsB = nodeB.options.events || {}

    for (const key in eventsA) {
      if (!eventsB[key]) {
        nodeA.el.removeEventListener(key, eventsA[key].listener)
        delete eventsA[key]
      }
    }
    for (const key in eventsB) {
      if (!eventsA[key] || !eventsA[key].listener) {
        const container = {}
        container.listener = ($event) => {
          const result = container.handler($event)
          if (result instanceof Function) {
            result($event)
          }
        }
        nodeA.el.addEventListener(key, container.listener)
        eventsA[key] = container
      }

      eventsA[key].handler = eventsB[key]
    }

    nodeA.options.events = eventsA
  }
  patchChildren(nodeA, nodeB) {
    const childrenA = nodeA.children
    const childrenB = nodeB.children

    const len = max(childrenA.length, childrenB.length)

    const indexed = new Index()
    for (let i = 0; i < childrenA.length; i++) {
      const child = childrenA[i]
      const key = getFullKey(child)
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
      } else if (childB && (keyA || !nodeTypesMatch(childA, childB))) {
        // We might want to use childA at a later point in time...
        const newChildA = shallowCloneNode(childB)
        newChildA.el = createElement(childB)
        childA && replaceNode(childA.el, newChildA.el)
        return newChildA
      } else if (!childB) {
        removeNode(childA.el)
        return undefined
      }
      return childA
    }

    for (let i = 0; i < len; i++) {
      childrenA[i] = reconcile(childrenA[i], childrenB[i])
      const [childA, childB] = [childrenA[i], childrenB[i]]

      if (!childA && childB) throw new Error('could not reconcile nodeA')

      if (childA && !childA.el) {
        childA.el = createElement(childA)
      }
      if (childA && childA.el && !childA.el.parentNode) {
        if (i > 0) {
          // This happens when we remove a keyed node earlier in the loop
          // ie. case 2 in reconcile
          insertAfter(childrenA[i - 1].el, childA.el)
        } else {
          // This happens if childA did not exist initially, we have reconciled,
          // but not added it to the dom yet
          nodeA.el.appendChild(childA.el)
        }
      }

      childA && this.patch(childA, childB)
    }

    nodeA.children = childrenA.slice(0, childrenB.length)
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
    return (this.index[key] || [])[0] || null
  }
  dequeue (key) {
    if (!(key in this.index)) return null
    if (this.index[key].length) this.size--
    return this.index[key].shift() || null
  }
}
