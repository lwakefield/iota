import {codegen} from './codegen'
import {Component} from './component'
import Directive, {
  registerDirective,
  unregisterDirective
} from './directives'

// TODO: change update() function name, because components might want to use
//       that name...

function Vdoom (el, options = {}) {
  const component = new Component(options)
  const placeHolder = el.cloneNode(false)
  el.parentNode.replaceChild(placeHolder, el)
  component.render = codegen.call(component, el)
  component.mount(placeHolder)
  return component
}

Vdoom.registerDirective = registerDirective
Vdoom.unregisterDirective = unregisterDirective
Vdoom.Directive = Directive

module.exports = Vdoom
