import Patcher from './patcher'
import {observe, proxy, objMap} from './util'
import {createElement, shallowCloneNode} from './vdom'
import {replaceNode} from './dom'
import {codegen} from './codegen'
import {ELEMENT_NODE} from './constants'

export default class Component {
  constructor (options = {}) {
    const {data = {}, methods = {}, props = {}} = options

    this.$props = props instanceof Function ? props() : props
    proxy(this, this.$props)

    this.$data = data

    this.$methods = objMap(methods, v => v.bind(this))
    this.$el = null
    this._patcher = null

    // These are dangerous when you set new keys that are not on the proxied
    // object
    proxy(this, this.$methods)
  }
  get $data () {
    return this._$data
  }
  set $data (obj) {
    this._$data = observe(
      obj instanceof Function ? obj.call(this) : obj,
      this.update.bind(this)
    )
    proxy(this, this._$data)
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
  update (rendered = this.render.call(this)) {
    this._patcher.patch(rendered)
  }

  static set $template (el) {
    // TODO: move this function somewhere else?
    const root = el.tagName.toLowerCase() === 'template' ?
      Array.from(el.content.childNodes)
        .find(v => v.nodeType === ELEMENT_NODE)
        .cloneNode(true) :
      el.cloneNode(true)
    this.prototype.render = codegen(root)
  }

  static register(name, constructor) {
    if (!this._registeredComponents) {
      this._registeredComponents = {}
    }

    this._registeredComponents[name] = constructor
    this.registeredComponents = Object.assign(
      {},
      super.registeredComponents,
      this._registeredComponents
    )
  }

  static unregister(name) {
    delete this._registeredComponents[name]
  }
}
