/* eslint-env mocha */
import {expect} from 'chai'

import {vnode, tnode, createElement} from '../src/vdom'
import {assertHtmlIsEqual, htoe} from './util'

describe('tnode', () => {
  it('instantiates correctly with no params', () => {
    expect(tnode()).to.eql({nodeType: 3, textContent: undefined})
  })
  it('instantiates correctly with string param', () => {
    expect(tnode('foo')).to.eql({nodeType: 3, textContent: 'foo'})
  })
})

describe('createElement', () => {
  it('creates a vnode with attributes', () => {
    assertHtmlIsEqual(
      createElement(vnode('div', {id: 'foo', class: 'bar'})),
      htoe('<div id="foo" class="bar"></div>')
    )
  })
})

