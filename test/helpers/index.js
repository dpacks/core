var countFiles = require('count-files')

var fixtureStats = {
  files: 3,
  bytes: 1452,
  dirs: 1
}

module.exports.verifyFixtures = function (t, vault, cb) {
  var pending = 4

  vault.stat('/table.csv', function (err, stat) {
    if (err) return cb(err)
    t.same(stat.size, 1441, 'stat size ok')
    if (!--pending) return done()
  })

  vault.stat('/folder/empty.txt', function (err, stat) {
    if (err) return cb(err)
    t.same(stat.size, 0, 'stat size ok')
    if (!--pending) return done()
  })

  vault.readdir('/', function (err, entries) {
    if (err) return cb(err)
    t.ok(entries.indexOf('table.csv') > -1, 'csv in vault')
    t.ok(entries.indexOf('folder') > -1, 'sub dir in vault')
    t.ok(entries.indexOf('hello.txt') > -1, 'hello file vault')
    if (!--pending) return done()
  })

  vault.readdir('/folder', function (err, entries) {
    if (err) return cb(err)
    t.ok(entries.indexOf('empty.txt') > -1, 'has empty file')
    if (!--pending) return done()
  })

  function done () {
    countFiles({fs: vault, name: '/'}, function (err, count) {
      if (err) return cb(err)
      t.same(count, fixtureStats, 'vault stats are correct')
      cb()
    })
  }
}
