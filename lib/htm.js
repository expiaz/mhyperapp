(function (global){

const CACHE = {};

const TEMPLATE = document.createElement('template');

const reg = /(\$_h\[\d+\])/g;

function html(statics) {
	const tpl = CACHE[statics] || (CACHE[statics] = build(statics));
	// eslint-disable-next-line prefer-rest-params
	return tpl(this, arguments);
}

/** Create a template function given strings from a tagged template. */
function build(statics) {
	let str = statics[0], i = 1;
	while (i < statics.length) {
		str += '$_h[' + i + ']' + statics[i++];
	}
	// Template string preprocessing:
	// - replace <${Foo}> with <c c@=${Foo}>
	// - replace <x /> with <x></x>
	// - replace <${Foo}>a<//>b with <c c@=${Foo}>a</c>b
	TEMPLATE.innerHTML = str
		.replace(/<(?:(\/)\/|(\/?)(\$_h\[\d+\]))/g, '<$1$2c c@=$3')
		.replace(/<([\w:-]+)(?:\s[^<>]*?)?(\/?)>/g, (str, name, a) => (
			str.replace(/(?:'.*?'|".*?"|([A-Z]))/g, (s, c) => c ? ':::'+c : s) + (a ? '</'+name+'>' : '')
		))
		.trim();

	/* allow multiple root elements
	const rootEls = Array.from((TEMPLATE.content || TEMPLATE).children);
	if (rootEls.length > 1) {
		console.log(a = 'return [' + rootEls.map(walk).join(',') + ']')
		return Function('h', '$_h', a);
	}
	return Function('h', '$_h', 'return ' + walk(rootEls[0]));
	*/
	return Function('h', '$_h', 'return ' + (a = walk((TEMPLATE.content || TEMPLATE).firstChild)));
}

/** Traverse a DOM tree and serialize it to hyperscript function calls */
function walk(n) {
	if (n.nodeType != 1) {
		if (n.nodeType == 3 && n.data) return field(n.data, ',');
		return 'null';
	}
	let str = '',
		nodeName = field(n.localName, str),
		sub = '',
		start = ',({';
	for (let i=0; i<n.attributes.length; i++) {
		const name = n.attributes[i].name;
		const value = n.attributes[i].value;
		if (name=='c@') {
			nodeName = value;
		}
		else if (name.substring(0,3)=='...') {
			sub = '';
			start = ',Object.assign({';
			str += '},' + name.substring(3) + ',{';
		}
		else {
			str += `${sub}"${name.replace(/:::(\w)/g, (s, i) => i.toUpperCase())}":${value ? field(value, '+') : true}`;
			sub = ',';
		}
	}
	str = 'h(' + nodeName + start + str + '})';
	let child = n.firstChild;
	while (child) {
		str += ',' + walk(child);
		child = child.nextSibling;
	}
	return str + ')';
}

/** Serialize a field to a String or reference for use in generated code. */
function field(value, sep) {
	const matches = value.match(reg);
	let strValue = JSON.stringify(value);
	if (matches != null) {
		if (matches[0] === value) return value;
		strValue = strValue.replace(reg, `"${sep}$1${sep}"`).replace(/"[+,]"/g, '');
		if (sep == ',') strValue = `[${strValue}]`;
	}
	return strValue;
}

global.htm = html

})(window)