var expect = require('chai').expect;
var exec = require('..');

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

});
