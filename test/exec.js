var expect = require('chai').expect;
var exec = require('..');
var mlog = require('mocha-logger');

describe('exec()', ()=> {

	it('should work like a drop-in replacement for spawn()', ()=>
		exec('echo', ['hello'])
	)

	it('should exec a simple array input', ()=>
		exec(['echo', 'hello'])
	)

	it('should exec a simple string input', ()=>
		exec('echo hello')
	)

	it('should exec a simple string via a shell', ()=>
		exec('echo hello', {pipe: true})
	)

	it('should exec as two strings', ()=>
		exec('echo', 'hello')
	)

	it('should handle compound commands and resolve with output (continuous line)', ()=>
		exec('echo hello world', {buffer: true, trim: false})
			.then(res => expect(res).to.equal('hello world\n'))
	)

	it('should handle compound commands and resolve with output (with quotes)', ()=>
		exec('echo -n "hello world"', {buffer: true})
			.then(res => expect(res).to.equal('hello world'))
	)

	it('should handle piped output', ()=>
		exec('echo -n 1\n2\n3\n | cat', {buffer: true})
			.then(res => expect(res).to.equal('1\n2\n3'))
	)

	it('should handle piped output (from file via pipe)', ()=>
		exec(`cat ${__dirname}/data/numbers.txt | cat`, {buffer: true})
			.then(res => expect(res).to.match(/One\nTwo/))
	)

	it('should handle piped output (from file via pipe and prefix)', ()=>
		exec(`cat ${__dirname}/data/numbers.txt | cat`, {buffer: true, prefix: '[DATA]', log: ()=> {}})
			.then(res => expect(res).to.match(/One\nTwo/))
	)

	it('should handle piped output (from file via rediection)', ()=>
		exec(`cat < ${__dirname}/data/numbers.txt`, {buffer: true})
			.then(res => expect(res).to.match(/One\nTwo/))
	)

	it('should not act on escaped pipes', ()=>
		exec('echo -n 1\n2\n3\n \| cat', {buffer: true})
			.then(res => expect(res).to.equal('1\n2\n3'))
	)

	it.skip('should log with a prefix', ()=>
		// Skipped because this is difficult to do in a testkit, use a human
		exec('echo -n 1\n2\n3', {prefix: '[test]'})
	)

	it('should run a file via a hashbang (via array method)', ()=>
		exec([`${__dirname}/data/hashbang.js`, 'foo'], {buffer: true})
			.then(output => expect(output).to.equal('Hello foo'))
	)

	it('should run a file via a hashbang (via string method)', ()=>
		exec(`${__dirname}/data/hashbang.js bar`, {buffer: true})
			.then(output => expect(output).to.equal('Hello bar'))
	)

	it('should return a JSON stream', ()=>
		exec('echo \'{"foo":"Foo!"}\'', {buffer: true, json: true})
			.then(output => expect(output).to.be.deep.equal({foo: 'Foo!'}))
	)

	it('should return a JSON stream (buffering implied)', ()=>
		exec('echo \'{"foo":"Foo!"}\'', {json: true})
			.then(output => expect(output).to.be.deep.equal({foo: 'Foo!'}))
	)

	it('should error correctly when asked for JSON but got unparsable', ()=>
		exec('echo "hello world, this is a really long and invalid string which shouldnt parse to JSON"', {buffer: true, json: true, logStdout: mlog.log})
			.then(output => expect.fail())
			.catch(e => {
				expect(e.toString()).to.match(/^Invalid JSON - /);
				return Promise.resolve();
			})
	)

	it('should handle aliased commands', ()=>
		exec('spew hello spew', {alias: {spew: 'echo'}, buffer: true})
			.then(output => expect(output).to.deep.equal('hello spew'))
	)

	it('should handle aliased commands within pipes', ()=>
		exec('spew foo | meow | cat | meow', {alias: {spew: 'echo', meow: 'cat'}, buffer: true})
			.then(output => expect(output).to.deep.equal('foo'))
	)

	it('should exit correctly', ()=>
		exec("bash -c 'exit 0'")
			.catch(()=> expect.fail)
	)

	it('should exit with an error on invalid commands', ()=>
		exec("bash -c 'exit 1'")
			.then(()=> expect.fail)
			.catch(err => expect(err).to.be.equal('Non-zero exit code: 1'))
	)

	it('should exit with codes when requested', ()=>
		exec("bash -c 'exit 101'", {rejectError: false})
			.then(()=> expect.fail)
			.catch(code => expect(code).to.be.equal(101))
	)

	it('should exit with custom error handler', ()=>
		exec("bash -c 'exit 102'", {rejectError: code => `EXIT:${code}`})
			.then(()=> expect.fail)
			.catch(err => expect(err).to.be.deep.equal('EXIT:102'))
	)

});
