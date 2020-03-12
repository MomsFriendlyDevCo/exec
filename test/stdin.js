var expect = require('chai').expect;
var exec = require('..');
var mlog = require('mocha-logger');

describe('STDIN piping', ()=> {

	it('should support custom STDIN input', ()=>
		exec('cat', {stdin: Buffer.from('Hello world'), buffer: true})
			.then(output => expect(output).to.be.deep.equal('Hello world'))
	);

	it.skip('should handle STDIN streaming via a pipe', function() {
		// Skipped as this requires user interaction
		this.timeout(60 * 1000);
		return exec('bash', {stdin: process.stdin})
	});

});
