import Patcher from './patcher'
import {observe, proxy, objMap} from './util'
import {createElement, shallowCloneNode} from './vdom'
import {replaceNode} from './dom'

export const components = {}

export function registerComponent() {
  if (arguments.length === 1) {
    components[arguments[0].name] = arguments[0]
  } else if (arguments.length === 2) {
    components[arguments[0]] = arguments[1]
  }
}
export function unregisterComponent(name) {
  delete components[name]
}

export class Component {
  constructor (options = {}) {
    const {data = {}, methods = {}, props = {}} = options

    this.$props = props instanceof Function ? props() : props
    proxy(this, this.$props)

    this.$data = observe(
      data instanceof Function ? data.call(this) : data,
      this.update.bind(this)
    )
    proxy(this, this.$data)

    this.$methods = objMap(methods, v => v.bind(this))
    this.$el = null
    this._patcher = null

    // These are dangerous when you set new keys that are not on the proxied
    // object
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
    for (const key in props) {
      this.$props[key] = props[key]
    }
  }
  render () {
    throw new Error('Not implemented')
  }
  update (rendered = this.render()) {
    this._patcher.patch(rendered)
  }
}
