var fs = require('fs')
var path = require('path')
var mirror = require('@dpack/mirror')
var ram = require('random-access-memory')
var DPack = require('..')

var key = process.argv[2]
if (!key) {
  console.error('Run with: node examples/download.js <key>')
  process.exit(1)
}

var dest = path.join(__dirname, 'tmp')
fs.mkdirSync(dest)

DPack(ram, {key: key, sparse: true}, function (err, dpack) {
  if (err) throw err

  var network = dpack.joinNetwork()
  network.once('connection', function () {
    console.log('Connected')
  })
  dpack.vault.metadata.update(download)

  function download () {
    var progress = mirror({fs: dpack.vault, name: '/'}, dest, function (err) {
      if (err) throw err
      console.log('Done')
    })
    progress.on('put', function (src) {
      console.log('Downloading', src.name)
    })
  }

  console.log(`Downloading: ${dpack.key.toString('hex')}\n`)
})
