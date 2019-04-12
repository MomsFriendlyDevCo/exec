var expect = require('chai').expect;
var exec = require('..');

describe('exec.join()', ()=> {

	it('should join simple arguments', ()=> {
		expect(exec.join(['echo'])).to.equal('echo')
		expect(exec.join(['echo', 'foo'])).to.equal('echo foo')
		expect(exec.join(['echo', 'foo', 'bar', 'baz'])).to.equal('echo foo bar baz')
		expect(exec.join(['echo', '"foo"', 'bar', '"baz"'])).to.equal('echo foo bar baz')
	})

	it('should join complex arguments', ()=> {
		expect(exec.join(['echo', 'hello world'])).to.equal('echo "hello world"')
		expect(exec.join(['echo', 'my name is "joe"'])).to.equal('echo "my name is \\"joe\\""')
		expect(exec.join(['echo', '-n', '1\n2\n3', '|', 'cat'])).to.equal('echo -n "1\\n2\\n3" | cat');
	})

});
