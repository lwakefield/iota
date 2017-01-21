import {ELEMENT_NODE, TEXT_NODE} from './constants'
import {createElement, getTagName, shallowCloneNode} from './vdom'
import {max, swap} from './util'
import {components} from './component'
import {insertAfter, replaceNode, removeNode, isFormEl, setAttribute} from './dom'

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
        this.patchDirectives(nodeA, nodeB)
        return
      }

      component.update()
      this.patchDirectives(nodeA, nodeB)
    } else if (nodeA.nodeType === TEXT_NODE) {
      nodeA.el.textContent = nodeB.textContent
    } else if (nodeA.nodeType === ELEMENT_NODE) {
      this.patchDirectives(nodeA, nodeB)
      this.patchChildren(nodeA, nodeB)
    }
  }
  patchDirectives(nodeA, nodeB) {
    const directivesA = nodeA.options.directives || {}
    const directivesB = nodeB.options.directives || {}


    for (const key in directivesA) {
      if (!(key in directivesB)) {
        const dirA = directivesA[key]
        dirA.instance.unbind(nodeA.el, dirA)
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
        const oldVal = {name: directivesA[key].name, value: directivesA}
        directive.update(nodeA.el, directivesB[key], oldVal)
      }

      directivesB[key].instance = directive
    }

    nodeA.options.directives = directivesB
  }
  patchChildren(nodeA, nodeB) {
    const childrenA = nodeA.children
    const childrenB = nodeB.children

    const indexed = new Index()
    function index () {
      for (let i = 0; i < childrenA.length; i++) {
        const child = childrenA[i]
        const key = getFullKey(child)
        if (key) {
          indexed.queue(key, child)
        }
      }
    }
    index()

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
