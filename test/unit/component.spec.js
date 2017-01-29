/* eslint-env jest */
import Component from '../../src/component'

describe('Component', () => {
  it('registers components', () => {
    Component.register('foo', class Foo {})
    expect(Component.registeredComponents).toMatchSnapshot()

    const inst = new Component
    expect(inst.constructor.registeredComponents).toMatchSnapshot(0)

    // Subclasses should receive all registered comps from above
    // but the parent class should not receive components registered below
    class SubComp extends Component {}
    SubComp.register('bar', class Bar{})
    expect(SubComp.registeredComponents).toMatchSnapshot()
    expect(Component.registeredComponents).toMatchSnapshot()
  })
})
