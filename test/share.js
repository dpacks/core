var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var ram = require('random-access-memory')
var countFiles = require('count-files')
var helpers = require('./helpers')

var DPack = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var fixtureStats = {
  files: 3,
  bytes: 1452,
  dirs: 1
}
var liveKey

test('share: prep', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('share: create dpack with default ops', function (t) {
  DPack(fixtures, function (err, dpack) {
    t.error(err, 'cb err okay')
    t.ok(dpack.path === fixtures, 'correct directory')
    t.ok(dpack.vault, 'has vault')
    t.ok(dpack.key, 'has key')
    t.ok(dpack.live, 'is live')
    t.ok(dpack.writable, 'is writable')
    t.ok(!dpack.resumed, 'is not resumed')

    fs.stat(path.join(fixtures, '.dpack'), function (err, stat) {
      t.error(err)
      t.pass('creates .dpack dir')
    })

    liveKey = dpack.key
    var putFiles = 0
    var stats = dpack.trackStats()
    var network = dpack.joinNetwork()

    network.once('listening', function () {
      t.pass('network listening')
    })

    var progress = dpack.importFiles(function (err) {
      t.error(err, 'file import err okay')
      var vault = dpack.vault
      var st = stats.get()
      if (vault.version === st.version) return check()
      stats.once('update', check)

      function check () {
        var st = stats.get()
        t.same(st.files, 3, 'stats files')
        t.same(st.length, 2, 'stats length')
        t.same(st.version, vault.version, 'stats version')
        t.same(st.byteLength, 1452, 'stats bytes')

        t.same(putFiles, 3, 'importer puts')
        t.same(vault.version, 3, 'vault version')
        t.same(vault.metadata.length, 4, 'entries in metadata')

        helpers.verifyFixtures(t, vault, function (err) {
          t.ifError(err)
          dpack.close(function (err) {
            t.ifError(err)
            t.pass('close okay')
            t.end()
          })
        })
      }
    })

    progress.on('put', function () {
      putFiles++
    })
  })
})

test('share: resume with .dpack folder', function (t) {
  DPack(fixtures, function (err, dpack) {
    t.error(err, 'cb without error')
    t.ok(dpack.writable, 'dpack still writable')
    t.ok(dpack.resumed, 'resume flag set')
    t.same(liveKey, dpack.key, 'key matches previous key')
    var stats = dpack.trackStats()

    countFiles({fs: dpack.vault, name: '/'}, function (err, count) {
      t.ifError(err, 'count err')
      var vault = dpack.vault

      t.same(vault.version, 3, 'vault version still')

      var st = stats.get()
      t.same(st.byteLength, fixtureStats.bytes, 'bytes total still the same')
      t.same(count.bytes, fixtureStats.bytes, 'bytes still ok')
      t.same(count.files, fixtureStats.files, 'bytes still ok')
      dpack.close(function () {
        cleanFixtures(function () {
          t.end()
        })
      })
    })
  })
})

test('share: resume with empty .dpack folder', function (t) {
  var emptyPath = path.join(__dirname, 'empty')
  DPack(emptyPath, function (err, dpack) {
    t.error(err, 'cb without error')
    t.false(dpack.resumed, 'resume flag false')

    dpack.close(function () {
      DPack(emptyPath, function (err, dpack) {
        t.error(err, 'cb without error')
        t.ok(dpack.resumed, 'resume flag set')

        dpack.close(function () {
          rimraf(emptyPath, function () {
            t.end()
          })
        })
      })
    })
  })
})

if (!process.env.TRAVIS) {
  test('share: live - editing file', function (t) {
    DPack(fixtures, function (err, dpack) {
      t.ifError(err, 'error')

      var importer = dpack.importFiles({ watch: true }, function (err) {
        t.ifError(err, 'error')
        if (!err) t.fail('live import should not cb')
      })
      importer.on('put-end', function (src) {
        if (src.name.indexOf('empty.txt') > -1) {
          if (src.live) return done()
          fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), 'not empty')
        }
      })

      function done () {
        dpack.vault.stat('/folder/empty.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.same(stat.size, 9, 'empty file has new content')
          dpack.close(function () {
            // make file empty again
            fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
            t.end()
          })
        })
      }
    })
  })

  test('share: live resume & create new file', function (t) {
    var newFile = path.join(fixtures, 'new.txt')
    DPack(fixtures, function (err, dpack) {
      t.error(err, 'error')
      t.ok(dpack.resumed, 'was resumed')

      var importer = dpack.importFiles({ watch: true }, function (err) {
        t.error(err, 'error')
        if (!err) t.fail('watch import should not cb')
      })

      importer.on('put-end', function (src) {
        if (src.name.indexOf('new.txt') === -1) return
        t.ok(src.live, 'file put is live')
        process.nextTick(done)
      })
      setTimeout(writeFile, 500)

      function writeFile () {
        fs.writeFile(newFile, 'hello world', function (err) {
          t.ifError(err, 'error')
        })
      }

      function done () {
        dpack.vault.stat('/new.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.ok(stat, 'new file in vault')
          fs.unlink(newFile, function () {
            dpack.close(function () {
              t.end()
            })
          })
        })
      }
    })
  })
}

test('share: cleanup', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('share: dir storage and opts.temp', function (t) {
  DPack(fixtures, {temp: true}, function (err, dpack) {
    t.error(err, 'error')
    t.false(dpack.resumed, 'resume flag false')

    dpack.importFiles(function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dpack.vault, done)
    })

    function done (err) {
      t.error(err, 'error')
      dpack.close(function () {
        t.end()
      })
    }
  })
})

test('share: ram storage & import other dir', function (t) {
  DPack(ram, function (err, dpack) {
    t.error(err, 'error')
    t.false(dpack.resumed, 'resume flag false')

    dpack.importFiles(fixtures, function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dpack.vault, done)
    })

    function done (err) {
      t.error(err, 'error')
      dpack.close(function () {
        t.end()
      })
    }
  })
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dpack'), cb)
}
