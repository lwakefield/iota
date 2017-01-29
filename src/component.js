import Patcher from './patcher'
import {observe, proxy, objMap} from './util'
import {createElement, shallowCloneNode} from './vdom'
import {replaceNode} from './dom'

export default class Component {
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

    this._patcher = new Patcher(
      shallowCloneNode(rendered),
      this.constructor.registeredComponents
    )
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

  static get registeredComponents() {
    return this._cachedRegistedComponents || super.registeredComponents
  }

  static set registeredComponents(val) {
    this._registeredComponents = val
    this._cachedRegistedComponents = Object.assign(
      {},
      super.registeredComponents,
      this._registeredComponents
    )
  }

  static register(name, constructor) {
    const {_registeredComponents = {}} = this
    _registeredComponents[name] = constructor
    this.registeredComponents = _registeredComponents
  }

  static unregister(name) {
    const {_registeredComponents = {}} = this
    delete _registeredComponents[name]
    this.registeredComponents = _registeredComponents
  }
}
