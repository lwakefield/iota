import {TEXT_NODE, ELEMENT_NODE} from './constants'
import {arrToObj} from './util'

export default class Codegen {
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


