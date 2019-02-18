
const Root = (function(h, app) {

    // utils
    const hasOwnProperty = Object.prototype.hasOwnProperty;

    /**
     * inlined Object.is polyfill to avoid requiring consumers ship their own
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
     */
    function is(x, y) {
        // SameValue algorithm
        if (x === y) { // Steps 1-5, 7-10
            // Steps 6.b-6.e: +0 != -0
            // Added the nonzero y check to make Flow happy, but it is redundant
            return x !== 0 || y !== 0 || 1 / x === 1 / y;
        } else {
            // Step 6.a: NaN == NaN
            return x !== x && y !== y;
        }
    }

    /**
     * Performs equality by iterating through keys on an object and returning false
     * when any key has values which are not strictly equal between the arguments.
     * Returns true when the values of all keys are strictly equal.
     */
    function shallowEqual(objA, objB) {
        if (is(objA, objB)) {
            return true;
        }

        if (typeof objA !== 'object' || objA === null ||
            typeof objB !== 'object' || objB === null) {
            return false;
        }

        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        if (keysA.length !== keysB.length) {
            return false;
        }

        // Test for A's keys different from B.
        for (let i = 0; i < keysA.length; i++) {
            if (
            !hasOwnProperty.call(objB, keysA[i]) ||
            !is(objA[keysA[i]], objB[keysA[i]])
            ) {
            return false;
            }
        }

        return true;
    }


    /**
     * But: avoir plusieurs instances de hyperapp dans un DOM
     * Avantages: Ne pas avoir a re-render tout le dom pour un modification d'un tick par exemple
     * Inconvénients: plusieurs 'composants', plusieurs hyperapps, enfants les uns des autres
     * Pbs:
     * - une instance de hyperapp ne doit pas render une autre instance enfant de celle-ci (key ?)
     * => key=root
     * 
     * - une instance de hyperapp enfant d'une autre doit avoir possibiliter de se gerer avec les hooks (update / destroy) & remove (exists but not in dom) ?
     * => wrap le root dans une vnode (div) avec les hooks sur le compo root
     * <div key="$Root${id}" ondestroy=${destroy instance}>
     *      -- new hyperapp --
     *      ${... children}
     *      -- end new hyperapp --
     * </div>
     * 
     * - possibiliter de passer des props a une root et l'update en fonction
     * => action dediée (update ?) dans l'instance root
     * 
     * - passer le vdom a render dans la nouvelle instance
     * => childrens / composant en prop
     * <Root>
     *  <Component />
     * <//>
     * <Root component="Component" />
     * 
     * - re-render dans le parent ne doit pas re-creer un enfant
     * => moyen global de savoir si l'enfant a ete render
     * {
     *      $Root$Id: hyperapp instance
     * }
     * 
     * - la modification de props depuis le parent doit modifier l'enfant
     * =>
     * <Root a=b /> => <div $Root$id>-- hyperapp instance --</div>
     * globalMap[$Root$Id] !== null && globalMap[$Root$Id].update(props)
     * update check si différence et si oui re-render
     * 
     * - unmouting child instances
     * => boolean flag to render or not the instance
     * 
     * Call tree
     * 
     * Parent
     *  <Root props>
     *      h(Root, props, children)
     *          fetch or create instance of hyperapp
     *              if create : create wrapper vnode and binds lifecycles hooks to actions
     *            
     * 
     * function Root({ view, action, state, ... props }) {
     *      
     * }
     * 
     * <div key=$Root$Id oncreate=(element) => {
     *      
     *      globalMap[$Root$Id (closure)] = app(cmp.state, cmp.actions, cmp.view, element)
     * } 
     */

    /**
     * map containing all running instances of roots on the page
     */
    const roots = {}

    /**
     * special keys for root instances in the state or actions
     */
    const reservedKeys = {
        id: '$$id$$',
        mounted: '$$mounted$$',

        create: '$$create$$',
        update: '$$update$$',
        destroy: '$$destroy$$',
    }

    /**
     * wrap view, state and actions to be able to render it in another instance
     */
    const proxy = {
        state: (id, real) => ({ 
            ... real,
            props: {},
            children: [],

            [reservedKeys.id]: id,
            [reservedKeys.mounted]: false,
        }),

        view: real => (state, actions) => state[reservedKeys.mounted]
            ? real(state, actions)
            : "",

        actions: real => ({
            ... real,

            [reservedKeys.create]: (props, children) => oldState => {
                let state = {
                    [reservedKeys.mounted]: true,
                    props: props,
                    children: children
                }

                if (real.create) {
                    state = Object.assign(
                        state,
                        real.create(oldState, props, children)
                    )
                }
                return state
            },

            [reservedKeys.update]: (props, children) => state => {
                if (real.update) {
                    return real.update(state, props, children)
                }

                return shallowEqual(state.props, props)
                    ? state
                    : { props, children }
            },

            [reservedKeys.destroy]: () => state => {
                if (real.destroy) {
                    real.destroy(state)
                }

                return {
                    [reservedKeys.mounted]: false
                }
            }
        })
    }

    function Root(
        { key, view, actions, state, props = null, ... rest },
        children
    ) {
        if (props === null) props = rest

        const id = `$Root$${key}`;

        if (roots.hasOwnProperty(id) && roots[id] !== null) {
            // update existing instance
            roots[id].app[reservedKeys.update](props, children)

            return roots[id].vnode
        } else {
            // create a new instance

            /*
            the vnode will have a unique 'key' attribute to prevent
            useless updates & re-rendering of the child instance

            but also a rootid dom attribute, containing the root id, to fetch the hyperapp instance from the lifecycle hooks, where only the element is passed on parameter
            */
            const vnode = h('div', {
                key: id,
                'data-rootid': id
            })

            const oncreate = (element) => {
                /*
                create the instance using the proxies for
                lifecycle actions and needed state keys
                */
                const instance = app(
                    proxy.state(id, state), 
                    proxy.actions(actions), 
                    proxy.view(view),
                    element
                )

                // update the global map of roots
                roots[element.dataset.rootid] = {

                    // element reference not used actually
                    el: element,

                    /*
                    vnode reference returned for each successive call of 'Root' after the instance is created, used to stop the update propagation from the parent
                    */
                    vnode: vnode,

                    /*
                    hyperapp instance reference for actions call
                    */
                    app: instance
                }

                // mount the instance by calling the 'create' action
                instance[reservedKeys.create](props, children)
            }

            const onremove = (element, done) => {
                const instance = roots[element.dataset.rootid]
                // unmount the instance if it exists
                if (instance) instance.app[reservedKeys.destroy]()
                // set the reference to null for future checks
                roots[element.dataset.rootid] = null
                delete roots[element.dataset.rootid]

                // remove the element from the dom
                done()
            }

            /*
            here's the trick part
            The hyperapp instance is created after it's container is rendered in the parent application.
            Hyperapp says that 'oncreate' hook is called just after the newly created node is inserted, so that's where we can get a reference for our container
            */
            vnode.attributes.oncreate = oncreate

            vnode.attributes.onremove = onremove

            return vnode
        }
    }

    return Root
})(hyperapp.h, hyperapp.app)