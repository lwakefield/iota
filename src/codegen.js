import {TEXT_NODE, ELEMENT_NODE} from './constants'
import {arrToObj} from './util'

export function codegen (node) {
  return new Function(
    `with (this) return ${codegenNode(node)}`
  )
}

export function codegenNode (node) {
  if (node.nodeType === TEXT_NODE) {
    return codegenTextNode(node)
  } else if (node.nodeType === ELEMENT_NODE) {
    return codegenElementNode(node)
  }
  return null
}

export function codegenTextNode (node) {
  const text = node.textContent
  return `tnode(\`${text}\`)`
}

export function codegenElementNode (node) {
  const params = [
    `'${node.tagName.toLowerCase()}'`,
    codegenOptions(node),
    codegenChildren(node)
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

export function codegenOptions (node) {
  const [attrs, props, events] = [[], [], []]
  let key = null

  for (const {name, value} of Array.from(node.attributes)) {
    if (name === 'i-for' || name === 'i-if') continue

    if (name === 'key') {
      key = `key: \`${value}\``
    } else if (name[0] === ':') {
      props.push(`${name.split(1)}: \`${value}\``)
    } else if (name[0] === '@') {
      events.push(`${name.split(1)}: \`${value}\``)
    } else {
      attrs.push(`${name}: \`${value}\``)
    }
  }

  if (node.attributes['i-for'] && !node.attributes['key']) {
    key = 'key: $index'
  }

  const toAdd = []
  key && toAdd.push(key)
  attrs.length && toAdd.push(`attributes: {${attrs.join(',')}}`)
  props.length && toAdd.push(`props: {${props.join(',')}}`)
  events.length && toAdd.push(`events: {${events.join(',')}}`)

  return `{${toAdd.join(',')}}`
}

export function codegenAttributes (node) {
  const attrs = Array.from(node.attributes)
    .filter(({name}) =>
      name !== 'i-if' &&
      name !== 'i-for' &&
      !name.match(/^:/) &&
      !name.match(/^@/)
    )
    .map(({name, value}) => `${name}: \`${value}\``)

  if (node.attributes['i-for'] && !node.attributes['key']) {
    attrs.push('key: $index')
  }

  const propString = codegenProps(node)
  if (propString !== '{}') {
    attrs.push(`props: ${codegenProps(node)}`)
  }
  return `{${attrs.join(',')}}`
}

export function codegenProps (node) {
  const props = Array.from(node.attributes)
    .filter(({name}) => name.match(/^:/))
    .map(({name, value}) => `${name.replace(':', '')}: ${value}`)
  return `{${props.join(',')}}`
}

export function codegenEvents (node) {
  const props = Array.from(node.attributes)
    .filter(({name}) => name.match(/^@/))
    .map(({name, value}) => `${name.replace('@', '')}: ${value}`)
  return `{${props.join(',')}}`
}

export function codegenChildren (node) {
  const children = Array.from(node.childNodes).map(codegenNode)
  return `[${children.join(',')}]`
}
