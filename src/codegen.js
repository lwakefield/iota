import {
  TEXT_NODE,
  ELEMENT_NODE,
} from './constants'
import {arrToObj} from './util'
import {isFormEl, isBoolAttr} from './dom'
import {tnode, vnode} from './vdom'
import {attr, event} from './directives'

export function codegen (node) {
  const renderFn = new Function(
    'tnode', 'vnode', 'attr', 'event', 'scope',
    `with (this) return ${codegenNode(node)}`
  )
  return renderFn.bind(this, tnode, vnode, attr, event)
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
  const props = []
  const directives = []
  let key = null

  function addDirective (key, val) {
    directives.push(`${key}: ${val}`)
  }

  if (isFormEl(node)) {
    if (/\${.*}/.test(node.getAttribute('value'))) {
      const pointer = node.getAttribute('value').match(/\${(.*)}/)[1]
      addDirective(
        '__formBinding',
        `event('input', $event => ${pointer} = $event.target.value)`
      )
    } else if (/\${.*}/.test(node.getAttribute('checked'))) {
      const pointer = node.getAttribute('checked').match(/\${(.*)}/)[1]
      addDirective(
        '__formBinding',
        `event('change', $event => ${pointer} = $event.target.checked)`
      )
    }
  }

  for (const {name, value} of Array.from(node.attributes)) {
    if (name === 'i-for' || name === 'i-if') continue

    if (name === 'key') {
      key = `key: \`${value}\``
    } else if (name[0] === ':') {
      props.push(`${name.substr(1)}: ${value}`)
    } else if (name[0] === '@') {
      addDirective(
        `'${name}'`,
        `event('${name.substr(1)}', $event => ${value})`
      )
    } else if (isBoolAttr(name) && value === '') {
      addDirective(
        name,
        `attr('${name}', true)`
      )
    } else {
      addDirective(
        name,
        `attr('${name}', \`${value}\`)`
      )
    }
  }

  if (node.attributes['i-for'] && !node.attributes['key']) {
    key = 'key: $index'
  }

  const toAdd = []
  key && toAdd.push(key)
  directives.length && toAdd.push(`directives: {${directives.join(',')}}`)
  props.length && toAdd.push(`props: {${props.join(',')}}`)

  return `{${toAdd.join(',')}}`
}

export function codegenChildren (node) {
  const children = Array.from(node.childNodes).map(codegenNode).filter(v => !!v)
  return `[${children.join(',')}]`
}
