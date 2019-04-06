/**
* Run a process similar to child_process.{exec,spawn}
* This is a wee bit nicer to use than child_process.spawn as it just takes an array, automatically outputs prefixes, supports promises and rejects when exit code != 0
* @param {array} args Command line or argument sections as an array
* @param {Object} [options] Additional options to specify
* @param {string} [options.prefix] Optional prefix for all command output
* @returns {Promise} A promise which will resolve with the output of the command or reject if the exit code is non-zero
*/
var spawn = require('child_process').spawn;
var spawnArgs = require('spawn-args');
var isArray = input => typeof input == 'object' && Object.prototype.toString.call(input) == '[object Array]';

module.exports = (cmd, args, options) => new Promise((resolve, reject) => {
	var isPiping = false;
	// Argument mangling {{{
	if (typeof cmd == 'object') { // args - Parse args as an array
		options = args;
		args = cmd;
	} else if (typeof cmd == 'string') { // cmd<s>, [args], [options] - Split into args
		isPiping = /(?<!\\)\|/.test(cmd);
		options = args;
		args = spawnArgs(cmd, {removequotes: 'always'});
	} else if (typeof cmd == 'string' && typeof args == 'string') { // cmd<s>, args<s>
		args = spawnArgs(args, {removequotes: 'always'});
		args.unshift(cmd);
	} else if (typeof cmd == 'string' && isArray(args)) { // cmd<s>, args<a>, [options] - Given command and args, push CMD onto arg stack and disguard
		args.unshift(cmd);
	} else {
		throw new Error('Unknown or unsupported way of calling exec()');
	}
	// }}}

	var settings = {
		buffer: undefined,
		bufferStdout: false,
		bufferStderr: false,
		log: undefined,
		logStdout: false,
		logStderr: false,
		prefix: undefined,
		prefixStdout: undefined,
		prefixStderr: undefined,
		reformat: undefined,
		reformatStdout: true,
		reformatStderr: true,
		resolveCodes: [0],
		shell: '/bin/sh',
		pipe: 'auto',
		rejectError: 'Non-zero exit code',
		...options,
	};

	// Settings mangling {{{
	if (settings.buffer !== undefined) settings.bufferStdout = settings.bufferStderr = settings.buffer;
	if (settings.log !== undefined) settings.logStdout = settings.logStderr = settings.log;
	if (settings.prefix !== undefined) settings.prefixStdout = settings.prefixStderr = settings.prefix;
	if (settings.reformat !== undefined) settings.reformatStdout = settings.reformatStderr = settings.reformat;
	if (settings.prefixStdout) settings.logStdout = true;
	if (settings.prefixStderr) settings.logStderr = true;
	if (settings.logStdout === true) settings.logStdout = console.log;
	if (settings.logStderr === true) settings.logStderr = console.log;
	// }}}

	// Exec process {{{
	var ps;
	if ((settings.pipe == 'auto' && isPiping) || settings.pipe === true) {
		ps = spawn(settings.shell);
		var pipeCmd = args.join(' ').replace(/\n/g, '\\\\n');
		ps.stdin.write(pipeCmd, ()=> ps.stdin.end());
	} else {
		var mainCmd = args.shift();
		ps = spawn(mainCmd, args);
	}
	// }}}

	var outputBuffer = '';

	// Stream handler factory {{{
	var dataFactory = suffix => {
		var eventHandler = data => { // Function to create the stream handlers
			var buf;
			if (typeof data == 'string') { // Given a string, probably a call from a nested dataFactory entry
				buf = data;
			} else {
				buf = data.toString();
				if ( // Refomat input if we are also using prefixers
					settings[`prefix${suffix}`] // Using a prefix AND
					&& settings[`reformat${suffix}`] // We're in reformatting mode AND
					&& /\n/.test(buf) // The input contains new lines
				) {
					buf.split(/\s*\n\s*/).forEach(line => eventHandler(line)); // Call this event handler with each line
					return; // Don't handle anything further as the above should have drained the input buffer
				}
			}

			// Log to buffer
			if (settings[`buffer${suffix}`]) outputBuffer += buf;

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
			resolve(
				settings.buffer || settings.bufferStdout || settings.bufferStderr
					? outputBuffer
					: undefined
			);
		} else {
			return reject(settings.rejectError);
		}
	});
});
