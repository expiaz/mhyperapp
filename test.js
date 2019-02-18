const {htm, hyperapp} = window
const {h, app} = hyperapp

const html = htm.bind(h)

const filterType = {
    DONE: 0,
    TODO: 1,
    ALL: 2
}

const state = {
    id: 0,
    todos: [],
    input: '',
    filter: filterType.ALL
}

const actions = {
    /**
     * Triggers only if 'input' field is not blank
     * 
     * increment the global todo 'id'
     * add a new todo whose content is the 'input' of the state
     * reset the 'input' field
     * 
     * @return {Function} to access the state
     */
    add: () => state => state.input.trim().length ? ({
        id: ++state.id,
        todos: [... state.todos, {
            id: state.id,
            value: state.input,
            done: false
        }],
        input: ''
    }) : state,

    /**
     * toggle the 'done' field of a todo
     * 
     * @param {Number} id unique id of the todo to toggle
     * @return {Function} to access the state
     */
    complete: id => state => ({
        todos: state.todos.map(todo =>
            (todo.id === id) ? {...todo, done: !todo.done} : todo
        )
    }),

    /**
     * update the input field
     * 
     * @param {String} value the input's content
     */
    input: value => ({
        input: value
    }),

    /**
     * filter todo list
     * 
     * @param {filterType} filter current filter
     */
    filter: filter => ({
        filter
    })
}


const Filters = ({ active, click }) => html`
    <div>
        <span>Filter by :</span>
        ${Object.keys(filterType).map(k => html`
            <a
                class="filter ${active === filterType[k] && "active"}"
                href="#"
                onclick="${e => {
                    e.preventDefault()
                    click(filterType[k])
                }}">
                ${k}
            </a>
        `)}
    </div>
`

const Todo = ({ id, value, done, toggle }) => html`
    <li
        key="${id}"
        class="${done && 'done'}"
        onclick="${() => toggle(id)}"
    >
        ${value}
    </li>
`

const TodoList = ({ todos, complete, filter }) => html`
    <ul class="div-id">
        ${todos.filter(({ done }) => {
            if (filter === filterType.ALL) return true;
            else if (filter === filterType.DONE && done) return true;
            else if (filter === filterType.TODO && !done) return true;
            else return false;
        }).map(({ id, value, done }) => html`
            <${Todo} ...${{ id, value, done }} toggle="${complete}" />
        `)}
    </ul>
`

const view = (state, actions) => html`
    <div>
        <${Filters} click="${actions.filter}" active="${state.filter}"/>
        <${TodoList} todos="${state.todos}" complete="${actions.complete}" filter="${state.filter}" />
        <input
            name="todo"
            placeholder="to do ..."
            value="${state.input}"
            oninput="${({ target: {value} }) => actions.input(value)}"
            onkeyup="${({ keyCode }) => keyCode === 13 && actions.add()}"
        />
    </div>
`

const root = (s, a) => html`
    <div>
        ${view(s, a)}
        ${s.id % 2 === 0 ? html`
            <${Root} key=${s.id} state=${state} view=${view} actions=${{
                ... actions,
                destroy: state => {
                    console.log('destroy', state['$$id$$'])
                },
                create: state => {
                    console.log('create', state['$$id$$'])
                    return {}
                }
            }} props=${{}} />
        ` : ''}
    </div>
`

const container = document.querySelector('main')

const main = app(state, actions, root, container)