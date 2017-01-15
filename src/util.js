export function observe (obj, fn) {
  if (obj.__observer__) return obj.__observer__

  // We should probably do this after the proxying so we don't modify the
  // original object
  for (const key in obj) {
    if (obj[key] instanceof Object) {
      obj[key] = observe(obj[key], fn)
    }
  }

  const proxy = new Proxy(obj, {
    set (target, property, val) {
      target[property] = val instanceof Object
        ? observe(val, fn)
        : val
      fn()
      return true
    }
  })

  Object.defineProperty(proxy, '__observer__', {value: proxy})
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

export const swap = (arr, a, b) => {
  if (!a || !b) return
  const [aIndex, bIndex] = [arr.indexOf(a), arr.indexOf(b)]
  arr.splice(aIndex, 1, b)
  arr.splice(bIndex, 1, a)
}

export const max = (a,b) => a > b ? a : b
