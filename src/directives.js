export const directives = {}

export function registerdirective(directive) {
  directives[directive.name] = directive
}
export function unregisterdirective(name) {
  delete directives[name]
}

export default class Directive {
  bind () {}
  update () {}
  unbind () {}
}

export function event(name, value) {
  return {name, value, constructor: Event}
}

export function attr(name, value) {
  return {name, value, constructor: Attribute}
}

export class Attribute extends Directive {
  bind (el, {name, value}) {
    el.setAttribute(name, value)
  }
  update (el, {name, value}, {oldValue}) {
    if (value !== oldValue) {
      el.setAttribute(name, value)
    }
  }
  unbind (el, {name}) {
    el.removeAttribute(name)
  }
}

export class Event extends Directive {
  constructor () {
    super(...arguments)
    this.handler = []
    this.listener = null
  }
  bind (el, {name, value}) {
    this.handler = value
    this.listener = $event => {
      const result = this.handler($event)
      if (result instanceof Function) {
        result($event)
      }
    }
    el.addEventListener(name, this.listener)
  }
  update (el, {value}) {
    this.handler = value
  }
  unbind(el, {name}) {
    el.removeEventListener(name, this.listener)
  }
}
