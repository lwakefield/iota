import {
  observe,
  proxy,
  arrToObj,
  swap,
  max,
} from './util'

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const components = {}

export function app(el, options = {}) {
  const component = new Component(options)
  component.render = Codegen.codegen(el)
  component.mount(el)
  return component
}

export function registerComponent(component) {
  components[component.name] = component
}

export class Component {
  constructor (options = {}) {
    const {data = {}} = options
    this.$data = observe(data, this.update.bind(this))
    this.$el = null
    this._patcher = null
    this.$props = {}

    proxy(this, this.$data)
  }
  mount (el) {
    this.$el = el
    this._patcher = new Patcher(domToVdom(el))
  }
  setProps(props) {
    this.$props = props
  }
  render () {
    throw new Error('Not implemented')
  }
  update () {
    const rendered = this.render.call(
      Object.assign({vnode, tnode}, this.$data, this)
    )
    this._patcher.patch(rendered)
  }
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
    const props = Array.from(node.attributes)
      .filter(({name}) => name.match(/^:/))
      .map(({name, value}) => `${name.replace(':', '')}: ${value}`)
      .join(',')
    const attrs = Array.from(node.attributes)
      .filter(({name}) =>
        name !== 'i-if' &&
        name !== 'i-for' &&
        !name.match(/^:/)
      )
      .map(({name, value}) => `${name}: \`${value}\``)
    if (props.length) {
      attrs.push(`props: {${props}}`)
    }
    return `{${attrs.join(',')}}`
  }
  static codegenChildren (node) {
    const children = Array.from(node.childNodes).map(Codegen.codegenNode)
    return `[${children.join(',')}]`
  }
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

    const isComponent = node => (
      node.nodeType === ELEMENT_NODE &&
      !!components[node.tagName]
    )
    const getComponent = node => components[node.tagName]

    if (isComponent(nodeB)) {
      if (!nodeB.component) {
        nodeB.component = new (getComponent(nodeB))
        nodeB.component.mount(nodeA.el)
      }
      nodeB.component.update()
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

    // const getKeyed = node => keyed[`${getTagName(node)}.${getKey(node)}`]
    const nodeTypesMatch = (nodeA, nodeB) => {
      return nodeA.nodeType === nodeB.nodeType &&
        getTagName(nodeA) === getTagName(nodeB)
    }
    // replace a with b
    const replaceNode = (a, b) => a !== b && a.parentNode
      && a.parentNode.replaceChild(b, a)
    // insserts b after a
    const insertAfter = (a, b) => a.parentNode
      && a.parentNode.insertBefore(b, a.nextSibling)
    const len = max(childrenA.length, childrenB.length)
    const getFullKey = node => {
      return node && node.attributes && node.attributes.key ?
        `${getTagName(node)}.${node.attributes.key}` :
        null
    }

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

export function getKey (node) {
  if (!node.nodeName) return node.attributes.key || null
  return node._attributes ? node._attributes.key : null
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

