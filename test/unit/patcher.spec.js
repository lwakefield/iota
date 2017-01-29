/* eslint-env jest */
import beautify from 'js-beautify'

import Component from '../../src/component'
import Patcher, {Index} from '../../src/patcher'
import {vnode, tnode} from '../../src/vdom'
import {
  htov,
  spy,
  unspy,
  stub,
  unstub,
} from './util'

const assertCode = codeOrNode => expect(
  beautify.html(typeof codeOrNode === 'string' ? codeOrNode : codeOrNode.outerHTML)
).toMatchSnapshot()

describe('Patcher', () => {
  describe('patch', () => {
    it('patches an element', () => {
      const [nodeA, nodeB] = [htov('<div />'), vnode('div')]
      const patcher = new Patcher(nodeA)
      stub(patcher, ['patchChildren', 'patchDirectives'])

      patcher.patch(nodeB)
      assertCode(nodeA.el)
      expect(patcher.patchChildren).toHaveBeenCalledWith(nodeA, nodeB)
      expect(patcher.patchDirectives).toHaveBeenCalledWith(nodeA, nodeB)
    })

    it('patches text', () => {
      const [nodeA, nodeB] = [htov('foo'), tnode('bar')]
      const patcher = new Patcher(nodeA)

      patcher.patch(nodeB)
      expect(nodeA.el.textContent).toEqual(nodeB.textContent)
      expect(patcher.nodeA.el).toBeDefined()
    })

    describe('patches a component', () => {
      class Foo extends Component {}
      beforeEach(() => {
        Component.register('Foo', Foo)
        stub(Foo.prototype, ['mount'])
        spy(Foo.prototype, ['setProps'])
      })
      afterEach(() => {
        Component.unregister('Foo')
        unstub(Foo.prototype, ['mount'])
        unspy(Foo.prototype, ['setProps'])
      })

      it('does a simple patch with props', () => {
        const [nodeA, nodeB] = [
          htov('<div />'),
          vnode('Foo', {props: {foo: 'foobar'}}),
        ]
        const patcher = new Patcher(nodeA)

        const originalEl = nodeA.el
        patcher.patch(nodeB)

        const {component} = nodeA
        expect(component).toBeDefined()
        expect(nodeA.el).toBeDefined()
        expect(component.$el).toBeDefined()
        // Will replace the node on first patch
        expect(nodeA.el).not.toEqual(originalEl)
        expect(component.$el).toEqual(nodeA.el)
        expect(component.$props).toEqual({foo: 'foobar'})
        expect(component.mount).toHaveBeenCalledWith(originalEl)
      })
    })
  })
  describe('patchDirectives', () => {
    const {patchDirectives} = (new Patcher())

    class MockDirective {
      constructor () {
        this.bind = jest.fn()
        this.unbind = jest.fn()
        this.update = jest.fn()
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

      expect(nodeA.options.directives).toEqual(nodeB.options.directives)
      const {instance} = nodeA.options.directives.foo
      expect(instance).toBeDefined()
      expect(instance.bind).toHaveBeenCalledTimes(1)
      expect(instance.bind).toHaveBeenCalledWith(nodeA.el, nodeB.options.directives.foo)
    })

    it('updates', () => {
      const nodeA = htov('<div />')
      nodeA.options.directives[':foo'] = {
        name: ':foo', value: 'bar', constructor: MockDirective, instance: new MockDirective()
      }
      const nodeB = vnode('div', {
        directives: {
          [':foo']: {name: ':foo', value: 'baz', constructor: MockDirective},
        }
      })

      const oldVal = nodeA.options.directives[':foo']
      const {instance} = oldVal

      patchDirectives(nodeA, nodeB)

      expect(nodeA.options.directives).toEqual(nodeB.options.directives)
      expect(nodeA.options.directives[':foo'].instance).toBe(instance)
      expect(instance.update).toHaveBeenCalledTimes(1)
      expect(instance.update).toHaveBeenCalledWith(
        nodeA.el,
        {name: ':foo', value: 'baz'},
        {oldName: ':foo', oldValue: 'bar'}
      )
    })

    it('unbinds', () => {
      const nodeA = htov('<div />')
      nodeA.options.directives[':foo'] = {
        name: ':foo', value: 'bar', constructor: MockDirective, instance: new MockDirective()
      }
      const nodeB = vnode('div', {
        directives: {}
      })

      const oldVal = nodeA.options.directives[':foo']
      const {instance} = oldVal

      patchDirectives(nodeA, nodeB)

      expect(nodeA.options.directives).toEqual(nodeB.options.directives)
      expect(instance.unbind).toHaveBeenCalledTimes(1)
      expect(instance.unbind).toHaveBeenCalledWith(
        nodeA.el,
        {oldName: ':foo', oldValue: 'bar'}
      )
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
        stub(Patcher.prototype, 'patch')
      })
      afterEach(() => {
        unstub(Patcher.prototype, 'patch')
      })

      it('adds children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div />',
          vnode('div', {}, [vnode('div')])
        )

        assertCode(nodeA.el)
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)
        expect(nodeA.children[0].el).toBeDefined()
      })
      it('removes children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div')
        )

        assertCode(nodeA.el)
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)
      })
      it('replace children with non-matching tagNames', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [vnode('p')])
        )

        assertCode(nodeA.el)
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)
        expect(nodeA.children[0].el).toBeDefined()
      })
      it('replace children element node with text node', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [tnode('hello')])
        )

        assertCode(nodeA.el)
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)
        expect(nodeA.children[0].el).toBeDefined()
      })
      it('patches type matching children', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div><div /></div>',
          vnode('div', {}, [vnode('div', {id: 'foo'})])
        )

        assertCode(nodeA.el)
        const firstChildA = nodeA.children[0]
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)
        expect(patcher.patch).toHaveBeenCalledWith(firstChildA, nodeB.children[0])
      })
    })

    describe('patching components', () => {
      class Foo extends Component {
        render () {
          return vnode('div', {attributes: {id: 'foo'}})
        }
      }
      beforeEach(() => Component.register('Foo', Foo))
      afterEach(() => Component.unregister('Foo'))

      it('persists components', () => {
        const [nodeA, nodeB, patcher] = setup(
          '<div></div>',
          vnode('div', {}, [vnode('Foo'), vnode('Foo')])
        )
        patcher.patchChildren(nodeA, nodeB)
        assertCode(nodeA.el)

        const components = nodeA.children.map(v => v.component)
        expect(components[0]).toBeDefined()
        expect(components[0].$el).toBeDefined()
        expect(components[1]).toBeDefined()
        expect(components[1].$el).toBeDefined()

        const nodeC = vnode('div', {}, [vnode('Foo'), vnode('Foo')])
        patcher.patchChildren(nodeA, nodeC)
        assertCode(nodeA.el)
        expect(nodeA.children[0].component).toBe(components[0])
        expect(nodeA.children[1].component).toBe(components[1])

        const nodeD = vnode('div', {}, [
          vnode('p'), vnode('Foo'), vnode('Foo')
        ])
        patcher.patchChildren(nodeA, nodeD)
        assertCode(nodeA.el)
        expect(nodeA.children[0].tagName).toEqual('p')
        expect(nodeA.children[1].component).toBe(components[0])
        expect(nodeA.children[2].component).toBe(components[1])
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
        assertCode(nodeA.el)

        const components = nodeA.children.map(v => v.component)
        expect(components.length).toEqual(3)
        components.forEach(component => {
          expect(component).toBeDefined()
          expect(component.$el).toBeDefined()
        })

        const nodeC = vnode('div', {}, [
          vnode('Foo', {key: 1}),
          vnode('Foo', {key: 2}),
          vnode('Foo', {key: 0}),
        ])
        patcher.patchChildren(nodeA, nodeC)
        assertCode(nodeA.el)
        expect(nodeA.children[0].component).toBe(components[1])
        expect(nodeA.children[1].component).toBe(components[2])
        expect(nodeA.children[2].component).toBe(components[0])

        const nodeD = vnode('div', {}, [
          vnode('Foo', {key: 0}),
          vnode('Foo', {key: 2}),
        ])
        patcher.patchChildren(nodeA, nodeD)
        assertCode(nodeA.el)
        expect(nodeA.children.length).toEqual(2)
        expect(nodeA.children[0].component).toBe(components[0])
        expect(nodeA.children[1].component).toBe(components[2])
      })
    })

    describe('patching keyed nodes', () => {
      beforeEach(() => stub(Patcher.prototype, 'patch'))
      afterEach(() => unstub(Patcher.prototype, 'patch'))

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
        assertCode(nodeA.el)
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
        assertCode(nodeA.el)
        nodeA.children.forEach(v => expect(v.el).toBeDefined())
        expect(nodeA.children[0].el).toBe(childEls[0])
        expect(nodeA.children[1].el).toBe(childEls[1])
        expect(nodeA.children[2].el).toBe(childEls[2])
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
        assertCode(nodeA.el)
        nodeA.children.forEach(v => expect(v.el).toBeDefined())
        expect(nodeA.children[0].el).toBe(childEls[1])
        expect(nodeA.children[1].el).toBe(childEls[2])
        expect(nodeA.children[2].el).toBe(childEls[0])
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
        assertCode(nodeA.el)
      })
    })
  })
})

describe('Index', () => {
  it('works as intended', () => {
    const index = new Index()
    index.queue('a', 1)
    expect(index.size).toEqual(1)
    expect(index.peek('a')).toEqual(1)
    index.queue('a', 2)
    expect(index.size).toEqual(2)
    expect(index.peek('a')).toEqual(1)

    expect(index.dequeue('a')).toEqual(1)
    expect(index.peek('a')).toEqual(2)
    expect(index.dequeue('a')).toEqual(2)

    expect(index.peek('a')).toEqual(null)
    expect(index.dequeue('a')).toEqual(null)
  })
})
