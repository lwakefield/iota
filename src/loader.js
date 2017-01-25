import {expect} from 'chai'
import {jsdom} from 'jsdom'
import {codegenNode} from './codegen'

module.exports = function (content) {
  const doc = jsdom(content)
  const template = doc.querySelector('template')
  const script = doc.querySelector('script')

  // we want to compile the template, then inject it into the script

  const src = codegenNode(template.content)
  return script.innerHTML
}
