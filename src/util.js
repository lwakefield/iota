export function observe (obj, fn) {
  if (!obj) return obj
  if (obj.__observer__) return obj.__observer__

  const proxy = new Proxy(obj, {
    set (target, property, val) {
      target[property] = val
      fn()
      return true
    },
    get (target, property) {
      const result = target[property]
      return typeof result === 'object' && property !== '__observer__' ?
        observe(result, fn) :
        result
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
