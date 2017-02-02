/* eslint-env jest */
import Iota from '../../src'

describe('simple todo app', () => {
  document.body.innerHTML = `
    <div id="app">
      <new-todo></new-todo>
      <todo i-for="t of todos" :id="$index"></todo>
    </div>

    <template id="new-todo">
      <form>
        <input type="text" value="\${todo}" />
        <button @click="add" name="new-todo">Add</button>
      </form>
    </template>

    <template id="todo">
      <div>
        \${id} - \${todo}
        <button @click="remove" name="remove-todo"></button>
      </div>
    </template>
  `

  const todos = []

  class NewTodo extends Iota.Component {
    static $template = document.querySelector('#new-todo')
    $data = {todo: '', todos}

    add () {
      this.todos.push(this.todo)
      this.todo = ''
    }
  }
  Iota.registerComponent('new-todo', NewTodo)

  class Todo extends Iota.Component {
    static $template = document.querySelector('#todo')
    $data = {todo: todos[this.id], todos}

    remove () {
      this.todos.splice(this.id, 1)
    }
  }
  Iota.registerComponent('todo', Todo)

  class App extends Iota.Component {
    static $template = document.querySelector('#app')
    $data = {todos}
  }
  const app = new App
  app.mount(document.querySelector('#app'))

  it('functions correctly', () => {
    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('input').value = 'foo'
    document.querySelector('input').dispatchEvent(new Event('input'))
    document.querySelector('button[name="new-todo"]')
      .dispatchEvent(new Event('click'))
    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('input').value = 'bar'
    document.querySelector('input').dispatchEvent(new Event('input'))
    document.querySelector('button[name="new-todo"]')
      .dispatchEvent(new Event('click'))
    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('button[name="remove-todo"]')
      .dispatchEvent(new Event('click'))
    expect(document.body.outerHTML).toMatchSnapshot()
  })
})
