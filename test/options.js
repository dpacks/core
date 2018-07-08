var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var encoding = require('@dwebs/codec')

var DPack = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('opts: string or buffer .key', function (t) {
  rimraf.sync(path.join(process.cwd(), '.dpack')) // for failed tests
  var buf = Buffer.alloc(32)
  DPack(process.cwd(), { key: buf }, function (err, dpack) {
    t.error(err, 'no callback error')
    t.deepEqual(dpack.vault.key, buf, 'keys match')

    dpack.close(function (err) {
      t.error(err, 'no close error')

      DPack(process.cwd(), {key: encoding.encode(buf)}, function (err, dpack) {
        t.error(err, 'no callback error')
        t.deepEqual(dpack.vault.key, buf, 'keys match still')
        dpack.close(function () {
          rimraf.sync(path.join(process.cwd(), '.dpack'))
          t.end()
        })
      })
    })
  })
})

test('opts: createIfMissing false', function (t) {
  rimraf.sync(path.join(fixtures, '.dpack'))
  DPack(fixtures, {createIfMissing: false}, function (err, dpack) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('opts: createIfMissing false with empty .dpack', function (t) {
  t.skip('TODO')
  t.end()
  // rimraf.sync(path.join(fixtures, '.dpack'))
  // fs.mkdirSync(path.join(fixtures, '.dpack'))
  // DPack(fixtures, {createIfMissing: false}, function (err, dpack) {
  //   t.ok(err, 'errors')
  //   rimraf.sync(path.join(fixtures, '.dpack'))
  //   t.end()
  // })
})

test('opts: errorIfExists true', function (t) {
  rimraf.sync(path.join(fixtures, '.dpack'))
  // create dpack to resume from
  DPack(fixtures, function (err, dpack) {
    t.ifErr(err)
    dpack.close(function () {
      DPack(fixtures, {errorIfExists: true}, function (err, dpack) {
        t.ok(err, 'throws error')
        t.end()
      })
    })
  })
})

test('opts: errorIfExists true without existing dpack', function (t) {
  rimraf.sync(path.join(fixtures, '.dpack'))
  // create dpack to resume from
  DPack(fixtures, {errorIfExists: true}, function (err, dpack) {
    t.ifErr(err)
    t.end()
  })
})
