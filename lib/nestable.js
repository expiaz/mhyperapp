
// implemention de roots par les mainteneurs de hyperapp
// beaucoup plus simple, mais pas propre ni opti

/*
instance jamais clean ? (voir sous chrome)
updates a chaque changement du parent (onupdate::el._$r()) non conditionnel

ne revoit pas la meme vnode pour empecher l'update du parent vers l'enfant
mais utilise le meme nom de vnode pour ne faire un update que des attributs de
la vnode container

surcharge l'element container créer (el) pour retrouver les props & childrens,
fonctions proxy (render, uninit)
*/
function nestable (state, actions, view, tagname) {
    actions._$r = function () {return {}}
    return function (props, children) {
        return h(tagname || 'div', {
            key: props.key,
            id: props.id,
            class: props.class,
            oncreate: function (el) {
                var wired = app(
                    state,
                    actions,
                    function (s, a) {
                        var v = view(s, a)
                        if (typeof v === 'function') v = v(el._$p, el._$c)
                        return v
                    },
                    el
                )
                el._$p = props
                el._$c = children
                el._$r = wired._$r
                el._$u = wired.uninit
                wired.init && wired.init(props, children)
                props.oncreate && props.oncreate(el)
            },
            onupdate: function (el) {
                el._$p = props
                el._$c = children
                el._$r()
                props.onupdate && props.onupdate(el)
            },
            ondestroy: function (el) {
                el._$u && el._$u()
            },
            onremove: function (el, done) {
               if (!props.onremove) return done()

               props.onremove(el, done)
            }
        })
    }    
}