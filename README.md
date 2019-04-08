@momsfriendlydevco/exec
=======================
Tiny wrapper around `child_process.spawn()` / `exec()` which provides some additional functionality.

**Differences from spawn / exec**:

* Always returns a promise for running processes. That promise can return output if `buffer` is enabled
* Can easily prefix output to STDOUT / STDERR or both
* Can accept a single array of command arguments rather than treating the program + args separately
* Can accept a single string command which is correctly transformed internally
* Optionally can buffer and provide all output when resolving / rejecting
* Supports piping
* Auto-trimming out output
* Hashbangs supported


```javascript
var exec = require('@momsfriendlydevco/exec');

exec('echo "Hello world"')
	.then(()=> /* ... */)

exec(['docker', 'build', '--tag=momsfriendlydevco/test', '.'], {
	prefix: '[docker]',
})
	.then(()=> /* ... */)
```


Debugging
---------
This module uses the [Debug NPM package](https://github.com/visionmedia/debug#readme) and responds to `exec`.

To see verbose debugging output simply set `DEBUG=exec` or any valid glob expression.

```
> DEBUG=exec node someNodeFile.js
```


API
===
This module exposes a single function with returns a promise. The function takes an array (or string) of arguments where the executable is the first item within that array. An additional options object can be passed. 

Supported options:

| Option               | Type                      | Default                  | Description                                                                                                                                    |
| ------------------   | ------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `buffer`             | `boolean`                 | `undefined`              | Set both `bufferStdout` + `bufferStderr` at once                                                                                               |
| `bufferStdout`       | `boolean`                 | `false`                  | When resolving the promise provide the output from the command as the value of the resolved promise                                            |
| `bufferStderr`       | `boolean`                 | `false`                  | As with `bufferStdout` but also include STDERR stream data                                                                                     |
| `log`                | `boolean` or `function`   | `undefined`              | Set both `logStdout` + `logStderr` at once                                                                                                     |
| `logStdout`          | `boolean` or `function`   | `console.log`            | Logging function to use when outputting STDOUT, set to falsy to disable                                                                        |
| `logStderr`          | `boolean` or `function`   | `console.log`            | Similar to `logStdout` but with the STDERR stream                                                                                              |
| `prefix`             | `string` or `function`    | `undefined`              | Sets both `prefixStdout` + `prefixStderr` at once                                                                                              |
| `prefixStdout`       | `string` or `function`    | `undefined`              | Sets a string prefix for any STDOUT output, if a function it is called as `(msg)` and uses the return value, effectively acting as a wrapper   |
| `prefixStderr`       | `string` or `function`    | `undefined`              | Similar functionality to `prefixStdout` but with STDERR streams                                                                                |
| `rejectError`        | `string`                  | `'Non-zero exit code'`   | String to reject with if the exit code is not present in `resolveCodes`                                                                        |
| `reformat`           | `boolean`                 | `undefined`              | Set both `reformatStdout` + `reformatStderr` at once                                                                                           |
| `reformatStdout`     | `boolean`                 | `false`                  | When accepting data from Stdout and `prefixStdout` is enabled, also split newline input so each newline is prefixed                            |
| `reformatStderr`     | `boolean`                 | `false`                  | As with `reformatStdout` but also reformat STDERR stream data                                                                                  |
| `resolveCodes`       | `array`                   | `[0]`                    | Array of numeric error codes to accept as a valid response                                                                                     |
| `pipe`               | `boolean` or `string`     | `'auto'`                 | Use the shell to execute, if `'auto'` pipes are detected automatically                                                                         |
| `shell`              | `string`                  | `'/bin/sh'`              | A STDIN processing shell, used when `pipe` is true or auto detected                                                                            |
| `hashbang`           | `boolean`                 | `true`                   | If specified the file is opened and `hashbangReadLength` bytes examined for a hashbang, if one is found the command is prefixed with it        |
| `hashbangReadLength` | `number`                  | `100`                    | How many bytes to explore at the start of files for the hashbang                                                                               |
| `trim`               | `boolean`                 | `true`                   | Automatically trim output to remove trailing newlines and spaces                                                                               |
| `trimRegExp`         | `RegExp`                  | `/[\n\s]+$/m`            | The regular expression used when trimming                                                                                                      |


**NOTES:**
* Setting `log` or `log{Stdout,Stderr}` automatically implies the respective `logStdout` / `logStderr` function to be true
