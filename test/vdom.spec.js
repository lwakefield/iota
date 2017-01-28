/* eslint-env jest */
import {vnode, tnode, createElement} from '../src/vdom'

describe('tnode', () => {
  it('instantiates correctly with no params', () => {
    expect(tnode()).toMatchSnapshot()
  })
  it('instantiates correctly with string param', () => {
    expect(tnode('foo')).toMatchSnapshot()
  })
})

describe('createElement', () => {
  it('creates a vnode with attributes', () => {
    expect(
      createElement(vnode('div', {attributes: {id: 'foo', class: 'bar'}})).outerHTML
    ).toMatchSnapshot()
  })
})

