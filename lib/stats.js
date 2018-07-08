var assert = require('assert')
var EventEmitter = require('events').EventEmitter
var each = require('stream-each')
var networkSpeed = require('@ddrive/netspeed')
var bitfield = require('sparse-bitfield')

module.exports = function (vault) {
  assert.ok(vault, 'lib/stats vault required')
  var stats = new EventEmitter()
  var counted = bitfield()

  var count = {
    files: 0,
    byteLength: 0,
    length: 0,
    version: 0
  }

  update()
  if (!vault.writable) {
    count.downloaded = 0
    downloadStats()
  }

  // TODO: put in @ddrive/stats
  stats.get = function () {
    return count
  }
  stats.network = networkSpeed(vault, {timeout: 2000})

  Object.defineProperties(stats, {
    peers: {
      enumerable: true,
      get: function () {
        if (!vault.content || !vault.content.peers) return {} // TODO: how to handle this?
        var peers = vault.content.peers
        var total = peers.length
        var complete = peers.filter(function (peer) {
          return peer.remoteLength === vault.content.length
        }).length

        return {
          total: total,
          complete: complete
        }
      }
    }
  })

  return stats

  function downloadStats () {
    if (!vault.content) return vault.once('content', downloadStats)

    var feed = vault.content
    count.downloaded = 0
    for (var i = 0; i < feed.length; i++) {
      if (feed.has(i) && counted.set(i, true)) count.downloaded++
    }
    stats.emit('update')

    vault.content.on('download', countDown)
    vault.content.on('clear', checkDownloaded)

    function checkDownloaded (start, end) {
      for (; start < end; start++) {
        if (counted.set(start, false)) count.downloaded--
      }
      stats.emit('update')
    }

    function countDown (index, data) {
      if (counted.set(index, true)) count.downloaded++
      stats.emit('update')
    }
  }

  function update () {
    if (stableVersion()) return wait()

    // get current size of vault
    var current = vault.tree.checkout(vault.version)
    var initial = vault.tree.checkout(count.version)
    var stream = initial.diff(current, {dels: true, puts: true})
    each(stream, ondata, function () {
      count.version = current.version
      stats.emit('update', count)
      if (!stableVersion()) return update()
      wait()
    })

    function ondata (data, next) {
      if (data.type === 'del') {
        count.byteLength -= data.value.size
        count.length -= data.value.blocks
        count.files--
      } else {
        count.byteLength += data.value.size
        count.length += data.value.blocks
        count.files++
      }
      next()
    }

    function stableVersion () {
      if (vault.version < 0) return false
      return count.version === vault.version
    }

    function wait () {
      vault.metadata.update(update)
    }
  }
}
