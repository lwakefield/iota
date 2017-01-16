import Patcher from './patcher'
import {observe, proxy, objMap} from './util'
import {vnode, tnode, createElement, shallowCloneNode} from './vdom'
import {replaceNode} from './dom'
import {attr, event} from './directives'

export const components = {}

export function registerComponent(component) {
  components[component.name] = component
}
export function unregisterComponent(name) {
  delete components[name]
}

export class Component {
  constructor (options = {}) {
    const {data = {}, methods = {}} = options
    this.$data = observe(data, this.update.bind(this))
    this.$methods = objMap(methods, v => v.bind(this))
    this.$el = null
    this._patcher = null
    this.$props = {}

    this.vnode = vnode
    this.tnode = tnode
    this.attr = attr
    this.event = event

    proxy(this, this.$data)
    proxy(this, this.$methods)
  }
  mount (el) {
    const rendered = this.render.call(this)
    rendered.el = createElement(rendered)
    this.$el = rendered.el
    replaceNode(el, this.$el)

    this._patcher = new Patcher(shallowCloneNode(rendered))
    this.update(rendered)
  }
  setProps(props) {
    this.$props = props
  }
  render () {
    throw new Error('Not implemented')
  }
  update (rendered = this.render()) {
    this._patcher.patch(rendered)
  }
}
