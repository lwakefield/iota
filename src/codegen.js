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
      code = `...${from}.map((${local}, $index) => ${code})`
    }
    return code
  }
  static codegenAttributes (node) {
    const attrs = Array.from(node.attributes)
      .filter(({name}) =>
        name !== 'i-if' &&
        name !== 'i-for' &&
        !name.match(/^:/)
      )
      .map(({name, value}) => `${name}: \`${value}\``)

    if (node.attributes['i-for'] && !node.attributes['key']) {
      attrs.push('key: $index')
    }

    const propString = Codegen.codegenProps(node)
    if (propString !== '{}') {
      attrs.push(`props: ${Codegen.codegenProps(node)}`)
    }
    return `{${attrs.join(',')}}`
  }
  static codegenProps (node) {
    const props = Array.from(node.attributes)
      .filter(({name}) => name.match(/^:/))
      .map(({name, value}) => `${name.replace(':', '')}: ${value}`)
    return `{${props.join(',')}}`
  }
  static codegenChildren (node) {
    const children = Array.from(node.childNodes).map(Codegen.codegenNode)
    return `[${children.join(',')}]`
  }
}


