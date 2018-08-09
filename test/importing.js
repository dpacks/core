var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var countFiles = require('count-files')
var tmpDir = require('temporary-directory')

var DWeb = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('importing: import two directories at same time', function (t) {
  rimraf.sync(path.join(fixtures, '.dweb')) // for previous failed tests
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err, 'error')
    var pending = 2
    dweb.importFiles(function (err) {
      t.error(err, 'error')
      t.pass('ok')
      if (!--pending) done()
    })
    dweb.importFiles(path.join(__dirname, '..', 'examples'), function (err) {
      t.error(err, 'error')
      if (!--pending) done()
    })

    function done () {
      countFiles({fs: dweb.vault, name: '/'}, function (err, count) {
        t.error(err, 'error')
        t.same(count.files, 6, 'five files total')
        t.end()
      })
    }
  })
})

test('importing: custom ignore extends default (string)', function (t) {
  rimraf.sync(path.join(fixtures, '.dweb')) // for previous failed tests
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    dweb.importFiles({ ignore: '**/*.js' }, function () {
      var shouldIgnore = dweb.options.importer.ignore
      t.ok(shouldIgnore('.dweb'), '.dweb folder ignored')
      t.ok(shouldIgnore('foo/bar.js'), 'custom ignore works')
      t.notOk(shouldIgnore('foo/bar.txt'), 'txt file gets to come along =)')
      dweb.close(function () {
        t.end()
      })
    })
  })
})

test('importing: custom ignore extends default (array)', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    dweb.importFiles({ ignore: ['super_secret_stuff/*', '**/*.txt'] }, function () {
      var shouldIgnore = dweb.options.importer.ignore

      t.ok(shouldIgnore('.dweb'), '.dweb still feeling left out =(')
      t.ok(shouldIgnore('password.txt'), 'file ignored')
      t.ok(shouldIgnore('super_secret_stuff/file.js'), 'secret stuff stays secret')
      t.notOk(shouldIgnore('foo/bar.js'), 'js file joins the party =)')
      dweb.close(function () {
        t.end()
      })
    })
  })
})

test('importing: ignore hidden option turned off', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    dweb.importFiles({ ignoreHidden: false }, function () {
      var shouldIgnore = dweb.options.importer.ignore

      t.ok(shouldIgnore('.dweb'), '.dweb still feeling left out =(')
      t.notOk(shouldIgnore('.other-hidden'), 'hidden file NOT ignored')
      t.notOk(shouldIgnore('dir/.git'), 'hidden folders with dir NOT ignored')
      dweb.close(function () {
        rimraf.sync(path.join(fixtures, '.dweb'))
        t.end()
      })
    })
  })
})

test('importing: ignore dirs option turned off', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    dweb.importFiles({ ignoreDirs: false }, function () {
      var stream = dweb.vault.history()
      var hasFolder = false
      var hasRoot = false
      stream.on('data', function (data) {
        if (data.name === '/folder') hasFolder = true
        if (data.name === '/') hasRoot = true
      })
      stream.on('end', function () {
        t.ok(hasFolder, 'folder in metadata')
        t.ok(hasRoot, 'root in metadata')
        dweb.close(function () {
          rimraf.sync(path.join(fixtures, '.dweb'))
          t.end()
        })
      })
    })
  })
})

test('importing: import with options but no callback', function (t) {
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    var importer = dweb.importFiles({ dryRun: true })
    importer.on('error', function (err) {
      t.error(err, 'no error')
    })
    dweb.close(function (err) {
      t.error(err, 'no err')
      rimraf.sync(path.join(fixtures, '.dweb'))
      t.end()
    })
  })
})

test('importing: import with .dwebignore', function (t) {
  fs.writeFileSync(path.join(fixtures, '.dwebignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    var importer = dweb.importFiles(function (err) {
      t.error(err)

      var shouldIgnore = dweb.options.importer.ignore
      t.ok(shouldIgnore('.dweb'), '.dweb ignored')
      dweb.close(function () {
        fs.unlinkSync(path.join(fixtures, '.dwebignore'))
        fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
        rimraf.sync(path.join(fixtures, '.dweb'))
        t.end()
      })
    })
    importer.on('put', function (file) {
      if (file.name.indexOf('ignoreme.txt') > -1) t.fail('ignored file imported')
    })
  })
})

test('importing: import with opts.useDWebIgnore false', function (t) {
  fs.writeFileSync(path.join(fixtures, '.dwebignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')
  DWeb(fixtures, {temp: true}, function (err, dweb) {
    t.error(err)
    var fileImported = false
    var importer = dweb.importFiles({useDWebIgnore: false}, function (err) {
      t.error(err)

      var shouldIgnore = dweb.options.importer.ignore
      t.ok(shouldIgnore('.dweb'), '.dweb ignored')
      dweb.close(function () {
        if (!fileImported) t.fail('file in .dwebignore not imported')
        fs.unlinkSync(path.join(fixtures, '.dwebignore'))
        fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
        rimraf.sync(path.join(fixtures, '.dweb'))
        t.end()
      })
    })
    importer.on('put', function (file) {
      if (file.name.indexOf('ignoreme.txt') > -1) {
        fileImported = true
        t.pass('ignored file imported')
      }
    })
  })
})

test('importing: import from hidden folder src', function (t) {
  tmpDir(function (_, dir, cleanup) {
    dir = path.join(dir, '.hidden')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'hello.txt'), 'hello world')
    DWeb(dir, {temp: true}, function (err, dweb) {
      t.error(err, 'no error')
      dweb.importFiles(function (err) {
        t.error(err)
        t.same(dweb.vault.version, 1, 'vault has 1 file')
        dweb.vault.stat('/hello.txt', function (err, stat) {
          t.error(err, 'no error')
          t.ok(stat, 'file added')
          dweb.close(function () {
            cleanup(function () {
              t.end()
            })
          })
        })
      })
    })
  })
})
