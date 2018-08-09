var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var ram = require('random-access-memory')
var countFiles = require('count-files')
var helpers = require('./helpers')

var DWeb = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var fixtureStats = {
  files: 3,
  bytes: 1452,
  dirs: 1
}
var liveKey

test('dist: prep', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('dist: create dpack with default ops', function (t) {
  DWeb(fixtures, function (err, dweb) {
    t.error(err, 'cb err okay')
    t.ok(dweb.path === fixtures, 'correct directory')
    t.ok(dweb.vault, 'has vault')
    t.ok(dweb.key, 'has key')
    t.ok(dweb.live, 'is live')
    t.ok(dweb.writable, 'is writable')
    t.ok(!dweb.resumed, 'is not resumed')

    fs.stat(path.join(fixtures, '.dweb'), function (err, stat) {
      t.error(err)
      t.pass('creates .dweb dir')
    })

    liveKey = dweb.key
    var putFiles = 0
    var stats = dweb.trackStats()
    var network = dweb.joinNetwork()

    network.once('listening', function () {
      t.pass('network listening')
    })

    var progress = dweb.importFiles(function (err) {
      t.error(err, 'file import err okay')
      var vault = dweb.vault
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
          dweb.close(function (err) {
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

test('dist: resume with .dweb folder', function (t) {
  DWeb(fixtures, function (err, dweb) {
    t.error(err, 'cb without error')
    t.ok(dweb.writable, 'dweb still writable')
    t.ok(dweb.resumed, 'resume flag set')
    t.same(liveKey, dweb.key, 'key matches previous key')
    var stats = dweb.trackStats()

    countFiles({fs: dweb.vault, name: '/'}, function (err, count) {
      t.ifError(err, 'count err')
      var vault = dweb.vault

      t.same(vault.version, 3, 'vault version still')

      var st = stats.get()
      t.same(st.byteLength, fixtureStats.bytes, 'bytes total still the same')
      t.same(count.bytes, fixtureStats.bytes, 'bytes still ok')
      t.same(count.files, fixtureStats.files, 'bytes still ok')
      dweb.close(function () {
        cleanFixtures(function () {
          t.end()
        })
      })
    })
  })
})

test('dist: resume with empty .dweb folder', function (t) {
  var emptyPath = path.join(__dirname, 'empty')
  DWeb(emptyPath, function (err, dweb) {
    t.error(err, 'cb without error')
    t.false(dweb.resumed, 'resume flag false')

    dweb.close(function () {
      DWeb(emptyPath, function (err, dweb) {
        t.error(err, 'cb without error')
        t.ok(dweb.resumed, 'resume flag set')

        dweb.close(function () {
          rimraf(emptyPath, function () {
            t.end()
          })
        })
      })
    })
  })
})

if (!process.env.TRAVIS) {
  test('dist: live - editing file', function (t) {
    DWeb(fixtures, function (err, dweb) {
      t.ifError(err, 'error')

      var importer = dweb.importFiles({ watch: true }, function (err) {
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
        dweb.vault.stat('/folder/empty.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.same(stat.size, 9, 'empty file has new content')
          dweb.close(function () {
            // make file empty again
            fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
            t.end()
          })
        })
      }
    })
  })

  test('dist: live resume & create new file', function (t) {
    var newFile = path.join(fixtures, 'new.txt')
    DWeb(fixtures, function (err, dweb) {
      t.error(err, 'error')
      t.ok(dweb.resumed, 'was resumed')

      var importer = dweb.importFiles({ watch: true }, function (err) {
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
        dweb.vault.stat('/new.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.ok(stat, 'new file in vault')
          fs.unlink(newFile, function () {
            dweb.close(function () {
              t.end()
            })
          })
        })
      }
    })
  })
}

test('dist: cleanup', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('dist: dir storage and opts.temp', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err, 'error')
    t.false(dweb.resumed, 'resume flag false')

    dweb.importFiles(function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dweb.vault, done)
    })

    function done (err) {
      t.error(err, 'error')
      dweb.close(function () {
        t.end()
      })
    }
  })
})

test('dist: ram storage & import other dir', function (t) {
  DWeb(ram, function (err, dweb) {
    t.error(err, 'error')
    t.false(dweb.resumed, 'resume flag false')

    dweb.importFiles(fixtures, function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dweb.vault, done)
    })

    function done (err) {
      t.error(err, 'error')
      dweb.close(function () {
        t.end()
      })
    }
  })
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dweb'), cb)
}
