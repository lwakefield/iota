import {codegen} from './codegen'
import {
  Component,
  registerComponent,
  unregisterComponent
} from './component'
import Directive, {
  registerDirective,
  unregisterDirective
} from './directives'
import {ELEMENT_NODE} from './constants'

// TODO: change update() function name, because components might want to use
//       that name...
//
// TODO: todos duplicate when double clicking then hitting esc

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
Vdoom.registerComponent = registerComponent
Vdoom.unregisterComponent = unregisterComponent
Vdoom.registerDirective = registerDirective
Vdoom.unregisterDirective = unregisterDirective
Vdoom.Directive = Directive

module.exports = Vdoom
