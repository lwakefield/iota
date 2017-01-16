/* eslint-env mocha */
import {expect} from 'chai'
import sinon from 'sinon'
import jsdom from 'jsdom'

import {
  Component,
  registerComponent,
  unregisterComponent,
} from '../src/component'
import {attr, event} from '../src/directives'
import Patcher, {Index} from '../src/patcher'
import {vnode, tnode} from '../src/vdom'
import {htov, assertHtmlIsEqual, mockOnClass, unmockOnClass} from './util'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
  global['Event'] = window.Event
})

class Foo extends Component {
  render () {
    return vnode('div', {attributes: {id: 'foo'}})
  }
}
before(() => {registerComponent(Foo)})
after(() => {unregisterComponent('Foo')})

describe('Patcher', () => {
  describe('patch', () => {
    beforeEach(() => {
      mockOnClass(Patcher, 'patchChildren', sinon.spy())
      mockOnClass(Patcher, 'patchDirectives', sinon.spy())
    })
    after(() => {
      unmockOnClass(Patcher, 'patchChildren')
      unmockOnClass(Patcher, 'patchDirectives')
    })
    it('patches an element', () => {
      const nodeA = htov('<div />')
      const nodeB = vnode('div')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      assertHtmlIsEqual(nodeA.el, '<div></div>')
      expect(patcher.patchDirectives.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.patchChildren.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.nodeA.el).to.be.ok
    })
    it('patches text', () => {
      const nodeA = htov('foo')
      const nodeB = tnode('bar')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      expect(nodeA.el.textContent).to.eql(nodeB.textContent)
      expect(patcher.nodeA.el).to.be.ok
    })
    describe('patches a component', () => {
      beforeEach(() => {
        mockOnClass(Foo, 'setProps', sinon.spy())
        sinon.spy(Foo.prototype, 'mount')
      })
      afterEach(() => {
        unmockOnClass(Foo, 'setProps')
        Foo.prototype.mount.restore()
      })

      it('does a simple patch with props', () => {
        const nodeA = htov('<div />')
        const nodeB = vnode('Foo', {props: {foo: 'foobar'}})
        const patcher = new Patcher(nodeA)

        const originalEl = nodeA.el
        patcher.patch(nodeB)

        const {component} = nodeA
        expect(component).to.be.ok
        expect(nodeA.el).to.be.ok
        expect(component.$el).to.be.ok
        // Will replace the node on first patch
        expect(nodeA.el).to.not.eql(originalEl)
        expect(component.$el).to.eql(nodeA.el)

        expect(nodeA.component.setProps.calledWith({foo: 'foobar'})).to.be.true
        expect(nodeA.component.mount.calledWith(originalEl)).to.be.true
      })
    })
  })
  describe('patchDirectives', () => {
    const {patchDirectives} = (new Patcher())

    class MockDirective {
      constructor () {
        this.bind = sinon.spy()
        this.unbind = sinon.spy()
        this.update = sinon.spy()
      }
    }

    it('binds', () => {
      const nodeA = htov('<div />')
      const nodeB = vnode('div', {
        directives: {
          foo: {name: ':foo', value: 'bar', constructor: MockDirective},
        }
      })

      patchDirectives(nodeA, nodeB)

      expect(nodeA.options.directives).to.eql(nodeB.options.directives)
      const {instance} = nodeA.options.directives.foo
      expect(instance).is.ok
      expect(instance.bind.calledOnce).is.true
      expect(instance.bind.calledWith(nodeA.el, nodeB.options.directives.foo)).is.true
    })

    it('updates', () => {
      const nodeA = htov('<div />')
      nodeA.options.directives.foo = {
        name: ':foo', value: 'bar', constructor: MockDirective, instance: new MockDirective()
      }
      const nodeB = vnode('div', {
        directives: {
          foo: {name: '#foo', value: 'bar', constructor: MockDirective},
        }
      })

      const oldVal = nodeA.options.directives.foo
      const {instance} = oldVal

      patchDirectives(nodeA, nodeB)

      expect(nodeA.options.directives).to.eql(nodeB.options.directives)
      expect(nodeA.options.directives.foo.instance === instance).is.true
      expect(instance.update.calledOnce).is.true
      expect(instance.update.calledWith(
        nodeA.el,
        nodeB.options.directives.foo,
        oldVal
      ))
    })
    it('unbinds', () => {
      const nodeA = htov('<div />')
      nodeA.options.directives.foo = {
        name: ':foo', value: 'bar', constructor: MockDirective, instance: new MockDirective()
      }
      const nodeB = vnode('div', {
        directives: {}
      })

      const oldVal = nodeA.options.directives.foo
      const {instance} = oldVal

      patchDirectives(nodeA, nodeB)

      expect(nodeA.options.directives).to.eql(nodeB.options.directives)
      expect(instance.unbind.calledOnce).is.true
      expect(instance.unbind.calledWith(
        nodeA.el,
        oldVal
      ))
    })
  })
  describe('patchChildren', () => {
    function setup (htmlForNodeA, nodeB) {
      const nodeA = htov(htmlForNodeA)
      const patcher = new Patcher()
      return [nodeA, nodeB, patcher]
    }

    describe('simple functionality', () => {
      beforeEach(() => {
        mockOnClass(Patcher, 'patch', sinon.spy())
      })
      afterEach(() => {
        unmockOnClass(Patcher, 'patch', sinon.spy())
      })
      it('adds children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div />',
          vnode('div', {}, [vnode('div')])
        )

        assertHtmlIsEqual(nodeA.el, '<div></div>')
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        expect(nodeA.children[0].el).to.be.ok
      })
      it('removes children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div')
        )

        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(nodeA.el, '<div></div>')
      })
      it('replace children with non-matching tagNames', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [vnode('p')])
        )

        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(nodeA.el, '<div><p></p></div>')
        expect(nodeA.children[0].el).to.be.ok
      })
      it('replace children element node with text node', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [tnode('hello')])
        )

        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(nodeA.el, '<div>hello</div>')
        expect(nodeA.children[0].el).to.be.ok
      })
      it('patches type matching children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [vnode('div', {id: 'foo'})])
        )

        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        const firstChildA = nodeA.children[0]
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
        expect(
          patcher.patch.calledWith(firstChildA, nodeB.children[0])
        ).to.be.true
      })
    })

    describe('patching components', () => {
      it('persists components', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div></div>',
          vnode('div', {}, [vnode('Foo'), vnode('Foo')])
        )
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        const components = nodeA.children.map(v => v.component)
        expect(components[0]).to.be.ok
        expect(components[0].$el).to.be.ok
        expect(components[1]).to.be.ok
        expect(components[1].$el).to.be.ok

        const nodeC = vnode('div', {}, [vnode('Foo'), vnode('Foo')])
        patcher.patchChildren(nodeA, nodeC)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        expect(nodeA.children[0].component).to.eql(components[0])
        expect(nodeA.children[1].component).to.eql(components[1])

        const nodeD = vnode('div', {}, [
          vnode('p'), vnode('Foo'), vnode('Foo')
        ])
        patcher.patchChildren(nodeA, nodeD)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <p></p>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        expect(nodeA.children[0].tagName).to.eql('p')
        expect(nodeA.children[1].component).to.eql(components[0])
        expect(nodeA.children[2].component).to.eql(components[1])
      })
      it('persists keyed components', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div></div>',
          vnode('div', {}, [
            vnode('Foo', {key: 0}),
            vnode('Foo', {key: 1}),
            vnode('Foo', {key: 2})
          ])
        )
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <div id="foo"></div>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        const components = nodeA.children.map(v => v.component)
        expect(components.length).to.eql(3)
        components.forEach(component => {
          expect(component).to.be.ok
          expect(component.$el).to.be.ok
        })

        const nodeC = vnode('div', {}, [
          vnode('Foo', {key: 1}),
          vnode('Foo', {key: 2}),
          vnode('Foo', {key: 0}),
        ])
        patcher.patchChildren(nodeA, nodeC)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <div id="foo"></div>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        expect(nodeA.children[0].component).to.eql(components[1])
        expect(nodeA.children[1].component).to.eql(components[2])
        expect(nodeA.children[2].component).to.eql(components[0])

        const nodeD = vnode('div', {}, [
          vnode('Foo', {key: 0}),
          vnode('Foo', {key: 2}),
        ])
        patcher.patchChildren(nodeA, nodeD)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <div id="foo"></div>
            <div id="foo"></div>
          </div>
          `
        )
        expect(nodeA.children.length).to.eql(2)
        expect(nodeA.children[0].component).to.eql(components[0])
        expect(nodeA.children[1].component).to.eql(components[2])
      })
    })

    describe('patching keyed nodes', () => {
      beforeEach(() => {
        sinon.stub(Patcher.prototype, 'patch')
      })
      afterEach(() => {
        Patcher.prototype.patch.restore()
      })
      it('patches keyed nodes for the first time', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div></div>',
          vnode('div', {}, [
            vnode('div', {key: 1}),
            vnode('div', {key: 2}),
            vnode('div', {key: 3}),
          ])
        )
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          '<div><div></div><div></div><div></div></div>'
        )
      })
      it('patches keyed nodes with no changes', () => {
        const [nodeA, nodeB, patcher] = setup(
          `<div>
            <div key="1"></div>
            <div key="2"></div>
            <div key="3"></div>
          </div>`,
          vnode('div', {}, [
            vnode('div', {key: 1}),
            vnode('div', {key: 2}),
            vnode('div', {key: 3}),
          ])
        )

        const childEls = nodeA.children.map(v => v.el)
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          '<div><div></div><div></div><div></div></div>'
        )
        nodeA.children.forEach(v => expect(v.el).to.be.ok)
        expect(nodeA.children[0].el).to.eql(childEls[0])
        expect(nodeA.children[1].el).to.eql(childEls[1])
        expect(nodeA.children[2].el).to.eql(childEls[2])
      })
      it('patches keyed nodes with shuffle', () => {
        const [nodeA, nodeB, patcher] = setup(
          `<div>
            <div key="1"></div>
            <div key="2"></div>
            <div key="3"></div>
          </div>`,
          vnode('div', {}, [
            vnode('div', {key: 2}),
            vnode('div', {key: 3}),
            vnode('div', {key: 1}),
          ])
        )
        const childEls = nodeA.children.map(v => v.el)
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          '<div><div></div><div></div><div></div></div>'
        )
        nodeA.children.forEach(v => expect(v.el).to.be.ok)

        expect(nodeA.children[0].el).to.eql(childEls[1])
        expect(nodeA.children[1].el).to.eql(childEls[2])
        expect(nodeA.children[2].el).to.eql(childEls[0])
      })
      it('patches keyed nodes with non-keyed insertion', () => {
        const [nodeA, nodeB, patcher] = setup(
          `<div>
            <div key="1"></div>
            <div key="2"></div>
            <div key="3"></div>
          </div>`,
          vnode('div', {}, [
            vnode('p'),
            vnode('div', {key: 1}),
            vnode('div', {key: 2}),
            vnode('div', {key: 3}),
          ])
        )
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          `
          <div>
            <p></p>
            <div></div>
            <div></div>
            <div></div>
          </div>
          `
        )
      })
    })
  })
})

describe('Index', () => {
  it('works as intended', () => {
    const index = new Index()
    index.queue('a', 1)
    expect(index.size).to.eql(1)
    expect(index.peek('a')).to.eql(1)
    index.queue('a', 2)
    expect(index.size).to.eql(2)
    expect(index.peek('a')).to.eql(1)

    expect(index.dequeue('a')).to.eql(1)
    expect(index.peek('a')).to.eql(2)
    expect(index.dequeue('a')).to.eql(2)

    expect(index.peek('a')).to.eql(null)
    expect(index.dequeue('a')).to.eql(null)
  })
})
