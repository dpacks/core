var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')
var helpers = require('./helpers')

var DPack = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')

test('download: Download with default opts', function (t) {
  shareFixtures(function (err, shareKey, closeShare) {
    t.error(err, 'error')

    tmpDir(function (err, downDir, cleanup) {
      t.error(err, 'error')

      DPack(downDir, {key: shareKey}, function (err, dpack) {
        t.error(err, 'error')
        t.ok(dpack, 'callsback with dPack object')
        t.ok(dpack.key, 'has key')
        t.ok(dpack.vault, 'has vault')
        t.notOk(dpack.writable, 'vault not writable')

        var stats = dpack.trackStats()
        var network = dpack.joinNetwork(function () {
          t.pass('joinNetwork calls back okay')
        })
        network.once('connection', function () {
          t.pass('connects via network')
        })
        var vault = dpack.vault
        vault.once('content', function () {
          t.pass('gets content')
          vault.content.on('sync', done)
        })

        function done () {
          var st = stats.get()
          t.ok(st.version === vault.version, 'stats version correct')
          t.ok(st.downloaded === st.length, 'all blocks downloaded')
          helpers.verifyFixtures(t, vault, function (err) {
            t.error(err, 'error')
            t.ok(dpack.network, 'network is open')
            dpack.close(function (err) {
              t.error(err, 'error')
              t.equal(dpack.network, undefined, 'network is closed')
              cleanup(function (err) {
                t.error(err, 'error')
                closeShare(function (err) {
                  t.error(err, 'error')
                  t.end()
                })
              })
            })
          })
        }
      })
    })
  })
})

function shareFixtures (opts, cb) {
  if (typeof opts === 'function') cb = opts
  if (!opts) opts = {}

  rimraf.sync(path.join(fixtures, '.dpack')) // for previous failed tests
  DPack(fixtures, {temp: true}, function (err, dpack) {
    if (err) return cb(err)
    dpack.joinNetwork({ dht: false })
    dpack.importFiles(function (err) {
      if (err) return cb(err)
      cb(null, dpack.key, close)
    })

    function close (cb) {
      dpack.close(function (err) {
        cb(err)
        // rimraf if we need it?
      })
    }
  })
}
