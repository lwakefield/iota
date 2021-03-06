import Patcher from './patcher'
import {observe, proxy} from './util'
import {createElement, shallowCloneNode} from './vdom'
import {replaceNode} from './dom'
import {codegen} from './codegen'
import {ELEMENT_NODE} from './constants'

export default class Component {
  $el = null
  _patcher = null

  constructor (options = {}) {
    const {data = {}, props = {}} = options

    this.$data = data
    this.$props = props
  }

  set $data (obj) {
    this._$data = this._observeAndProxy(obj)
  }
  get $data () {
    return this._$data
  }

  set $props (obj) {
    this._$props = this._observeAndProxy(obj)
  }
  get $props () {
    return this._$props
  }

  _observeAndProxy(obj) {
    const observed = observe(
      obj instanceof Function ? obj.call(this) : obj,
      this.update.bind(this)
    )
    proxy(this, observed)
    return observed
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
