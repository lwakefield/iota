const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8

export function cnode (tagName, props = {}) {
}

export function vnode (tagName, attributes = {}, children = []) {
  return { tagName, attributes, children }
}

export function tnode (text) {
  return text
}

export class Codegen {
  static codegen (node) {
    return `with (this) return ${codegenNode(node)}`
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
