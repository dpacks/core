var path = require('path')
var DPack = require('..')

var src = path.join(__dirname, '..')

DPack(src, {temp: true}, function (err, dpack) {
  if (err) throw err

  var network = dpack.joinNetwork()
  network.once('connection', function () {
    console.log('Connected')
  })
  var progress = dpack.importFiles(src, {
    ignore: ['**/@dpack/core/node_modules/**']
  }, function (err) {
    if (err) throw err
    console.log('Done importing')
    console.log('Vault size:', dpack.vault.content.byteLength)
  })
  progress.on('put', function (src, dest) {
    console.log('Added', dest.name)
  })

  console.log(`Sharing: ${dpack.key.toString('hex')}\n`)
})
