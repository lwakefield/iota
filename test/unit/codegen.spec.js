/* eslint-env jest */
import beautify from 'js-beautify'

import {
  codegen,
  codegenOptions,
  codegenTextNode,
  codegenChildren,
  codegenElementNode,
} from '../../src/codegen'
import Directive, {
  registerDirective,
  unregisterDirective,
} from '../../src/directives'
import {htoe} from './util'

const assertCode = code => expect(beautify.js(code)).toMatchSnapshot()

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
      expect(app).toBeInstanceOf(Function)

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
      assertCode(cg('<p id="foo" class="class1 class2 ${class3}"></p>'))
    })
    it('generates props', () => {
      assertCode(cg('<p :foo="foobar"></p>'))
    })
    it('generates events', () => {
      assertCode(cg('<p @input="handleInput"></p>'))
      assertCode(cg('<p @input="handleInput(id)"></p>'))
      assertCode(cg('<input @input="handleInput" value="${name}"></input>'))
    })
    it('generates directives', () => {
      class Foo extends Directive {}
      registerDirective(Foo)

      assertCode(cg('<p foo></p>'))
      assertCode(cg('<p foo="bar"></p>'))

      unregisterDirective(Foo)
    })
  })

  describe('codegenTextNode', () => {
    it('generates tnode', () => {
      const t = htoe('foo ${bar}')
      assertCode(codegenTextNode(t))
    })
  })

  describe('codegenChildren', () => {
    it('generates children', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      assertCode(codegenChildren(el))
    })
  })

  describe('codegenElement', () => {
    it('generates for an element with no children and no attributes', () => {
      assertCode(codegenElementNode(htoe('<div />')))
    })
    it('generates for an element with attributes and no children', () => {
      const el = htoe(
        '<div id="foo" class="class1 class2 ${class3}"/>'
      )
      const code = codegenElementNode(el)
      assertCode(code)
    })
    it('generates for an element with children and no attributes', () => {
      const el = htoe('<div><p></p><span></span><h1></h1></div>')
      assertCode(codegenElementNode(el))
    })
    it('generates for an element with i-if', () => {
      const el = htoe('<div i-if="toggle" />')
      assertCode(codegenElementNode(el))
    })
    it('generates for an element with i-for', () => {
      const el = htoe('<div i-for="val of vals" />')
      assertCode(codegenElementNode(el))
    })
    it('generates for an element with i-for and i-if', () => {
      const el = htoe('<div i-for="val of vals" i-if="toggle" />')
      assertCode(codegenElementNode(el))
    })
    it('generates for an element with children and attributes', () => {
      const el = htoe(
        `<div id="foo" class="class1 class2 \${class3}">
          <p></p><span></span><h1></h1>
        </div>`
      )
      assertCode(codegenElementNode(el))
    })
  })
})

