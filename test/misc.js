var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')

var DWeb = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('misc: clean old test', function (t) {
  rimraf(path.join(fixtures, '.dweb'), function () {
    t.end()
  })
})

test('misc: empty dpack folder ok', function (t) {
  fs.mkdir(path.join(fixtures, '.dweb'), function () {
    DWeb(fixtures, function (err, dweb) {
      t.error(err, 'no error')
      rimraf.sync(path.join(fixtures, '.dweb'))
      t.end()
    })
  })
})

test('misc: existing invalid dpack folder', function (t) {
  fs.mkdir(path.join(fixtures, '.dweb'), function () {
    fs.writeFile(path.join(fixtures, '.dweb', '0101.db'), '', function () {
      DWeb(fixtures, function (err, dweb) {
        t.ok(err, 'errors')
        rimraf.sync(path.join(fixtures, '.dweb'))
        t.end()
      })
    })
  })
})

test('misc: non existing invalid dpack path', function (t) {
  t.throws(function () {
    DWeb('/non/existing/folder/', function () {})
  })
  t.end()
})

test('misc: open error', function (t) {
  t.skip('TODO: lock file')
  t.end()

  // DWeb(process.cwd(), function (err, dpackA) {
  //   t.error(err)
  //   DWeb(process.cwd(), function (err, dpackB) {
  //     t.ok(err, 'second open errors')
  //     dpackA.close(function () {
  //       rimraf(path.join(process.cwd(), '.dweb'), function () {
  //         t.end()
  //       })
  //     })
  //   })
  // })
})

test('misc: expose .key', function (t) {
  var key = Buffer.alloc(32)
  DWeb(process.cwd(), { key: key, temp: true }, function (err, dweb) {
    t.error(err, 'error')
    t.deepEqual(dweb.key, key)

    DWeb(fixtures, { temp: true }, function (err, dweb) {
      t.error(err, 'error')
      t.notDeepEqual(dweb.key, key)
      dweb.close(function (err) {
        t.error(err, 'error')
        t.end()
      })
    })
  })
})

test('misc: expose .writable', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    DWeb(fixtures, function (err, shareDWeb) {
      t.error(err, 'error')
      t.ok(shareDWeb.writable, 'is writable')
      shareDWeb.joinNetwork()

      DWeb(downDir, {key: shareDWeb.key}, function (err, downDWeb) {
        t.error(err, 'error')
        t.notOk(downDWeb.writable, 'not writable')

        shareDWeb.close(function (err) {
          t.error(err, 'error')
          downDWeb.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              rimraf.sync(path.join(fixtures, '.dweb'))
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
    var downDWeb
    DWeb(fixtures, { temp: true }, function (err, shareDWeb) {
      t.error(err, 'error')

      t.doesNotThrow(shareDWeb.leave, 'leave before join should be noop')

      var network = shareDWeb.joinNetwork()
      t.equal(network.connected, 0, '0 peers')

      network.once('connection', function () {
        t.ok(network.connected >= 1, '>=1 peer')
        shareDWeb.leave()
        t.skip(downDWeb.network.connected, 0, '0 peers') // TODO: Fix connection count
        downDWeb.close(function (err) {
          t.error(err, 'error')
          shareDWeb.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              t.error(err, 'error')
              t.end()
            })
          })
        })
      })

      DWeb(downDir, { key: shareDWeb.key, temp: true }, function (err, dweb) {
        t.error(err, 'error')
        dweb.joinNetwork()
        downDWeb = dweb
      })
    })
  })
})

test('misc: close twice errors', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err, 'error')
    dweb.close(function (err) {
      t.error(err, 'error')
      dweb.close(function (err) {
        t.ok(err, 'has close error second time')
        t.end()
      })
    })
  })
})

test('misc: close twice sync errors', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err, 'error')
    dweb.close(function (err) {
      t.error(err, 'error')
      t.end()
    })
    dweb.close(function (err) {
      t.ok(err, 'has close error second time')
    })
  })
})

test('misc: create key and open with different key', function (t) {
  t.skip('TODO')
  t.end()
  // TODO: hyperdrive needs to forward hypercore metadta errors
  // https://github.com/mafintosh/hyperdrive/blob/master/index.js#L37

  // rimraf.sync(path.join(fixtures, '.dweb'))
  // DWeb(fixtures, function (err, dweb) {
  //   t.error(err, 'error')
  //   dweb.close(function (err) {
  //     t.error(err, 'error')
  //     DWeb(fixtures, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dweb) {
  //       t.same(err.message, 'Another hypercore is stored here', 'has error')
  //       rimraf.sync(path.join(fixtures, '.dweb'))
  //       t.end()
  //     })
  //   })
  // })
})

test('misc: make dpack with random key and open again', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    var key = '6161616161616161616161616161616161616161616161616161616161616161'
    DWeb(downDir, {key: key}, function (err, dweb) {
      t.error(err, 'error')
      t.ok(dweb, 'has dpack')
      dweb.close(function (err) {
        t.error(err, 'error')
        DWeb(downDir, {key: key}, function (err, dweb) {
          t.error(err, 'error')
          t.ok(dweb, 'has dpack')
          t.end()
        })
      })
    })
  })
})
