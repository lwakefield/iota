import {codegen} from './codegen'
import Component from './component'
import Directive, {
  registerDirective,
  unregisterDirective
} from './directives'
import {ELEMENT_NODE} from './constants'

// TODO: change update() function name, because components might want to use
//       that name...
//
// TODO: todos duplicate when double clicking then hitting esc
// TODO: error handling on components that are broken

class Vdoom {
  constructor (el, options = {}) {
    const app = new (Vdoom.component(el))(options)
    app.mount(el)
    return app
  }

  static component (el, defaultOptions = {}) {
    const isTemplate = el.tagName.toLowerCase() === 'template'
    const root = isTemplate ?
      Array.from(el.content.childNodes)
        .find(v => v.nodeType === ELEMENT_NODE)
        .cloneNode(true) :
      el.cloneNode(true)

    class DynamicComponent extends Component {
      constructor (options) {
        super(Object.assign({}, defaultOptions, options))
      }
    }
    DynamicComponent.prototype.render = codegen(root)

    return DynamicComponent
  }
}
Vdoom.registerComponent = Component.register.bind(Component)
Vdoom.unregisterComponent = Component.unregister.bind(Component)
Vdoom.registerDirective = registerDirective
Vdoom.unregisterDirective = unregisterDirective
Vdoom.Directive = Directive

module.exports = Vdoom
