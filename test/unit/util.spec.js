/* eslint-env jest */
import { observe } from '../../src/util'

describe('observe', () => {
  it('is notified correctly', () => {
    const spy = jest.fn()
    const foo = observe({}, spy)

    expect(foo.__observer__).toBeDefined()
    expect(foo.__listeners__).toEqual(new Set([spy]))

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
  it('works with multiple observers', () => {
    const [spy1, spy2] = [jest.fn(), jest.fn()]
    const data = {arr: [{bar: 2}]}

    const ob1 = observe(data, spy1)
    observe(data, spy2)
    expect(data.__listeners__.size).toEqual(2)

    ob1.arr[1] = {baz: 3}
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)

    // We can't observe changes outside of an observed obj...
    data.arr[2] = {qux: 4}
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
  })
})

test.skip('', () => {
  const truth = {foo: 'bar'}
  const ob1 = observe(truth, () => console.log('ob1'))
  const ob2 = observe(truth, () => console.log('ob2'))

  // ideally:
  truth.foo = 'baz'
  // ob1
  // ob2

  // I don't believe this is possible currently (with our tactic)...

  // What *is* possible:
  ob1.foo = 'baz'
  // ob1
  // ob2
  truth.foo === ob1.foo === ob2.foo === 'baz'
})
