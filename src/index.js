import {codegen, codegenNode} from './codegen'
import {Component} from './component'
import Directive, {
  registerDirective,
  unregisterDirective
} from './directives'

// TODO: change update() function name, because components might want to use
//       that name...

class Vdoom {
  constructor (el, options = {}) {
    const app = new (Vdoom.component(el, options))
    app.mount(el)
    return app
  }

  static component (el, options = {}) {
    const isTemplate = el.tagName.toLowerCase() === 'template'

    const root = isTemplate ?
      el.content.cloneNode(true) :
      el.cloneNode(true)

    return function () {
      const comp = new Component(options)
      comp.render = codegen.call(comp, root)
      return comp
    }
  }
}
Vdoom.registerDirective = registerDirective
Vdoom.unregisterDirective = unregisterDirective
Vdoom.Directive = Directive

module.exports = Vdoom
