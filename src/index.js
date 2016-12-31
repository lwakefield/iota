const ELEMENT_NODE = 1
const TEXT_NODE = 3

export function vnode (tagName, attributes = {}, children = []) {
  return {tagName, attributes, children, nodeType: ELEMENT_NODE}
}

export function tnode (text) {
  return {textContent: text, nodeType: TEXT_NODE}
}

export class Codegen {
  static codegen (node) {
    return `with (this) return ${Codegen.codegenNode(node)}`
  }
  static codegenNode (node) {
    if (node.nodeType === TEXT_NODE) {
      return Codegen.codegenTextNode(node)
    } else if (node.nodeType === ELEMENT_NODE) {
      return Codegen.codegenElementNode(node)
    }
    return null
  }
  static codegenTextNode (node) {
    const text = node.textContent
    return `tnode(\`${text}\`)`
  }
  static codegenElementNode (node) {
    const params = [
      `'${node.tagName.toLowerCase()}'`,
      Codegen.codegenAttributes(node),
      Codegen.codegenChildren(node)
    ]
    return `vnode(${params.join(',')})`
  }
  static codegenAttributes (node) {
    const attrs = Array.from(node.attributes)
      .map(({name, value}) => `${name}: \`${value}\``)
      .join(',')
    return `{${attrs}}`
  }
  static codegenChildren (node) {
    const children =  Array.from(node.childNodes).map(Codegen.codegenNode)
    return `[${children.join(',')}]`
  }
}

export function getKey (node) {
  if (!node.nodeName) return node.attributes.key || null
  return node._attributes ? node._attributes.key : null
}

export function getTagName (node) {
  return node.tagName
    ? (
      node.nodeName && node._component ?
      node._component.constructor.name :
      node.tagName
    ).toLowerCase()
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
  dequeue (key) {
    if (!(key in this.index)) return null
    if (this.index[key].length) this.size--
    return this.index[key].shift() || null
  }
}

export function mount(node) {
  const index = new Index()

  function _mount(node) {
    node.el = node.el || createElement(node)
    const key = node.attributes ? node.attributes.key : null
    if (key) {
      const tagName = getTagName(node)
      index.queue(`${tagName}.${key}`, node)
    }

    const len = node.children ? node.children.length : 0
    for (let i = 0; i < len; i++) {
      const child = node.children[i]
      _mount(child)
      node.el.appendChild(child.el)
    }
    return node
  }

  return [_mount(node), index]
}


export class Patcher {
  // Patches nodeB onto nodeA
  constructor (nodeA, nodeB) {
    this.startNodeA = nodeA
    this.startNodeB = nodeB
  }
  patch(nodeA = this.startNodeA, nodeB = this.startNodeB) {
    // We expect nodeA and nodeB to be of the same type
    if (nodeA.nodeType !== nodeB.nodeType) {
      throw new Error('expected nodes to have the same type')
    }
    nodeB.el = nodeB.el || nodeA.el

    if (nodeA.nodeType === TEXT_NODE) {
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

    // const getKeyed = node => keyed[`${getTagName(node)}.${getKey(node)}`]
    const nodeTypesMatch = (nodeA, nodeB) => {
      return nodeA.nodeType === nodeB.nodeType &&
        getTagName(nodeA) === getTagName(nodeB)
    }

    const max = (a,b) => a > b ? a : b
    // replace a with b
    const replaceNode = (a, b) => a.parentNode
      && a.parentNode.replaceChild(b, a)
    const len = max(childrenA.length, childrenB.length)

    for (let i = 0; i < len; i++) {
      const childA = childrenA[i]
      const childB = childrenB[i]

      if (childA && childB) {
        if (nodeTypesMatch(childA, childB)) {
          this.patch(childA, childB)
        } else {
          childB.el = createElement(childB)
          replaceNode(childA.el, childB.el)
          this.patch(childB, childB)
        }
      } else if (!childA) {
        childB.el = createElement(childB)
        nodeA.el.appendChild(childB.el)
        this.patch(childB, childB)
      } else if (!childB) {
        nodeA.el.removeChild(childA.el)
      }
    }
  }
}
