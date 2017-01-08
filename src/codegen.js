import {
  TEXT_NODE,
  ELEMENT_NODE,
  FORM_ELS,
} from './constants'
import {arrToObj} from './util'

const FORM_EL_REGEX = new RegExp(FORM_ELS.join('|'))
const isFormEl = node => FORM_EL_REGEX.test(node.tagName.toLowerCase())

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
      props.push(`${name.substr(1)}: ${value}`)
    } else if (name[0] === '@') {
      events.push(`${name.substr(1)}: $event => ${value}`)
    } else {
      attrs.push(`${name}: \`${value}\``)
    }
  }

  if (node.attributes['i-for'] && !node.attributes['key']) {
    key = 'key: $index'
  }
  if (isFormEl(node) && /\${.*}/.test(node.getAttribute('value'))) {
    const pointer = node.getAttribute('value').match(/\${(.*)}/)[1]
    events.push(`input: $event => ${pointer} = $event.target.value`)
  }

  const toAdd = []
  key && toAdd.push(key)
  attrs.length && toAdd.push(`attributes: {${attrs.join(',')}}`)
  props.length && toAdd.push(`props: {${props.join(',')}}`)
  events.length && toAdd.push(`events: {${events.join(',')}}`)

  return `{${toAdd.join(',')}}`
}

export function codegenChildren (node) {
  const children = Array.from(node.childNodes).map(codegenNode)
  return `[${children.join(',')}]`
}
