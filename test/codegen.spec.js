/* eslint-env mocha */
import jsdom from 'jsdom'
import {expect} from 'chai'

import {
  codegen,
  codegenOptions,
  codegenTextNode,
  codegenChildren,
  codegenElementNode,
  codegenNode,
} from '../src/codegen'
import {vnode, tnode} from '../src/vdom'
import Directive, {
  attr,
  event,
  registerDirective,
  unregisterDirective,
} from '../src/directives'
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
      const app = codegen(root)
      expect(app).instanceOf(Function)

      // const rendered = app.call({
      //   vnode,
      //   tnode,
      //   attr,
      //   event,
      //   username: 'foobar',
      //   msgs: [
      //     {text: 'one', show: true},
      //     {text: 'two', show: false},
      //     {text: 'three', show: true},
      //   ]
      // })
      // TODO: fix this
      // expect(rendered).to.eql(
      //   vnode('div', {attributes: {id: 'app'}}, [
      //     vnode('h1', {}, [tnode(' Hello foobar ')]),
      //     vnode('ul', {}, [
      //       vnode('li', {key: 0}, [tnode('one')]),
      //       null,
      //       vnode('li', {key: 2}, [tnode('three')])
      //     ])
      //   ])
      // )
    })
  })
  describe('codegenOptions', () => {
    const cg = html => codegenOptions(htoe(html))
    it('generates multiple attributes', () => {
      assertCodeIsEqual(
        cg('<p id="foo" class="class1 class2 ${class3}"></p>'),
        `{
          directives: {
            id: attr('id', \`foo\`),
            class: attr('class', \`class1 class2 \${class3}\`)
          }
        }`
      )
    })
    it('generates props', () => {
      expect(cg('<p :foo="foobar"></p>'))
        .to.eql('{props: {foo: foobar}}')
    })
    it('generates events', () => {
      expect(cg('<p @input="handleInput"></p>'))
        .to.eql(`{directives: {'@input': event('input', $event => handleInput)}}`)

      expect(cg('<p @input="handleInput(id)"></p>'))
        .to.eql(`{directives: {'@input': event('input', $event => handleInput(id))}}`)

      assertCodeIsEqual(
        cg('<input @input="handleInput" value="${name}"></input>'),
        `{
          directives: {
            __formBinding: event('input', $event => name = $event.target.value),
            '@input': event('input', $event => handleInput),
            value: attr('value', \`\${name}\`)
          }
        }`
      )
    })
    it('generates directives', () => {
      class Foo extends Directive {}
      registerDirective(Foo)

      expect(cg('<p foo></p>'))
        .to.eql(`{directives: {foo: {name: 'foo', value: undefined, constructor: Foo}}}`)
      expect(cg('<p foo="bar"></p>'))
        .to.eql(`{directives: {foo: {name: 'foo', value: bar, constructor: Foo}}}`)

      unregisterDirective(Foo)
    })
  })
  describe('codegenTextNode', () => {
    it('generates tnode', () => {
      const t = htoe('foo ${bar}')
      expect(codegenTextNode(t)).to.eql('tnode(`foo ${bar}`)')
    })
  })
  describe('codegenChildren', () => {
    it('generates children', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      const code = codegenChildren(el)
      expect(code).to.eql(
        `[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])]`
      )
    })
  })
  describe('codegenElement', () => {
    it('generates for an element with no children and no attributes', () => {
      const el = htoe('<div/>')
      expect(codegenElementNode(el)).to.eql(`vnode('div',{},[])`)
    })
    it('generates for an element with attributes and no children', () => {
      const el = htoe(
        '<div id="foo" class="class1 class2 ${class3}"/>'
      )
      const code = codegenElementNode(el)
      assertCodeIsEqual(
        code,
        `vnode(
          'div',
          {
            directives: {
              id: attr('id', \`foo\`),
              class: attr('class', \`class1 class2 \${class3}\`)
            }
          },
          []
        )`
      )
    })
    it('generates for an element with children and no attributes', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      const code = codegenElementNode(el)
      expect(code).to.eql(
        "vnode('div',{},[vnode('p',{},[]),vnode('span',{},[]),vnode('h1',{},[])])"
      )
    })
    it('generates for an element with i-if', () => {
      const el = htoe('<div i-if="toggle" />')
      const code = codegenElementNode(el)
      expect(code).to.eql(
        "toggle ? vnode('div',{},[]) : null"
      )
    })
    it('generates for an element with i-for', () => {
      const el = htoe('<div i-for="val of vals" />')
      const code = codegenElementNode(el)
      expect(code).to.eql(
        "...vals.map((val, $index) => vnode('div',{key: $index},[]))"
      )
    })
    it('generates for an element with i-for and i-if', () => {
      const el = htoe('<div i-for="val of vals" i-if="toggle" />')
      const code = codegenElementNode(el)
      expect(code).to.eql(
        "...vals.map((val, $index) => toggle ? vnode('div',{key: $index},[]) : null)"
      )
    })
    it('generates for an element with children and attributes', () => {
      const el = htoe(
        `<div id="foo" class="class1 class2 \${class3}">
          <p></p><span></span><h1></h1>
        </div>`
      )
      const code = codegenElementNode(el)
      assertCodeIsEqual(
        code,
        `
        vnode(
          'div',
          {
            directives: {
              id: attr('id', \`foo\`),
              class: attr('class', \`class1 class2 \${class3}\`)
            }
          },
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

