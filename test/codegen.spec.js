/* eslint-env mocha */
import jsdom from 'jsdom'
import {expect} from 'chai'

import Codegen from '../src/codegen'
import {vnode, tnode} from '../src/vdom'
import {
  htoe,
  assertCodeIsEqual,
} from './util'

beforeEach(() => {
  const window = jsdom.jsdom().defaultView
  const document = window.document
  global['window'] = window
  global['document'] = document
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
    it('generates props', () => {
      const p = htoe(
        '<p :foo="foobar"></p>'
      )
      expect(Codegen.codegenAttributes(p))
        .to.eql('{props: {foo: foobar}}')
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
