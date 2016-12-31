/* eslint-env mocha */
import {expect} from 'chai'
import sinon from 'sinon'
import jsdom from 'jsdom'

import {
  tnode,
  vnode,
  Codegen,
  getNodeAttrs,
  createElement,
  Patcher,
  mount,
} from '../src'

const normalize = s => s.split('\n')
  .map(v => v.trim())
  .filter(v => !!v)
  .join('')

function assertCodeIsEqual(codeA, codeB) {
  expect(normalize(codeA)).to.eql(normalize(codeB))
}

function assertHtmlIsEqual(nodeA, nodeB) {
  assertCodeIsEqual(
    typeof nodeA === 'string' ? nodeA.trim() : nodeA.outerHTML,
    typeof nodeB === 'string' ? nodeB.trim() : nodeB.outerHTML
  )
}

function htoe(html) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = normalize(html)
  return wrapper.firstChild
}

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
})

describe('tnode', () => {
  it('instantiates correctly with no params', () => {
    expect(tnode()).to.eql({nodeType: 3, textContent: undefined})
  })
  it('instantiates correctly with string param', () => {
    expect(tnode('foo')).to.eql({nodeType: 3, textContent: 'foo'})
  })
})

describe('Codegen', () => {
  describe('codegenAttributes', () => {
    it('generates multiple attributes', () => {
      const p = htoe(
        '<p id="foo" class="class1 class2 ${class3}"></p>'
      )
      expect(Codegen.codegenAttributes(p))
        .to.eql('{id: `foo`,class: `class1 class2 ${class3}`}')
    })
  })
  describe('codegenTextNode', () => {
    it('generates tnode', () => {
      const t = htoe('foo ${bar}')
      expect(Codegen.codegenTextNode(t)).to.eql('tnode(`foo ${bar}`)')
    })
  })
  describe('codegenChildren', () => {
    it('generates children', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      const code = Codegen.codegenChildren(el)
      expect(code).to.eql(
        `[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])]`
      )
    })
  })
  describe('codegenElement', () => {
    it('generates for an element with no children and no attributes', () => {
      const el = htoe('<div/>')
      expect(Codegen.codegenElementNode(el)).to.eql(`vnode('div',{},[])`)
    })
    it('generates for an element with attributes and no children', () => {
      const el = htoe(
        '<div id="foo" class="class1 class2 ${class3}"/>'
      )
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "vnode('div',{id: `foo`,class: `class1 class2 ${class3}`},[])"
      )
    })
    it('generates for an element with children and no attributes', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "vnode('div',{},[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])])"
      )
    })
    it('generates for an element with i-if', () => {
      const el = htoe('<div i-if="toggle" />')
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "toggle ? vnode('div',{},[]) : null"
      )
    })
    it('generates for an element with i-for', () => {
      const el = htoe('<div i-for="val of vals" />')
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "...vals.map(val => vnode('div',{},[]))"
      )
    })
    it('generates for an element with i-for and i-if', () => {
      const el = htoe('<div i-for="val of vals" i-if="toggle" />')
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "...vals.map(val => toggle ? vnode('div',{},[]) : null)"
      )
    })
    it('generates for an element with children and attributes', () => {
      const el = htoe(
        `<div id="foo" class="class1 class2 \${class3}">
          <p></p><span></span><h1></h1>
        </div>`
      )
      const code = Codegen.codegenElementNode(el)
      assertCodeIsEqual(
        code,
        `
        vnode('div',
          {id: \`foo\`,class: \`class1 class2 \${class3}\`},
          [
            vnode('p',{},[]),
            vnode('span',{},[]),
            vnode('h1',{},[])
          ]
        )
        `
      )
    })
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

describe('mount', () => {
  it('mounts a simple vnode', () => {
    const root = vnode('div')
    const [mounted, index] = mount(root)
    assertHtmlIsEqual(
      mounted.el,
      htoe('<div></div>')
    )
    expect(index.size).to.eql(0)
  })
  it('mounts a vnode with children', () => {
    const root = vnode('div', {}, [vnode('div'), vnode('div'), vnode('div')])
    const [mounted] = mount(root)
    assertHtmlIsEqual(
      mounted.el,
      `
          <div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        `
    )
  })
})

describe('Patcher', () => {
  describe('patch', () => {
    let patcher
    let patch
    beforeEach(() => {
      patcher = new Patcher()
      patcher.patchAttributes = sinon.spy()
      patcher.patchChildren = sinon.spy()
      patch = patcher.patch.bind(patcher)
    })
    it('patches an element', () => {
      const [nodeA] = mount(vnode('div'))
      const nodeB = vnode('div')
      patch(nodeA, nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(patcher.patchAttributes.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.patchChildren.calledWith(nodeA, nodeB)).to.be.true
    })
    it('patches text', () => {
      const [nodeA] = mount(tnode('foo'))
      const nodeB = tnode('bar')
      patch(nodeA, nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(nodeA.el.textContent).to.eql(nodeB.textContent)
    })
  })
  describe('patchAttributes', () => {
    const patcher = new Patcher()
    const patchAttributes = patcher.patchAttributes
    it('adds attributes', () => {
      const [nodeA] = mount(vnode('div'))
      const nodeB = vnode('div', {id: 'foo'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="foo"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('updates attributes', () => {
      const [nodeA] = mount(vnode('div', {id: 'foo'}))
      const nodeB = vnode('div', {id: 'bar'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="bar"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('deletes attributes', () => {
      const [nodeA] = mount(vnode('div', {id: 'foo'}))
      const nodeB = vnode('div', {})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
  })
  describe('patchChildren', () => {
    let patchChildren
    let patcher
    beforeEach(() => {
      patcher = new Patcher()
      patcher.patch = sinon.spy()
      patchChildren = patcher.patchChildren.bind(patcher)
    })

    it('adds children', () => {
      const [nodeA] = mount(vnode('div'))
      const nodeB = vnode('div', {}, [vnode('div')])
      patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      expect(nodeB.children[0].el).to.be.ok
    })
    it('removes children', () => {
      const [nodeA] = mount(vnode('div', {}, [vnode('div')]))
      const nodeB = vnode('div')
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div></div>')
    })
    it('replace children with non-matching tagNames', () => {
      const [nodeA] = mount(vnode('div', {}, [vnode('div')]))
      const nodeB = vnode('div', {}, [vnode('p')])
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div><p></p></div>')
      expect(nodeB.children[0].el).to.be.ok
    })
    it('replace children element node with text node', () => {
      const [nodeA] = mount(vnode('div', {}, [vnode('div')]))
      const nodeB = vnode('div', {}, [tnode('hello')])
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div>hello</div>')
      expect(nodeB.children[0].el).to.be.ok
    })
    it('patches type matching children', () => {
      const [nodeA] = mount(vnode('div', {}, [vnode('div')]))
      const nodeB = vnode('div', {}, [vnode('div', {id: 'foo'})])
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      expect(
        patcher.patch.calledWith(nodeA.children[0], nodeB.children[0])
      ).to.be.true
    })
  })
})
