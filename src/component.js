import Patcher from './patcher'
import {observe, proxy} from './util'
import {vnode, tnode, createElement} from './vdom'
import {replaceNode} from './dom'

export const components = {}

export function registerComponent(component) {
  components[component.name] = component
}
export function unregisterComponent(name) {
  delete components[name]
}

// export function component(options = {}) {
//   const {el, name} = options
//   const component = class extends Component {
//     constructor() {super(options)}
//   }
//   component.name = name
//   component.prototype.render = Codegen.codegen(el)
//   return component
// }

export class Component {
  constructor (options = {}) {
    const {data = {}} = options
    this.$data = observe(data, this.update.bind(this))
    this.$el = null
    this._patcher = null
    this.$props = {}

    proxy(this, this.$data)
  }
  mount (el) {
    const rendered = this.render()
    this.$el = createElement(rendered)
    replaceNode(el, this.$el)

    this._patcher = new Patcher(rendered)
  }
  setProps(props) {
    this.$props = props
  }
  render () {
    throw new Error('Not implemented')
  }
  update () {
    const rendered = this.render.call(
      Object.assign({vnode, tnode}, this)
    )
    this._patcher.patch(rendered)
  }
}

