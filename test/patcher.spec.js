/* eslint-env mocha */
import {expect} from 'chai'
import sinon from 'sinon'
import jsdom from 'jsdom'

import {Component, registerComponent} from '../src/component'
import Patcher from '../src/patcher'
import {vnode, tnode} from '../src/vdom'
import {htov, assertHtmlIsEqual, mockOnClass, unmockOnClass} from './util'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
})

describe('Patcher', () => {
  describe('patch', () => {
    beforeEach(() => {
      mockOnClass(Patcher, 'patchAttributes', sinon.spy())
      mockOnClass(Patcher, 'patchChildren', sinon.spy())
    })
    after(() => {
      unmockOnClass(Patcher, 'patchAttributes')
      unmockOnClass(Patcher, 'patchChildren')
    })
    it('patches an element', () => {
      const nodeA = htov('<div />')
      const nodeB = vnode('div')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(patcher.patchAttributes.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.patchChildren.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.lastNodeA).to.eql(nodeB)
    })
    it('patches text', () => {
      const nodeA = htov('foo')
      const nodeB = tnode('bar')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(nodeA.el.textContent).to.eql(nodeB.textContent)
      expect(patcher.lastNodeA).to.eql(nodeB)
    })
    describe('patches a component', () => {
      class Foo extends Component {}
      registerComponent(Foo)

      beforeEach(() => {
        mockOnClass(Foo, 'update', sinon.spy())
        mockOnClass(Foo, 'setProps', sinon.spy())
      })
      afterEach(() => {
        unmockOnClass(Foo, 'update')
        unmockOnClass(Foo, 'setProps')
      })

      it('does a simple patch with props', () => {
        const nodeA = htov('<div />')
        const nodeB = vnode('Foo', {props: {foo: 'foobar'}})
        const patcher = new Patcher(nodeA)

        patcher.patch(nodeB)
        expect(nodeB.component).to.be.ok
        expect(nodeB.component.$el).to.eql(nodeA.el)
        expect(nodeB.component.update.calledOnce).to.be.true
        expect(nodeB.component.setProps.calledWith({foo: 'foobar'})).to.be.true
      })
    })
  })
  describe('patchAttributes', () => {
    const patcher = new Patcher()
    const patchAttributes = patcher.patchAttributes
    it('adds attributes', () => {
      const nodeA = htov('<div />')
      const nodeB = vnode('div', {id: 'foo'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="foo"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('updates attributes', () => {
      const nodeA = htov('<div id="foo" />')
      const nodeB = vnode('div', {id: 'bar'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="bar"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('deletes attributes', () => {
      const nodeA = htov('<div id="foo" />')
      const nodeB = vnode('div', {})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
  })
  describe('patchChildren', () => {
    beforeEach(() => {
      mockOnClass(Patcher, 'patch', sinon.spy())
    })
    afterEach(() => {
      unmockOnClass(Patcher, 'patch', sinon.spy())
    })

    function setup (htmlForNodeA, nodeB) {
      const nodeA = htov(htmlForNodeA)
      const patcher = new Patcher()
      return [nodeA, nodeB, patcher]
    }

    it('adds children', () => {
      const [nodeA, nodeB, patcher] = setup(
        '<div />',
        vnode('div', {}, [vnode('div')])
      )

      assertHtmlIsEqual(nodeA.el, '<div></div>')
      patcher.patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      expect(nodeB.children[0].el).to.be.ok
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
      expect(nodeB.children[0].el).to.be.ok
    })
    it('replace children element node with text node', () => {
      const [nodeA, nodeB, patcher] = setup(
        '<div><div /></div>',
        vnode('div', {}, [tnode('hello')])
      )

      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      patcher.patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div>hello</div>')
      expect(nodeB.children[0].el).to.be.ok
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
    describe('patching keyed nodes', () => {
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
          '<div><div key="1"></div><div key="2"></div><div key="3"></div></div>'
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
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          '<div><div key="1"></div><div key="2"></div><div key="3"></div></div>'
        )
        expect(nodeA.children[0].el).to.eql(nodeB.children[0].el)
        expect(nodeA.children[1].el).to.eql(nodeB.children[1].el)
        expect(nodeA.children[2].el).to.eql(nodeB.children[2].el)
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
        patcher.patchChildren(nodeA, nodeB)
        assertHtmlIsEqual(
          nodeA.el,
          '<div><div key="2"></div><div key="3"></div><div key="1"></div></div>'
        )
        expect(nodeA.children[0].el).to.eql(nodeB.children[0].el)
        expect(nodeA.children[1].el).to.eql(nodeB.children[1].el)
        expect(nodeA.children[2].el).to.eql(nodeB.children[2].el)
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
            <div key="1"></div>
            <div key="2"></div>
            <div key="3"></div>
          </div>
          `
        )
      })
    })
  })
})

