export function observe (obj, listeners) {
  if (!obj) return obj
  if (!Array.isArray(listeners)) listeners = [listeners]

  // This can happen with the recursive observation *or* it can happen when we
  // try to observe an object which already has an observer
  if (obj.__observer__) {
    obj.__addListeners__(listeners)
    return obj.__observer__
  }

  const proxy = new Proxy(obj, {
    set (target, property, value) {
      target[property] = value
      for (const listener of proxy.__listeners__) listener()
      return true
    },
    get (target, property) {
      const result = target[property]
      if (typeof result !== 'object') return result
      if (property === '__observer__') return result
      if (property === '__listeners__') return result
      if (property === '__addListeners__') return result

      // If result has been observed from somewhere else, then we might need to
      // add our listeners...
      return observe(result, Array.from(proxy.__listeners__))
    }
  })

  Object.defineProperty(proxy, '__observer__', {value: proxy})
  Object.defineProperty(proxy, '__listeners__', {value: new Set(listeners)})
  Object.defineProperty(proxy, '__addListeners__', {
    value: function (toAdd) {
      for (const listener of toAdd) {
        this.__listeners__.add(listener)
      }
    }
  })

  return proxy
}

export function proxy (ontoObj, val) {
  if (!val) return

  for (let key of Object.keys(val)) {
    Object.defineProperty(ontoObj, key, {
      enumerable: true,
      configurable: true,
      get () {
        return val[key]
      },
      set (newVal) {
        val[key] = newVal
      },
    })
  }
}

export function arrToObj (arr, fn) {
  return arr.reduce(
    (result, v) => Object.assign(result, fn(v)),
    {}
  )
}

export function objMap (obj, fn) {
  return Object.keys(obj).reduce(
    (result, k) => Object.assign(result, {[k]: fn(obj[k], k)}),
    {}
  )
}

export const swap = (arr, a, b) => {
  if (!a || !b) return
  const [aIndex, bIndex] = [arr.indexOf(a), arr.indexOf(b)]
  arr.splice(aIndex, 1, b)
  arr.splice(bIndex, 1, a)
}

export const max = (a,b) => a > b ? a : b
