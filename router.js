// <Link go="/path/to" state="{}" />

// <Route component="Component" match="*" />

// <Route [for="Component"] path="/" params="{id: ">

`^/${path.replace(/:(\d+|\w+)/g, (_, match) => '(.[^\/]*)')}`

new RegExp('^/' + route.replace(/:(\d+|\w+)/g, function (global, match) {
    if (params.hasOwnProperty(match))
        return 
    _vars.push(match);
    return "(.[^\/]*)";
}) + '$')

function route (path = '/', params = {}) {
    return path.replace(/:(\d+|\w+)/g, (_, key) => '(' +
        (params[key] || '.[^\/]*').toString().slice(1, -1) +
    ')')
}

const Router = ({ back, forward }, children) => {

}

function parseRoute(path, parameters)

const Route = ({ router = null, component = null, path = '/', params = {} }, children) => {
    if (!router) throw new Error('<Route> instance must be wrapped into <Router>')

    const keys = []
    const regexp = new RegExp('^/' + path.replace(
        /:(\d+|\w+)/g,
        (_, param) => params[param]
            ? `(${keys.push(param) && params[param].toString().slice(1, -1)})` // remove starting and ending / from /regexp/
            : '(.[^\/]*)' // generic capture
    ) + '$')

    const match = router.match(regexp, keys)
    return match
        ? (component && component(match) || children)
        : []
}