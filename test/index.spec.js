import {expect} from 'chai'
import jsdom from 'jsdom'

import {tnode, Codegen} from '../src'

function assertCodeIsEqual(codeA, codeB) {
  const normalize = s => s.split('\n')
    .map(v => v.trim())
    .filter(v => !!v)
    .join('')
  expect(normalize(codeA)).to.eql(normalize(codeB))
}

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
})

describe('tnode', () => {
  it('instantiates correctly with no params', () => {
    expect(tnode()).to.eql(undefined)
  })
  it('instantiates correctly with string param', () => {
    expect(tnode('foo')).to.eql('foo')
  })
})

describe('Codegen', () => {
  describe('codegenAttributes', () => {
    it('generates multiple attributes', () => {
      const p = document.createElement('p')
      p.setAttribute('id', 'foo')
      p.setAttribute('class', 'class1 class2 ${class3}')
      expect(Codegen.codegenAttributes(p))
        .to.eql('{id: `foo`,class: `class1 class2 ${class3}`}')
    })
  })
  describe('codegenTextNode', () => {
    it('generates tnode', () => {
      const t = document.createTextNode('foo ${bar}')
      expect(Codegen.codegenTextNode(t)).to.eql('tnode(`foo ${bar}`)')
    })
  })
  describe('codegenChildren', () => {
    it('generates children', () => {
      const el = document.createElement('div')
      el.innerHTML = '<p></p><span></span><h1></h1>'
      const code = Codegen.codegenChildren(el)
      expect(code).to.eql(
        `[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])]`
      )
    })
  })
  describe('codegenElement', () => {
    it('generates for an element with no children and no attributes', () => {
      const el = document.createElement('div')
      expect(Codegen.codegenElementNode(el)).to.eql(`vnode('div',{},[])`)
    })
    it('generates for an element with attributes and no children', () => {
      const el = document.createElement('div')
      el.setAttribute('id', 'foo')
      el.setAttribute('class', 'class1 class2 ${class3}')
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "vnode('div',{id: `foo`,class: `class1 class2 ${class3}`},[])"
      )
    })
    it('generates for an element with children and no attributes', () => {
      const el = document.createElement('div')
      el.innerHTML = '<p></p><span></span><h1></h1>'
      const code = Codegen.codegenElementNode(el)
      expect(code).to.eql(
        "vnode('div',{},[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])])"
      )
    })
    it('generates for an element with children and attributes', () => {
      const el = document.createElement('div')
      el.innerHTML = '<p></p><span></span><h1></h1>'
      el.setAttribute('id', 'foo')
      el.setAttribute('class', 'class1 class2 ${class3}')
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
