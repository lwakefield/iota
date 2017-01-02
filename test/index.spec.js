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
  domToVdom,
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
  describe('codegen', () => {
    it('generates a simple app', () => {
      const root = htoe(`
        <div id="app">
          <h1> Hello \${username} </h1>
          <ul>
            <li i-for="m of msgs" i-if="m.show">
              \${m.text}
            </li>
          </ul>
        </div>
      `)
      const app = Codegen.codegen(root)
      expect(app).instanceOf(Function)

      const rendered = app.call({
        vnode,
        tnode,
        username: 'foobar',
        msgs: [
          {text: 'one', show: true},
          {text: 'two', show: false},
          {text: 'three', show: true},
        ]
      })
      expect(rendered).to.eql(
        vnode('div', {id: 'app'}, [
          vnode('h1', {}, [tnode(' Hello foobar ')]),
          vnode('ul', {}, [
            vnode('li', {}, [tnode('one')]),
            null,
            vnode('li', {}, [tnode('three')])
          ])
        ])
      )
    })
  })
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

describe('Patcher', () => {
  describe('patch', () => {
    let _patchAttributes = Patcher.prototype.patchAttributes
    let _patchChildren = Patcher.prototype.patchChildren
    beforeEach(() => {
      Patcher.prototype.patchAttributes = sinon.spy()
      Patcher.prototype.patchChildren = sinon.spy()
    })
    after(() => {
      Patcher.prototype.patchAttributes = _patchAttributes
      Patcher.prototype.patchChildren = _patchChildren
    })
    it('patches an element', () => {
      const nodeA = domToVdom(htoe('<div />'))
      const nodeB = vnode('div')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(patcher.patchAttributes.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.patchChildren.calledWith(nodeA, nodeB)).to.be.true
      expect(patcher.lastNodeA).to.eql(nodeB)
    })
    it('patches text', () => {
      const nodeA = domToVdom(htoe('foo'))
      const nodeB = tnode('bar')
      const patcher = new Patcher(nodeA)
      patcher.patch(nodeB)
      expect(nodeB.el).to.eql(nodeA.el)
      expect(nodeA.el.textContent).to.eql(nodeB.textContent)
      expect(patcher.lastNodeA).to.eql(nodeB)
    })
  })
  describe('patchAttributes', () => {
    const patcher = new Patcher()
    const patchAttributes = patcher.patchAttributes
    it('adds attributes', () => {
      const nodeA = domToVdom(htoe('<div />'))
      const nodeB = vnode('div', {id: 'foo'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="foo"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('updates attributes', () => {
      const nodeA = domToVdom(htoe('<div id="foo" />'))
      const nodeB = vnode('div', {id: 'bar'})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div id="bar"></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
    it('deletes attributes', () => {
      const nodeA = domToVdom(htoe('<div id="foo" />'))
      const nodeB = vnode('div', {})
      patchAttributes(nodeA, nodeB)

      assertHtmlIsEqual(nodeA.el, '<div></div>')
      expect(nodeA.attributes).to.eql(nodeB.attributes)
    })
  })
  describe('patchChildren', () => {
    beforeEach(() => {
      Patcher.prototype._patch = Patcher.prototype.patch
      Patcher.prototype.patch = sinon.spy()
    })
    after(() => {
      Patcher.prototype.patch = Patcher.prototype._patch
      Patcher.prototype._patch = undefined
    })

    function setup (htmlForNodeA, nodeB) {
      const nodeA = domToVdom(htoe(htmlForNodeA))
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
      patcher.patchChildren(nodeA, nodeB)
      assertHtmlIsEqual(nodeA.el, '<div><div></div></div>')
      expect(
        patcher.patch.calledWith(nodeA.children[0], nodeB.children[0])
      ).to.be.true
    })
  })
})
