var assert = require('assert')
var http = require('http')
var serve = require('@ddrive/http')
var xtend = require('xtend')
var debug = require('debug')('@dpack/core')

module.exports = function (vault, opts) {
  assert.ok(vault, 'lib/serve: vault required')
  opts = xtend({
    port: 8080,
    live: true,
    footer: 'Served via dWeb.'
  }, opts)

  var server = http.createServer(serve(vault, opts))
  server.listen(opts.port)
  server.on('listening', function () {
    debug(`http serving on PORT:${opts.port}`)
  })

  return server
}
