import {
  TEXT_NODE,
  ELEMENT_NODE,
} from './constants'
import {arrToObj} from './util'
import {isFormEl, isBoolAttr} from './dom'
import {tnode, vnode} from './vdom'
import {
  attr,
  event,
  directives as globalDirectives
} from './directives'

export function codegen (node) {
  const code = codegenNode(node)
  return sandbox(
    code,
    Object.assign({}, {tnode, vnode, attr, event, loop}, globalDirectives)
  )
}

// TODO: move this to util
export function sandbox(code, globals) {
  const keys = Object.keys(globals)
  const values = keys.map(k => globals[k])
  const sandbox = new Function(
    ...keys,
    `with (this) return ${code}`
  )

  return function sandboxed () {
    return sandbox.call(this, ...values)
  }
}

function loop (arr, fn) {
  const len = arr.length
  const result = new Array(len)
  for (let i = 0; i < len; i++) {
    result[i] = fn(arr[i], i)
  }
  return result
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
    code = `...loop(${from}, (${local}, $index) => ${code})`
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
        `event('${name.substr(1)}', $event => {
          const res = ${value}
          return res instanceof Function ? res.call(this, $event) : res
        })`
      )
    } else if (globalDirectives[name]) {
      const directiveConstructor = globalDirectives[name].name
      addDirective(
        name,
        `{name: '${name}', value: ${value || undefined}, constructor: ${directiveConstructor}}`
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
