var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')
var helpers = require('./helpers')

var DWeb = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')

test('download: Download with default opts', function (t) {
  shareFixtures(function (err, shareKey, closeShare) {
    t.error(err, 'error')

    tmpDir(function (err, downDir, cleanup) {
      t.error(err, 'error')

      DWeb(downDir, {key: shareKey}, function (err, dweb) {
        t.error(err, 'error')
        t.ok(dweb, 'callsback with dPack object')
        t.ok(dweb.key, 'has key')
        t.ok(dweb.vault, 'has vault')
        t.notOk(dweb.writable, 'vault not writable')

        var stats = dweb.trackStats()
        var network = dweb.joinNetwork(function () {
          t.pass('joinNetwork calls back okay')
        })
        network.once('connection', function () {
          t.pass('connects via network')
        })
        var vault = dweb.vault
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
            t.ok(dweb.network, 'network is open')
            dweb.close(function (err) {
              t.error(err, 'error')
              t.equal(dweb.network, undefined, 'network is closed')
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

  rimraf.sync(path.join(fixtures, '.dweb')) // for previous failed tests
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    if (err) return cb(err)
    dweb.joinNetwork({ dht: false })
    dweb.importFiles(function (err) {
      if (err) return cb(err)
      cb(null, dweb.key, close)
    })

    function close (cb) {
      dweb.close(function (err) {
        cb(err)
        // rimraf if we need it?
      })
    }
  })
}
