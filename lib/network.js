var assert = require('assert')
var flockDefaults = require('@flockcore/presets')
var rev = require('@flockcore/revelation')
var xtend = require('xtend')

module.exports = function (vault, opts, cb) {
  assert.ok(vault, 'dpack-core: lib/network vault required')
  assert.ok(opts, 'dpack-core: lib/network opts required')

  var DEFAULT_PORT = 6200
  var flockOpts = xtend({
    hash: false,
    stream: opts.stream
  }, opts)
  var flock = rev(flockDefaults(flockOpts))
  flock.once('error', function () {
    flock.listen(0)
  })
  flock.listen(opts.port || DEFAULT_PORT)
  flock.join(vault.revelationKey, { announce: !(opts.upload === false) }, cb)
  flock.options = flock._options
  return flock
}
