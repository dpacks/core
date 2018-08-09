var assert = require('assert')
var fs = require('fs')
var path = require('path')
var xtend = require('xtend')
var ddrive = require('@ddrive/core')
var resolveDWebLink = require('@dwebs/resolve')
var debug = require('debug')('@dpack/core')
var dwebStore = require('./lib/storage')
var DWeb = require('./dweb')

module.exports = createDWeb

/**
 * Create a DWeb instance, vault storage, and ready the vault.
 * @param {string|object} dirOrStorage - Directory or ddrive storage object.
 * @param {object} [opts] - DWeb-node options and any ddrive init options.
 * @param {String|Buffer} [opts.key] - Hyperdrive key
 * @param {Boolean} [opts.createIfMissing = true] - Create storage if it does not exit.
 * @param {Boolean} [opts.errorIfExists = false] - Error if storage exists.
 * @param {Boolean} [opts.temp = false] - Use random-access-memory for temporary storage
 * @param {function(err, dweb)} cb - callback that returns `DWeb` instance
 * @see defaultStorage for storage information
 */
function createDWeb (dirOrStorage, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  assert.ok(dirOrStorage, 'dpack-core: directory or storage required')
  assert.equal(typeof opts, 'object', 'dpack-core: opts should be type object')
  assert.equal(typeof cb, 'function', 'dpack-core: callback required')

  var vault
  var key = opts.key
  var dir = (typeof dirOrStorage === 'string') ? dirOrStorage : null
  var storage = dwebStore(dirOrStorage, opts)
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  var hasDWeb = false
  opts = xtend({
    // TODO: make sure opts.dir is a directory, not file
    dir: dir,
    latest: true
  }, opts)

  if (!opts.dir) return create() // TODO: check other storage
  checkIfExists()

  /**
   * Check if vault storage folder exists.
   * @private
   */
  function checkIfExists () {
    // Create after we check for pre-sleep .dweb stuff
    var createAfterValid = (createIfMissing && !errorIfExists)

    var missingError = new Error('DWeb storage does not exist.')
    missingError.name = 'MissingError'
    var existsError = new Error('DWeb storage already exists.')
    existsError.name = 'ExistsError'
    var oldError = new Error('DWeb folder contains incompatible metadata. Please remove your metadata (rm -rf .dweb).')
    oldError.name = 'IncompatibleError'

    fs.readdir(path.join(opts.dir, '.dweb'), function (err, files) {
      // TODO: omg please make this less confusing.
      var noDWeb = !!(err || !files.length)
      hasDWeb = !noDWeb
      var validSleep = (files && files.length && files.indexOf('metadata.key') > -1)
      var badDWeb = !(noDWeb || validSleep)

      if ((noDWeb || validSleep) && createAfterValid) return create()
      else if (badDWeb) return cb(oldError)

      if (err && !createIfMissing) return cb(missingError)
      else if (!err && errorIfExists) return cb(existsError)

      return create()
    })
  }

  /**
   * Create the vault and call `vault.ready()` before callback.
   * Set `vault.resumed` if vault has a content feed.
   * @private
   */
  function create () {
    if (dir && !opts.temp && !key && (opts.indexing !== false)) {
      // Only set opts.indexing if storage is @dpack/storage
      // TODO: this should be an import option instead, https://github.com/mafintosh/ddrive/issues/160
      opts.indexing = true
    }
    if (!key) return createVault()

    resolveDWebLink(key, function (err, resolvedKey) {
      if (err) return cb(err)
      key = resolvedKey
      createVault()
    })

    function createVault () {
      vault = ddrive(storage, key, opts)
      vault.on('error', cb)
      vault.ready(function () {
        debug('vault ready. version:', vault.version)
        if (hasDWeb || (vault.metadata.has(0) && vault.version)) {
          vault.resumed = true
        } else {
          vault.resumed = false
        }
        vault.removeListener('error', cb)

        cb(null, new DWeb(vault, opts))
      })
    }
  }
}
