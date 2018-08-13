var assert = require('assert')
var path = require('path')
var multicb = require('multicb')
var xtend = require('xtend')
var untildify = require('untildify')
var importFiles = require('./lib/import-files')
var createNetwork = require('./lib/network')
var stats = require('./lib/stats')
var serveHttp = require('./lib/serve')
var debug = require('debug')('dpack-core')

module.exports = DWeb

/**
 * @class DWeb
 * @type {Object}
 * @param {Object} vault - dDrive vault
 * @param {Object} [opts] - Options
 * @param {String} [opts.dir] - Directory of vault
 *
 * @property {Object} vault - dDrive Vault
 * @property {String} path - Resolved path of vault
 * @property {Buffer} key - Vault Key (`vault.key`)
 * @property {Boolean} live - Vault is live (`vault.live`)
 * @property {Boolean} writable - Vault is writable (`vault.metadata.writable`)
 * @property {Boolean} version - Vault version (`vault.version`)
 * @property {Object} options - Initial options and all options passed to childen functions.
 * @returns {Object} DWeb
 */
function DWeb (vault, opts) {
  if (!(this instanceof DWeb)) return new DWeb(vault, opts)
  assert.ok(vault, 'vault required')
  var self = this

  this.vault = vault
  this.options = xtend(opts)
  if (opts.dir) {
    this.path = path.resolve(untildify(opts.dir))
  }

  // Getters for convenience accessors
  Object.defineProperties(this, {
    key: {
      enumerable: true,
      get: function () {
        return self.vault.key
      }
    },
    live: {
      enumerable: true,
      get: function () {
        return self.vault.live
      }
    },
    resumed: {
      enumerable: true,
      get: function () {
        return self.vault.resumed
      }
    },
    writable: {
      enumerable: true,
      get: function () {
        return self.vault.metadata.writable
      }
    },
    version: {
      enumerable: true,
      get: function () {
        return self.vault.version
      }
    }
  })
}

/**
 * Join DWeb Network via @flockcore/revelation
 * @type {Function}
 * @param {Object} [opts] - Network options, passed to @flockcore/revelation.
 * @param {Function} [cb] - Callback after first round of revelation is finished.
 * @returns {Object} Revelation Flock Instance
 */
DWeb.prototype.joinNetwork =
DWeb.prototype.join = function (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  var self = this
  if (!opts && self.options.network) opts = self.options.network // use previous options
  else opts = opts || {}
  cb = cb || noop

  var netOpts = xtend({
    stream: function (peer) {
      var stream = self.vault.replicate({
        upload: !(opts.upload === false),
        download: !self.writable && opts.download,
        live: !opts.end
      })
      stream.on('close', function () {
        debug('Stream close')
      })
      stream.on('error', function (err) {
        debug('Replication error:', err.message)
      })
      stream.on('end', function () {
        self.downloaded = true
        debug('Replication stream ended')
      })
      return stream
    }
  }, opts)

  var network = self.network = createNetwork(self.vault, netOpts, cb)
  self.options.network = netOpts

  return network
}

/**
 * Leave DWeb Network
 * @type {Function}
 * @param {Function} [cb] - Callback after network is closed
 */
DWeb.prototype.leaveNetwork =
DWeb.prototype.leave = function (cb) {
  if (!this.network) return
  debug('leaveNetwork()')
  // TODO: v8 unreplicate ?
  // this.vault.unreplicate()
  this.network.leave(this.vault.revelationKey)
  this.network.destroy(cb)
  delete this.network
}

/**
 * Pause DWeb Network
 * @type {Function}
 */
DWeb.prototype.pause = function () {
  debug('pause()')
  this.leave()
}

/**
 * Resume DWeb Network
 * @type {Function}
 */
DWeb.prototype.resume = function () {
  debug('resume()')
  this.join()
}

/**
 * Track vault stats
 * @type {Function}
 */
DWeb.prototype.trackStats = function (opts) {
  opts = xtend({}, opts)
  this.stats = stats(this.vault, opts)
  return this.stats
}

/**
 * Import files to vault via mirror-folder
 * @type {Function}
 * @param {String} [src=dweb.path] - Directory or File to import to `vault`.
 * @param {Function} [cb] - Callback after import is finished
 * @param {Object} [opts] - Options passed to `mirror-folder` and `dweb-ignore`
 * @returns {Object} - Import progress
 */
DWeb.prototype.importFiles = function (src, opts, cb) {
  if (!this.writable) throw new Error('Must be vault owner to import files.')
  if (typeof src !== 'string') return this.importFiles('', src, opts)
  if (typeof opts === 'function') return this.importFiles(src, {}, opts)

  var self = this
  src = src && src.length ? src : self.path
  opts = xtend({
    indexing: (opts && opts.indexing) || (src === self.path)
  }, opts)

  self.importer = importFiles(self.vault, src, opts, cb)
  self.options.importer = self.importer.options
  return self.importer
}

/**
 * Serve vault over http
 * @type {Function}
 * @param {Object} [opts] - Options passed to `mirror-folder` and `dweb-ignore`
 * @returns {Object} - node http server instance
 */
DWeb.prototype.serveHttp = function (opts) {
  this.server = serveHttp(this.vault, opts)
  return this.server
}

/**
 * Close DWeb vault and other things
 * @type {Function}
 * @param {Function} [cb] - Callback after all items closed
 */
DWeb.prototype.close = function (cb) {
  cb = cb || noop
  if (this._closed) return cb(new Error('dPack is already closed'))

  var self = this
  self._closed = true

  var done = multicb()
  closeNet(done())
  closeFileWatch(done())
  closeVault(done())

  done(cb)

  function closeVault (cb) {
    // self.vault.unreplicate()
    self.vault.close(cb)
  }

  function closeNet (cb) {
    if (!self.network) return cb()
    self.leave(cb)
  }

  function closeFileWatch (cb) {
    if (!self.importer) return cb()
    self.importer.destroy()
    process.nextTick(cb)
  }
}

function noop () { }
