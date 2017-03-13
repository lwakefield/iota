/* eslint-env jest */
import Iota from '../../src/index'
import beautify from 'js-beautify'

function assertCode (codeOrNode) {
  const code = typeof codeOrNode === 'string' ?
    codeOrNode :
    codeOrNode.outerHTML
  expect(beautify.html(code)).toMatchSnapshot()
}

function $ () {
  return Array.from(document.querySelectorAll(...arguments))
}

test('todomvc2', () => {

  document.body.innerHTML = `
    <template id="todo">
      <div class="todo">
        <input type="checkbox" checked="\${todo.completed}">
        <label>\${todo.title}</label>
        <input type="text" value="\${todo.title}">
        <button @click="remove">&times;</button>
      </div>
    </template>

    <template id="todo-list">
      <ul>
        <li i-for="t of todos">
          <todo :id="$index"></todo>
        </li>
      </ul>
    </template>

    <template id="todo-form">
      <div class="todo-form">
        <input type="text" value="\${todo}" @keyup="handle">
      </div>
    </template>

    <div id="app">
      <h1>todo list</h1>
      <todo-form></todo-form>
      <todo-list></todo-list>
    </div>
  `

  const todos = [
    {title: 'foo', completed: true},
    {title: 'bar', completed: true},
    {title: 'baz', completed: true},
    {title: 'qux', completed: true},
  ]

  // A lot of these classes *could* use class properties...
  class Todo extends Iota.Component {
    constructor () {
      super(...arguments)
      this.$data = {todos}
    }
    get todo () {
      return this.todos[this.id] || {}
    }
    remove () {
      this.todos.splice(this.id, 1)
    }
  }
  Todo.$template = document.querySelector('#todo')

  class TodoList extends Iota.Component {
    constructor () {
      super(...arguments)
      this.$data = {todos}
    }
  }
  TodoList.$template = document.querySelector('#todo-list')
  TodoList.register('todo', Todo)

  class TodoForm extends Iota.Component {
    constructor () {
      super(...arguments)
      this.$data = {todos, todo: ''}
    }
    handle (event) {
      if (event.key === 'Enter') {
        this.todos.push({
          title: this.todo,
          completed: false
        })
        this.todo = ''
      }
    }
  }
  TodoForm.$template = document.querySelector('#todo-form')

  class App extends Iota.Component {
    constructor () {
      super(...arguments)
      this.$data = {todos}
    }
  }
  App.$template = document.querySelector('#app')
  App.register('todo-list', TodoList)
  App.register('todo-form', TodoForm)

  const app = new App
  app.mount(document.querySelector('#app'))

  assertCode($('body')[0])

  const [newTodoInput] = $('.todo-form input')
  newTodoInput.value = 'new todo'
  newTodoInput.dispatchEvent(new Event('input'))
  newTodoInput.dispatchEvent(new KeyboardEvent('keyup', {key: 'Enter'}))

  assertCode($('body')[0])

  $('.todo button')[0].dispatchEvent(new Event('click'))

  assertCode($('body')[0])
})
