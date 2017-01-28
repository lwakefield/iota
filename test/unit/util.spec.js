/* eslint-env jest */
import { observe } from '../../src/util'

describe('observe', () => {
  it('is notified correctly', () => {
    const spy = jest.fn()
    const foo = observe({}, spy)

    expect(foo.__observer__).toBeDefined()

    foo.bar = {}
    expect(foo.bar).toEqual({})
    expect(spy).toHaveBeenCalledTimes(1)

    foo.bar.baz = 1
    expect(foo.bar.baz).toEqual(1)
    expect(spy).toHaveBeenCalledTimes(2)

    foo.bar = {}
    expect(foo.bar).toEqual({})
    expect(spy).toHaveBeenCalledTimes(3)

    foo.bar.baz = 1
    expect(foo.bar.baz).toEqual(1)
  })
  it('observes deeply nested objects', () => {
    const spy = jest.fn()
    const foo = observe({}, spy)

    foo.bar = {baz: {qux: 1}}
    expect(spy).toHaveBeenCalledTimes(1)

    expect(foo.__observer__).toBeDefined()
    expect(foo.bar.__observer__).toBeDefined()
    expect(foo.bar.baz.__observer__).toBeDefined()

    foo.bar.baz.qux = 2
    expect(spy).toHaveBeenCalledTimes(2)
  })
  it('sets from an unobserved path', () => {
    const spy = jest.fn()
    const foo = observe(
      {arr: [{bar: 2}]},
      spy
    )

    foo.baz = foo.arr[0]
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
