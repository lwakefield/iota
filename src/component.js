import Patcher from './patcher'
import {observe, proxy, arrToObj} from './util'
import {vnode, tnode} from './vdom'

export const components = {}

export function registerComponent(component) {
  components[component.name] = component
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
    this.$el = el
    const tagName = el.tagName.toLowerCase()
    const attrs = arrToObj(
      Array.from(el.attributes),
      ({name, value}) => ({[name]: value})
    )
    const root = vnode(tagName, attrs)
    root.el = el
    this._patcher = new Patcher(root)
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

