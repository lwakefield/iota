/* eslint-env jest */
import beautify from 'js-beautify'
import {
  Event as EventDirective,
  Attribute,
} from '../src/directives'

const assertCode = codeOrNode => expect(
  beautify.html(typeof codeOrNode === 'string' ? codeOrNode : codeOrNode.outerHTML)
).toMatchSnapshot()

describe('Event', () => {
  it('binds, updates and unbinds correctly', () => {
    const event = new EventDirective()
    const el = document.createElement('button')
    const [spy1, spy2] = [jest.fn(), jest.fn()]

    event.bind(el, {name: 'click', value: spy1})
    el.dispatchEvent(new Event('click'))
    expect(spy1).toHaveBeenCalledTimes(1)

    event.update(
      el,
      {name: 'click', value: spy2}
    )

    el.dispatchEvent(new Event('click'))
    expect(spy2).toHaveBeenCalledTimes(1)
    expect(spy1).toHaveBeenCalledTimes(1)

    event.unbind(el, {oldName: 'click'})
    el.dispatchEvent(new Event('click'))
    expect(spy2).toHaveBeenCalledTimes(1)
    expect(spy1).toHaveBeenCalledTimes(1)
  })
})

describe('Attribute', () => {
  it('binds, updates and unbinds correctly', () => {
    const attr = new Attribute()
    const el = document.createElement('div')

    attr.bind(el, {name: 'id', value: 'foo'})
    assertCode(el)

    attr.update(
      el,
      {name: 'id', value: 'bar'},
      {oldName: 'id', oldValue: 'foo'}
    )
    assertCode(el)

    attr.unbind(el, {oldName: 'id'})
    assertCode(el)
  })
})
