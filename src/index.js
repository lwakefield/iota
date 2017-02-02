import Component from './component'
import Directive, {
  registerDirective,
  unregisterDirective
} from './directives'

// TODO: change update() function name, because components might want to use
//       that name...
//
// TODO: todos duplicate when double clicking then hitting esc
// TODO: error handling on components that are broken
// TODO: handle events

module.exports = {
  registerComponent: Component.register.bind(Component),
  unregisterComponent: Component.unregister.bind(Component),
  registerDirective: registerDirective,
  unregisterDirective: unregisterDirective,
  Directive: Directive,
  Component: Component
}
