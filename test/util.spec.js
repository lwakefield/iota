/* eslint-env mocha */
import {expect} from 'chai'
import sinon from 'sinon'

import { observe } from '../src/util'

describe('observe', () => {
  it('is notified correctly', () => {
    const spy = sinon.spy()
    const foo = observe({}, spy)

    expect(foo.__observer__).is.ok

    foo.bar = {}
    expect(foo.bar).to.eql({})
    expect(spy.calledOnce).to.be.true

    foo.bar.baz = 1
    expect(foo.bar.baz).to.eql(1)
    expect(spy.calledTwice).to.be.true

    foo.bar = {}
    expect(foo.bar).to.eql({})
    expect(spy.calledThrice).to.be.true

    foo.bar.baz = 1
    expect(foo.bar.baz).to.eql(1)
  })
  it('observes deeply nested objects', () => {
    const spy = sinon.spy()
    const foo = observe({}, spy)

    foo.bar = {baz: {qux: 1}}
    expect(spy.calledOnce).to.be.true

    expect(foo.__observer__).is.ok
    expect(foo.bar.__observer__).is.ok
    expect(foo.bar.baz.__observer__).is.ok

    foo.bar.baz.qux = 2
    expect(spy.calledTwice).to.be.true
  })
})
