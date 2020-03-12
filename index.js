/**
* Run a process similar to child_process.{exec,spawn}
* This is a wee bit nicer to use than child_process.spawn as it just takes an array, automatically outputs prefixes, supports promises and rejects when exit code != 0
* @param {array} args Command line or argument sections as an array
* @param {Object} [options] Additional options to specify
* @returns {Promise} A promise which will resolve with the output of the command or reject if the exit code is non-zero
*/
var debug = require('debug')('exec');
var fs = require('fs').promises;
var spawn = require('child_process').spawn;
var spawnArgs = require('spawn-args');
var stream = require('stream');
var isArray = input => typeof input == 'object' && Object.prototype.toString.call(input) == '[object Array]';

var exec = (cmd, args, options) => {
	var promiseChain = Promise.resolve(); // What we will eventually return

	var isPiping = false;
	// Argument mangling {{{
	if (typeof cmd == 'object') { // args - Parse args as an array
		options = args;
		args = cmd;
	} else if (typeof cmd == 'string') { // cmd<s>, [args], [options] - Split into args
		isPiping = /(?<!\\)(\||<|>)/.test(cmd);
		options = args;
		args = exec.split(cmd);
	} else if (typeof cmd == 'string' && typeof args == 'string') { // cmd<s>, args<s>
		args = exec.split(args);
		args.unshift(cmd);
	} else if (typeof cmd == 'string' && isArray(args)) { // cmd<s>, args<a>, [options] - Given command and args, push CMD onto arg stack and disguard
		args.unshift(cmd);
	} else {
		throw new Error('Unknown or unsupported way of calling exec()');
	}
	// }}}

	var settings = {
		...exec.defaults,
		...options,
	};

	// Settings mangling {{{
	if (settings.buffer !== undefined) settings.bufferStdout = settings.bufferStderr = settings.buffer;
	if (settings.log !== undefined) settings.logStdout = settings.logStderr = settings.log;
	if (settings.prefix !== undefined) settings.prefixStdout = settings.prefixStderr = settings.prefix;
	if (settings.reformat !== undefined) settings.reformatStdout = settings.reformatStderr = settings.reformat;
	if (settings.prefixStdout && !settings.logStdout) settings.logStdout = true;
	if (settings.prefixStderr && !settings.logStderr) settings.logStderr = true;
	if (settings.logStdout === true) settings.logStdout = console.log;
	if (settings.logStderr === true) settings.logStderr = console.log;
	if (settings.json && settings.prefixStdout) throw new Error('Json AND prefixStdout (or just prefix) cannot be specified at the same time');
	// }}}

	// Apply aliases {{{
	if (settings.alias[args[0]]) args[0] = settings.alias[args[0]];
	// }}}

	// Hashbang detection {{{
	if (settings.hashbang) // Glue hashbang detection + prefixing onto promise chain
		promiseChain = promiseChain
			.then(()=> { // Read first line into buffer and close
				var fh;
				var readBuf = Buffer.alloc(settings.hashbangReadLength);
				return fs.open(args[0], 'r')
					.then(fd => fd.read(readBuf, 0, settings.hashbangReadLength, 0).then(()=> fd.close))
					.then(()=> readBuf.toString().split('\n')[0].trim())
					.then(hashbang => {
						if (!hashbang.startsWith('#!')) return; // No hashbang
						debug(`Found hashbang for "${args[0]}" = ${hashbang}`);
						args = exec.split(hashbang.substr(2)).concat(args); // Concat hashbang in front of file
					})
					.catch(e => debug(`Error when reading ${args[0]} - ${e.toString()}, assuming no hashbang`)) // Ignore errors and assume the file is a binary
			})
	// }}}

	return promiseChain
		.then(()=> new Promise((resolve, reject) => {
			// Apply aliases (within pipes) {{{
			if ((settings.pipe == 'auto' && isPiping) || settings.pipe === true) { // Apply to piped commands also
				args = args.reduce((t, arg) => {
					if (t.pipePrefix) { // Prefixed by a pipe - this is a command
						if (settings.alias[arg]) arg = settings.alias[arg];
						t.pipePrefix = false; // Reset pipe command
					} else if (arg == '|') { // Seen a pipe - next arg is a command
						t.pipePrefix = true;
					}
					t.cmd.push(arg);
					return t;
				}, {cmd: [], pipePrefix: true}).cmd;
			}
			// }}}
			// Exec process {{{
			var spawnOptions = {
				env: settings.env,
				cwd: settings.cwd,
				uid: settings.uid,
				gid: settings.gid,
				...(settings.stdin && (settings.stdin instanceof stream.Readable || settings.stdin == 'inherit')
					? {stdio: [process.stdin, 'inherit', 'inherit']}
					: null
				)
			};

			var ps;
			if ((settings.pipe == 'auto' && isPiping) || settings.pipe === true) {
				if (debug.enabled) debug('spawn (as shell)', args, '=>', exec.join(args));
				ps = spawn(settings.shell, spawnOptions);
				var pipeCmd = args.join(' ').replace(/\n/g, '\\\\n');
				ps.stdin.write(pipeCmd, ()=> ps.stdin.end());
			} else {
				debug('spawn', args, '=>', exec.join(args));
				var mainCmd = args.shift();
				ps = spawn(mainCmd, args, spawnOptions);
			}
			// }}}

			var outputBuffer = '';

			// Stream handler factory {{{
			var dataFactory = suffix => {
				var eventHandler = data => { // Function to create the stream handlers
					var buf;
					if (typeof data == 'string') { // Given a string, probably a call from a nested dataFactory entry
						buf = data;
						if (settings[`buffer${suffix}`] || settings[`json${suffix}`]) outputBuffer += buf;
					} else {
						buf = data.toString();
						if (settings[`buffer${suffix}`] || settings[`json${suffix}`]) outputBuffer += buf;
						if ( // Refomat input if we are also using prefixers
							settings[`prefix${suffix}`] // Using a prefix AND
							&& settings[`reformat${suffix}`] // We're in reformatting mode AND
							&& /\n/.test(buf) // The input contains new lines
						) {
							buf.split(/\s*\n\s*/).forEach(line => eventHandler(line)); // Call this event handler with each line
							return; // Don't handle anything further as the above should have drained the input buffer
						}
					}

					// Trim
					if (settings.trim) buf = buf.replace(settings.trimRegExp, '')

					// Add prefix + log
					if (settings[`prefix${suffix}`] && typeof settings[`prefix${suffix}`] == 'function') {
						buf = settings[`prefix${suffix}`].apply(this, buf);
						if (buf) settings[`log${suffix}`].call(this, buf);
					} else if (settings[`prefix${suffix}`]) {
						settings[`log${suffix}`].call(this, settings[`prefix${suffix}`], buf.toString());
					} else if (settings[`log${suffix}`]) {
						settings[`log${suffix}`].call(this, buf.toString());
					}
				};
				return eventHandler;
			};
			// }}}

			if (settings.logStdout || settings.prefixStdout || settings.bufferStdout) ps.stdout.on('data', dataFactory('Stdout'));
			if (settings.logStderr || settings.prefixStderr || settings.bufferStderr) ps.stderr.on('data', dataFactory('Stderr'));
			ps.on('close', code => {
				if (settings.resolveCodes.includes(code)) {
					if (settings.json) { // Return as JSON
						outputBuffer = outputBuffer.toString();
						try {
							resolve(JSON.parse(outputBuffer));
						} catch (e) {
							if (outputBuffer.length > settings.jsonInvalidTruncate) outputBuffer = outputBuffer.substr(0, settings.jsonInvalidTruncate) + settings.jsonInvalidTruncateSuffix;
							reject(`Invalid JSON - "${outputBuffer}" (${e.toString()})`);
						}
					} else if (settings.buffer || settings.bufferStdout || settings.bufferStderr) {
						resolve(
							settings.trim
								? outputBuffer.replace(settings.trimRegExp, '')
								: outputBuffer
						)
					} else {
						resolve();
					}
				} else if (typeof settings.rejectError == 'string') {
					return reject(settings.rejectError);
				} else if (settings.rejectError === false) {
					return reject(code);
				} else if (typeof settings.rejectError == 'function') {
					return reject(settings.rejectError(code));
				} else {
					reject();
				}
			});

			// Feed STDIN content
			if (settings.stdin && (settings.stdin instanceof stream.Readable || settings.stdin == 'inherit')) {
				// Pass
			} else if (Buffer.isBuffer(settings.stdin) || typeof settings.stdin == 'string') { // Assume all other STDIN values are readable buffers / strings
				ps.stdin.end(settings.stdin);
			} else if (settings.stdin) {
				throw new Error('Unknown settings.stdin type. Can accept Readable streams, strings or buffers');
			}
		}))
};

exec.defaults = {
	buffer: undefined,
	bufferStdout: false,
	bufferStderr: false,
	log: undefined,
	logStdout: false,
	logStderr: false,
	json: false,
	jsonInvalidTruncate: 30,
	jsonInvalidTruncateSuffix: '…',
	prefix: undefined,
	prefixStdout: undefined,
	prefixStderr: undefined,
	reformat: undefined,
	reformatStdout: true,
	reformatStderr: true,
	trim: true,
	trimRegExp: /[\n\s]+$/m,
	hashbang: true,
	hashbangReadLength: 100,
	resolveCodes: [0],
	shell: '/bin/sh',
	pipe: 'auto',
	rejectError: code => `Non-zero exit code: ${code}`,
	env: undefined,
	cwd: undefined,
	uid: undefined,
	gid: undefined,
	alias: {},
	stdin: undefined,
	stdout: undefined,
};

exec.split = cmd => spawnArgs(cmd, {removequotes: 'always'});

exec.join = args => args
	.map(arg =>
		/\s/.test(arg) // Has spaces?
			? `"${arg.replace(/"/g, '\\"')}"` // Enclose in speachmarks escaping inner speachmarks
			: arg.replace(/^"(.*)"$/, '$1') // Remove wrapping speachmarks (if any)
	)
	.map(arg => arg.replace(/\n/g, '\\n'))
	.join(' ');

module.exports = exec;
