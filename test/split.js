var expect = require('chai').expect;
var exec = require('..');

describe('exec.split()', ()=> {

	it('should split simple commands', ()=> {
		expect(exec.split('echo')).to.deep.equal(['echo']);
		expect(exec.split('echo foo')).to.deep.equal(['echo', 'foo']);
		expect(exec.split('echo foo bar baz')).to.deep.equal(['echo', 'foo', 'bar', 'baz']);
	})

	it('should split complex commands', ()=> {
		expect(exec.split('echo "hello world"')).to.deep.equal(['echo', 'hello world']);
		expect(exec.split('echo "my name is \"joe\"')).to.deep.equal(['echo', 'my name is ', 'joe']);
	});
});
