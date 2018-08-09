var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var encoding = require('@dwebs/codec')

var DWeb = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('opts: string or buffer .key', function (t) {
  rimraf.sync(path.join(process.cwd(), '.dweb')) // for failed tests
  var buf = Buffer.alloc(32)
  DWeb(process.cwd(), { key: buf }, function (err, dweb) {
    t.error(err, 'no callback error')
    t.deepEqual(dweb.vault.key, buf, 'keys match')

    dweb.close(function (err) {
      t.error(err, 'no close error')

      DWeb(process.cwd(), {key: encoding.encode(buf)}, function (err, dweb) {
        t.error(err, 'no callback error')
        t.deepEqual(dweb.vault.key, buf, 'keys match still')
        dweb.close(function () {
          rimraf.sync(path.join(process.cwd(), '.dweb'))
          t.end()
        })
      })
    })
  })
})

test('opts: createIfMissing false', function (t) {
  rimraf.sync(path.join(fixtures, '.dweb'))
  DWeb(fixtures, {createIfMissing: false}, function (err, dweb) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('opts: createIfMissing false with empty .dweb', function (t) {
  t.skip('TODO')
  t.end()
  // rimraf.sync(path.join(fixtures, '.dweb'))
  // fs.mkdirSync(path.join(fixtures, '.dweb'))
  // DWeb(fixtures, {createIfMissing: false}, function (err, dweb) {
  //   t.ok(err, 'errors')
  //   rimraf.sync(path.join(fixtures, '.dweb'))
  //   t.end()
  // })
})

test('opts: errorIfExists true', function (t) {
  rimraf.sync(path.join(fixtures, '.dweb'))
  // create dpack to resume from
  DWeb(fixtures, function (err, dweb) {
    t.ifErr(err)
    dweb.close(function () {
      DWeb(fixtures, {errorIfExists: true}, function (err, dweb) {
        t.ok(err, 'throws error')
        t.end()
      })
    })
  })
})

test('opts: errorIfExists true without existing dpack', function (t) {
  rimraf.sync(path.join(fixtures, '.dweb'))
  // create dpack to resume from
  DWeb(fixtures, {errorIfExists: true}, function (err, dweb) {
    t.ifErr(err)
    t.end()
  })
})
