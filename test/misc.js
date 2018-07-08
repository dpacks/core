var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')

var DPack = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('misc: clean old test', function (t) {
  rimraf(path.join(fixtures, '.dpack'), function () {
    t.end()
  })
})

test('misc: empty dpack folder ok', function (t) {
  fs.mkdir(path.join(fixtures, '.dpack'), function () {
    DPack(fixtures, function (err, dpack) {
      t.error(err, 'no error')
      rimraf.sync(path.join(fixtures, '.dpack'))
      t.end()
    })
  })
})

test('misc: existing invalid dpack folder', function (t) {
  fs.mkdir(path.join(fixtures, '.dpack'), function () {
    fs.writeFile(path.join(fixtures, '.dpack', '0101.db'), '', function () {
      DPack(fixtures, function (err, dpack) {
        t.ok(err, 'errors')
        rimraf.sync(path.join(fixtures, '.dpack'))
        t.end()
      })
    })
  })
})

test('misc: non existing invalid dpack path', function (t) {
  t.throws(function () {
    DPack('/non/existing/folder/', function () {})
  })
  t.end()
})

test('misc: open error', function (t) {
  t.skip('TODO: lock file')
  t.end()

  // DPack(process.cwd(), function (err, dpackA) {
  //   t.error(err)
  //   DPack(process.cwd(), function (err, dpackB) {
  //     t.ok(err, 'second open errors')
  //     dpackA.close(function () {
  //       rimraf(path.join(process.cwd(), '.dpack'), function () {
  //         t.end()
  //       })
  //     })
  //   })
  // })
})

test('misc: expose .key', function (t) {
  var key = Buffer.alloc(32)
  DPack(process.cwd(), { key: key, temp: true }, function (err, dpack) {
    t.error(err, 'error')
    t.deepEqual(dpack.key, key)

    DPack(fixtures, { temp: true }, function (err, dpack) {
      t.error(err, 'error')
      t.notDeepEqual(dpack.key, key)
      dpack.close(function (err) {
        t.error(err, 'error')
        t.end()
      })
    })
  })
})

test('misc: expose .writable', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    DPack(fixtures, function (err, shareDPack) {
      t.error(err, 'error')
      t.ok(shareDPack.writable, 'is writable')
      shareDPack.joinNetwork()

      DPack(downDir, {key: shareDPack.key}, function (err, downDPack) {
        t.error(err, 'error')
        t.notOk(downDPack.writable, 'not writable')

        shareDPack.close(function (err) {
          t.error(err, 'error')
          downDPack.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              rimraf.sync(path.join(fixtures, '.dpack'))
              t.error(err, 'error')
              t.end()
            })
          })
        })
      })
    })
  })
})

test('misc: expose swarm.connected', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    var downDPack
    DPack(fixtures, { temp: true }, function (err, shareDPack) {
      t.error(err, 'error')

      t.doesNotThrow(shareDPack.leave, 'leave before join should be noop')

      var network = shareDPack.joinNetwork()
      t.equal(network.connected, 0, '0 peers')

      network.once('connection', function () {
        t.ok(network.connected >= 1, '>=1 peer')
        shareDPack.leave()
        t.skip(downDPack.network.connected, 0, '0 peers') // TODO: Fix connection count
        downDPack.close(function (err) {
          t.error(err, 'error')
          shareDPack.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              t.error(err, 'error')
              t.end()
            })
          })
        })
      })

      DPack(downDir, { key: shareDPack.key, temp: true }, function (err, dpack) {
        t.error(err, 'error')
        dpack.joinNetwork()
        downDPack = dpack
      })
    })
  })
})

test('misc: close twice errors', function (t) {
  DPack(fixtures, {temp: true}, function (err, dpack) {
    t.error(err, 'error')
    dpack.close(function (err) {
      t.error(err, 'error')
      dpack.close(function (err) {
        t.ok(err, 'has close error second time')
        t.end()
      })
    })
  })
})

test('misc: close twice sync errors', function (t) {
  DPack(fixtures, {temp: true}, function (err, dpack) {
    t.error(err, 'error')
    dpack.close(function (err) {
      t.error(err, 'error')
      t.end()
    })
    dpack.close(function (err) {
      t.ok(err, 'has close error second time')
    })
  })
})

test('misc: create key and open with different key', function (t) {
  t.skip('TODO')
  t.end()
  // TODO: hyperdrive needs to forward hypercore metadta errors
  // https://github.com/mafintosh/hyperdrive/blob/master/index.js#L37

  // rimraf.sync(path.join(fixtures, '.dpack'))
  // DPack(fixtures, function (err, dpack) {
  //   t.error(err, 'error')
  //   dpack.close(function (err) {
  //     t.error(err, 'error')
  //     DPack(fixtures, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dpack) {
  //       t.same(err.message, 'Another hypercore is stored here', 'has error')
  //       rimraf.sync(path.join(fixtures, '.dpack'))
  //       t.end()
  //     })
  //   })
  // })
})

test('misc: make dpack with random key and open again', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    var key = '6161616161616161616161616161616161616161616161616161616161616161'
    DPack(downDir, {key: key}, function (err, dpack) {
      t.error(err, 'error')
      t.ok(dpack, 'has dpack')
      dpack.close(function (err) {
        t.error(err, 'error')
        DPack(downDir, {key: key}, function (err, dpack) {
          t.error(err, 'error')
          t.ok(dpack, 'has dpack')
          t.end()
        })
      })
    })
  })
})
