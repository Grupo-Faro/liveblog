#!/usr/bin/env node
/**
 * Generate the JavaScript translation file (Jed JSON) from the PO catalogues.
 *
 * `wp_set_script_translations( 'liveblog', 'liveblog', <plugin>/languages )`
 * makes WordPress look for `languages/liveblog-<locale>-liveblog.json`
 * (<domain>-<locale>-<script handle>.json) and inline it before app.js, so
 * every `__( '…', 'liveblog' )` in the React bundle (lazy chunks included)
 * gets its translation from the same `wp.i18n` registry.
 *
 * The PO files stay the single source of truth: this script scans src/ for
 * strings passed to __() / _x() / _n() / _nx() with the "liveblog" domain and
 * copies their translations from each languages/liveblog-<locale>.po.
 *
 * Usage: npm run i18n:json
 */
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const SRC = path.join( ROOT, 'src' );
const LANG = path.join( ROOT, 'languages' );
const DOMAIN = 'liveblog';
const HANDLE = 'liveblog';
const CONTEXT_SEPARATOR = '\u0004';

/**
 * Recursively list JavaScript source files (tests excluded).
 *
 * @param {string}   dir Directory to walk.
 * @param {string[]} out Accumulator.
 * @return {string[]} File paths.
 */
function walk( dir, out = [] ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const file = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( entry.name !== '__tests__' ) {
				walk( file, out );
			}
		} else if ( file.endsWith( '.js' ) ) {
			out.push( file );
		}
	}
	return out;
}

/**
 * Unquote a JavaScript string literal (single or double quoted).
 *
 * @param {string} literal Quoted literal.
 * @return {string} Its value.
 */
function unquote( literal ) {
	return literal
		.slice( 1, -1 )
		.replace( /\\(['"\\])/g, '$1' )
		.replace( /\\n/g, '\n' );
}

/**
 * Collect the translatable strings used in the JavaScript sources.
 *
 * @return {Map<string, {singular: string, plural?: string, context?: string}>} Keyed by Jed key.
 */
function collectStrings() {
	const STRING = `(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`;
	const ARG = `(?:${ STRING }|[A-Za-z_$][\\w$.]*)`;
	const callRe = new RegExp(
		`\\b(__|_x|_n|_nx)\\(\\s*(${ STRING })((?:\\s*,\\s*${ ARG })*)\\s*\\)`,
		'g'
	);
	const argRe = new RegExp( `${ STRING }|[A-Za-z_$][\\w$.]*`, 'g' );
	const strings = new Map();

	for ( const file of walk( SRC ) ) {
		const source = fs.readFileSync( file, 'utf8' );
		let match;
		while ( ( match = callRe.exec( source ) ) ) {
			const fn = match[ 1 ];
			const args = [ match[ 2 ], ...( match[ 3 ].match( argRe ) || [] ) ];
			const literals = args.map( ( a ) => ( /^['"]/.test( a ) ? unquote( a ) : null ) );
			// The text domain is always the last argument.
			if ( literals[ literals.length - 1 ] !== DOMAIN ) {
				continue;
			}
			const entry = { singular: literals[ 0 ] };
			if ( fn === '_x' || fn === '_nx' ) {
				entry.context = literals[ fn === '_x' ? 1 : 2 ];
			}
			if ( fn === '_n' || fn === '_nx' ) {
				entry.plural = literals[ 1 ];
			}
			const key = ( entry.context ? entry.context + CONTEXT_SEPARATOR : '' ) + entry.singular;
			strings.set( key, entry );
		}
	}

	return strings;
}

/**
 * Minimal PO parser: enough for msgctxt / msgid / msgid_plural / msgstr[n].
 *
 * @param {string} content PO file content.
 * @return {{headers: Object<string,string>, entries: Map<string, string[]>}} Parsed catalogue.
 */
function parsePo( content ) {
	const unescape = ( s ) =>
		s.replace( /\\(n|t|"|\\)/g, ( _, c ) => ( { n: '\n', t: '\t', '"': '"', '\\': '\\' }[ c ] ) );
	const entries = new Map();
	let headers = {};
	let current = null;
	let field = null;

	const flush = () => {
		if ( ! current || current.msgid === undefined ) {
			return;
		}
		if ( current.msgid === '' && ! current.msgctxt ) {
			headers = Object.fromEntries(
				( current.msgstr[ 0 ] || '' )
					.split( '\n' )
					.filter( ( l ) => l.includes( ':' ) )
					.map( ( l ) => {
						const i = l.indexOf( ':' );
						return [ l.slice( 0, i ).trim(), l.slice( i + 1 ).trim() ];
					} )
			);
		} else {
			const key = ( current.msgctxt ? current.msgctxt + CONTEXT_SEPARATOR : '' ) + current.msgid;
			entries.set( key, current.msgstr );
		}
	};

	for ( const rawLine of content.split( /\r?\n/ ) ) {
		const line = rawLine.trim();
		if ( line === '' || line.startsWith( '#' ) ) {
			if ( line === '' ) {
				flush();
				current = null;
				field = null;
			}
			continue;
		}
		const keyword = line.match( /^(msgctxt|msgid_plural|msgid|msgstr(?:\[(\d+)\])?)\s+(".*")$/ );
		if ( keyword ) {
			if ( ! current ) {
				current = { msgstr: [] };
			}
			const value = unescape( keyword[ 3 ].slice( 1, -1 ) );
			if ( keyword[ 1 ].startsWith( 'msgstr' ) ) {
				field = [ 'msgstr', Number( keyword[ 2 ] || 0 ) ];
				current.msgstr[ field[ 1 ] ] = value;
			} else {
				field = [ keyword[ 1 ] ];
				current[ keyword[ 1 ] ] = value;
			}
			continue;
		}
		if ( line.startsWith( '"' ) && current && field ) {
			const value = unescape( line.slice( 1, -1 ) );
			if ( field[ 0 ] === 'msgstr' ) {
				current.msgstr[ field[ 1 ] ] += value;
			} else {
				current[ field[ 0 ] ] += value;
			}
		}
	}
	flush();

	return { headers, entries };
}

const strings = collectStrings();
const poFiles = fs
	.readdirSync( LANG )
	.filter( ( f ) => new RegExp( `^${ DOMAIN }-[A-Za-z_]+\\.po$` ).test( f ) );

for ( const poFile of poFiles ) {
	const locale = poFile.slice( DOMAIN.length + 1, -3 );
	const { headers, entries } = parsePo( fs.readFileSync( path.join( LANG, poFile ), 'utf8' ) );
	const localeData = {
		'': {
			domain: 'messages',
			lang: headers.Language || locale,
			'plural-forms': headers[ 'Plural-Forms' ] || 'nplurals=2; plural=(n != 1);',
		},
	};
	let count = 0;

	for ( const [ key, entry ] of strings ) {
		const translation = entries.get( key );
		if ( ! translation || ! translation[ 0 ] ) {
			continue;
		}
		localeData[ key ] = entry.plural ? [ translation[ 0 ], translation[ 1 ] || '' ] : [ translation[ 0 ] ];
		count++;
	}

	const target = path.join( LANG, `${ DOMAIN }-${ locale }-${ HANDLE }.json` );
	if ( count === 0 ) {
		if ( fs.existsSync( target ) ) {
			fs.unlinkSync( target );
		}
		continue;
	}

	const json = {
		'translation-revision-date': headers[ 'PO-Revision-Date' ] || new Date().toISOString(),
		generator: 'liveblog/bin/make-script-json.js',
		domain: 'messages',
		locale_data: { messages: localeData },
	};
	fs.writeFileSync( target, JSON.stringify( json, null, '\t' ) + '\n' );
	process.stdout.write( `${ path.relative( ROOT, target ) }: ${ count }/${ strings.size } strings\n` );
}
