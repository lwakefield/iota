import {codegen} from './codegen'
import {Component} from './component'

// TODO: change update() function name, because components might want to use
//       that name...

module.exports = function app(el, options = {}) {
  const component = new Component(options)
  const placeHolder = el.cloneNode(false)
  el.parentNode.replaceChild(placeHolder, el)
  component.render = codegen(el).bind(component)
  component.mount(placeHolder)
  return component
}
