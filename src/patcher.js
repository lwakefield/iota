import {ELEMENT_NODE, TEXT_NODE} from './constants'
import {createElement, getTagName, shallowCloneNode} from './vdom'
import {swap} from './util'
import Component from './component'
import {insertAfter, replaceNode, removeNode} from './dom'

const nodeTypesMatch = (nodeA, nodeB) => {
  return nodeA && nodeB &&
    nodeA.nodeType === nodeB.nodeType &&
    getTagName(nodeA) === getTagName(nodeB)
}

export default class Patcher {
  // Patches nodeB onto nodeA
  constructor (nodeA, registeredComponents = {}) {
    this.nodeA = nodeA
    this.registeredComponents = Object.assign(
      {},
      registeredComponents,
      Component.registeredComponents
    )
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

    if (this.getComponentConstructor(nodeB)) {
      if (!nodeA.component) {
        nodeA.component = this.newComponent(nodeB)
        nodeA.component.mount(nodeA.el)
        nodeA.el = nodeA.component.$el
      } else {
        nodeA.component.setProps(nodeB.options.props || {})
      }

      this.patchDirectives(nodeA, nodeB)
    } else if (nodeA.nodeType === TEXT_NODE) {
      nodeA.el.textContent = nodeB.textContent
    } else if (nodeA.nodeType === ELEMENT_NODE) {
      this.patchDirectives(nodeA, nodeB)
      this.patchChildren(nodeA, nodeB)
    }
  }
  newComponent (node) {
    const constructor = this.getComponentConstructor(node)
    const options = {props: node.options.props}
    return new constructor(options)
  }
  getComponentConstructor (node) {
    return node &&
      node.nodeType === ELEMENT_NODE &&
      this.registeredComponents[node.tagName] || null
  }
  patchDirectives(nodeA, nodeB) {
    const directivesA = nodeA.options.directives || {}
    const directivesB = nodeB.options.directives || {}

    for (const key in directivesA) {
      if (!(key in directivesB)) {
        const dirA = directivesA[key]
        const oldVal = {
          oldName: dirA.name,
          oldValue: dirA.value
        }
        dirA.instance.unbind(nodeA.el, oldVal)
      }
    }
    for (const key in directivesB) {
      const isBound = directivesA[key] && directivesA[key].instance
      const directive = isBound ?
        directivesA[key].instance :
        new (directivesB[key].constructor)

      if (!isBound) {
        directive.bind(nodeA.el, directivesB[key])
      } else {
        const oldVal = {oldName: directivesA[key].name, oldValue: directivesA[key].value}
        const newVal = {name: key, value: directivesB[key].value}
        directive.update(nodeA.el, newVal, oldVal)
      }

      directivesB[key].instance = directive
    }

    nodeA.options.directives = directivesB
  }
  patchChildren(nodeA, nodeB) {
    const childrenA = nodeA.children
    const childrenB = nodeB.children

    const indexed = new Index()
    const index = () => {
      for (let i = 0; i < childrenA.length; i++) {
        const child = childrenA[i]
        const key = this.getFullKey(child)
        if (key) {
          indexed.queue(key, child)
        }
      }
    }
    index()

    const reconcile = (childA, childB) => {
      const [keyA, keyB] = [this.getFullKey(childA), this.getFullKey(childB)]
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

    let [indexA, indexB] = [0, 0]
    const [lenA, lenB] = [childrenA.length, childrenB.length]
    function next () {
      indexA++
      indexB++
      while (indexB < lenB && !childrenB[indexB]) indexB++
    }

    const newChildrenA = []

    while (indexA < lenA || indexB < lenB) {
      const childB = childrenB[indexB]
      const childA = reconcile(childrenA[indexA], childB)
      childA && newChildrenA.push(childA)

      if (!childA && childB) throw new Error('could not reconcile nodeA')

      if (childA && !childA.el) {
        childA.el = createElement(childA)
      }
      if (childA && childA.el && !childA.el.parentNode) {
        if (indexA > 0) {
          // This happens when we remove a keyed node earlier in the loop
          // ie. case 2 in reconcile
          insertAfter(newChildrenA[indexA - 1].el, childA.el)
        } else {
          // This happens if childA did not exist initially, we have reconciled,
          // but not added it to the dom yet
          nodeA.el.appendChild(childA.el)
        }
      }

      childA && this.patch(childA, childB)
      next()
    }

    nodeA.children = newChildrenA
  }
  getFullKey (node) {
    const hasKey = node && node.options && node.options.key !== undefined
    if (!hasKey && this.getComponentConstructor(node)) {
      return node.tagName
    }
    return hasKey ?
      `${getTagName(node)}.${node.options.key}` :
      null
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
