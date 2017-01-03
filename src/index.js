import Codegen from './codegen'
import {Component} from './component'

module.exports = function app(el, options = {}) {
  const component = new Component(options)
  const placeHolder = el.cloneNode(false)
  el.parentNode.replaceChild(placeHolder, el)
  component.render = Codegen.codegen(el)
  component.mount(placeHolder)
  return component
}
