var path = require('path')
var DWeb = require('..')

var src = path.join(__dirname, '..')

DWeb(src, {temp: true}, function (err, dweb) {
  if (err) throw err

  var network = dweb.joinNetwork()
  network.once('connection', function () {
    console.log('Connected')
  })
  var progress = dweb.importFiles(src, {
    ignore: ['**/@dweb/core/node_modules/**']
  }, function (err) {
    if (err) throw err
    console.log('Done importing')
    console.log('Vault size:', dweb.vault.content.byteLength)
  })
  progress.on('put', function (src, dest) {
    console.log('Added', dest.name)
  })

  console.log(`Sharing: ${dweb.key.toString('hex')}\n`)
})
