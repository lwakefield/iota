/* eslint-env jest */
import Vdoom from '../../src'

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

  const newTodo = Vdoom.component(
    document.querySelector('#new-todo'),
    {
      data: () => ({todo: '', todos}),
      methods: {
        add() {
          this.todos.push(this.todo)
          this.todo = ''
        }
      }
    }
  )
  Vdoom.registerComponent('new-todo', newTodo)

  const todo = Vdoom.component(
    document.querySelector('#todo'),
    {
      data() {
        return {todo: todos[this.id], todos}
      },
      methods: {
        remove() {
          this.todos.splice(this.id, 1)
        }
      }
    }
  )
  Vdoom.registerComponent('todo', todo)

  const app = new Vdoom(
    document.querySelector('#app'),
    {
      data: () => ({todos})
    }
  )

  it('functions correctly', () => {
    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('input').value = 'foo'
    document.querySelector('input').dispatchEvent(new Event('input'))
    document.querySelector('button[name="new-todo"]').dispatchEvent(new Event('click'))

    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('input').value = 'bar'
    document.querySelector('input').dispatchEvent(new Event('input'))
    document.querySelector('button[name="new-todo"]').dispatchEvent(new Event('click'))

    expect(document.body.outerHTML).toMatchSnapshot()

    document.querySelector('button[name="remove-todo"]').dispatchEvent(new Event('click'))

    expect(document.body.outerHTML).toMatchSnapshot()
  })
})
