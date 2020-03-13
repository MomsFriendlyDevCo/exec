var expect = require('chai').expect;
var exec = require('..');
var mlog = require('mocha-logger');

describe('STDIN piping', ()=> {

	it('should support buffer STDIN input', ()=>
		exec('cat', {stdin: Buffer.from('Hello world'), buffer: true})
			.then(output => expect(output).to.be.deep.equal('Hello world'))
	);

	it('should support string STDIN input', ()=>
		exec('tac', {stdin: 'A\nB\nC\n', buffer: true})
			.then(output => expect(output).to.equal('C\nB\nA'))
	);

	it.skip('should handle STDIN streaming via a pipe (given the "inherit" shortcut)', function() {
		// Skipped as this requires user interaction
		this.timeout(60 * 1000);
		return exec('bash', {stdin: 'inherit'})
	});

	it.skip('should handle STDIN streaming via a pipe (given a stream)', function() {
		// Skipped as this requires user interaction
		this.timeout(60 * 1000);
		return exec('bash', {stdin: process.stdin})
	});

});
