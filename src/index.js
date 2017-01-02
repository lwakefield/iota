const ELEMENT_NODE = 1
const TEXT_NODE = 3

export function vnode (tagName, attributes = {}, children = []) {
  return {tagName, attributes, children, nodeType: ELEMENT_NODE}
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

export function tnode (text) {
  return {textContent: text, nodeType: TEXT_NODE}
}

export function arrToObj (arr, fn) {
  return arr.reduce(
    (result, v) => Object.assign(result, fn(v)),
    {}
  )
}

export class Codegen {
  static codegen (node) {
    return new Function(
      `with (this) return ${Codegen.codegenNode(node)}`
    )
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
    let code = `vnode(${params.join(',')})`

    const attrs = arrToObj(
      Array.from(node.attributes),
      ({name, value}) => ({[name]: value})
    )
    if (attrs['i-if']) {
      code = `${attrs['i-if']} ? ${code} : null`
    }
    if (attrs['i-for' ]) {
      const [, local, from] = attrs['i-for'].match(/(.*) of (.*)/)
      code = `...${from}.map(${local} => ${code})`
    }
    return code
  }
  static codegenAttributes (node) {
    const attrs = Array.from(node.attributes)
      .filter(({name}) => name !== 'i-if' && name !== 'i-for')
      .map(({name, value}) => `${name}: \`${value}\``)
      .join(',')
    return `{${attrs}}`
  }
  static codegenChildren (node) {
    const children = Array.from(node.childNodes).map(Codegen.codegenNode)
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

// TODO: I don't think we need this...
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

export function domToVdom (node) {
  if (node.nodeType === ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase()
    const attrs = arrToObj(
      Array.from(node.attributes),
      ({name, value}) => ({[name]: value})
    )
    const children = Array.from(node.childNodes).map(domToVdom)
    const n = vnode(tagName, attrs, children)
    n.el = node
    return n
  } else if (node.nodeType === TEXT_NODE) {
    const n = tnode(node.textContent)
    n.el = node
    return n
  }

  return null
}

export function observe (obj, fn) {
  return new Proxy(obj, {
    set (target, property, val) {
      target[property] = val instanceof Array || val instanceof Object
        ? observe(val, fn)
        : val
      fn()
      return true
    }
  })
}

export function proxy (ontoObj, val) {
  if (!val) return

  for (let key of Object.keys(val)) {
    Object.defineProperty(ontoObj, key, {
      enumerable: true,
      configurable: true,
      get () {
        return val[key]
      },
      set (newVal) {
        val[key] = newVal
      },
    })
  }
}

export class Component {
  constructor () {
    this.$data = observe({}, this.update.bind(this))
    this.$el = null
    this.props = {}
  }
  mount (el) {
    this.$el = el
    this.patcher = new Patcher(domToVdom(el))
  }
  render () {
    throw new Error('Not implemented')
  }
  update () {
    const rendered = this.render.call(
      Object.assign({vnode, tnode}, this.$data)
    )
    this.patcher.patch(rendered)
  }
}

export function app(el) {
  const component = new Component()
  component.render = Codegen.codegen(el)
  component.mount(el)

  return component
}

export class Patcher {
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
          this.patch(shallowCloneNode(childB), childB)
        }
      } else if (!childA) {
        childB.el = createElement(childB)
        nodeA.el.appendChild(childB.el)
        this.patch(shallowCloneNode(childB), childB)
      } else if (!childB) {
        nodeA.el.removeChild(childA.el)
      }
    }
  }
}
