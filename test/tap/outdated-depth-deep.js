var common = require('../common-tap')
var path = require('path')
var test = require('tap').test
var rimraf = require('rimraf')
var mr = require('npm-registry-mock')
var pkg = path.resolve(__dirname, 'outdated-depth-deep')
var cache = path.resolve(pkg, 'cache')
var escapeExecPath = require('../../lib/utils/escape-exec-path.js')

var osenv = require('osenv')
var mkdirp = require('mkdirp')
var fs = require('fs')

var pj = JSON.stringify({
  'name': 'whatever',
  'description': 'yeah idk',
  'version': '1.2.3',
  'main': 'index.js',
  'dependencies': {
    'underscore': '1.3.1',
    'npm-test-peer-deps': '0.0.0'
  },
  'repository': 'git://github.com/luk-/whatever'
}, null, 2)

function cleanup () {
  process.chdir(osenv.tmpdir())
  rimraf.sync(pkg)
}

function setup () {
  mkdirp.sync(pkg)
  process.chdir(pkg)
  fs.writeFileSync(path.resolve(pkg, 'package.json'), pj)
}

test('setup', function (t) {
  cleanup()
  setup()
  t.end()
})

test('outdated depth deep (9999)', function (t) {
  var NPM_OPTS = {
    cwd: pkg,
    cache: cache
  }
  mr({ port: common.port }, function (er, s) {
    common.npm([
      'install', '.',
      '--registry', common.registry
    ], NPM_OPTS, function (err, code, stdout, stderr) {
      t.ifErr(err, 'command ran without error')
      t.equal(code, 0, 'install completed successfully')
      t.equal('', stderr, 'no error output')
      common.npm([
        'explore', 'npm-test-peer-deps', '--',
        common.nodeBinEscaped,
        escapeExecPath(common.bin),
        'install', 'underscore',
        '--registry', common.registry
      ], NPM_OPTS, function (err, code, stdout, stderr) {
        t.ifErr(err, 'command ran without error')
        t.equal(code, 0, 'explore completed successfully')
        t.equal('', stderr, 'no error output')
        common.npm([
          'outdated',
          '--depth', 9999,
          '--registry', common.registry
        ], NPM_OPTS, function (err, code, stdout, stderr) {
          t.ifErr(err, 'command ran without error')
          t.equal(code, 0, 'outdated completed successfully')
          t.equal('', stderr, 'no error output')
          t.match(
            stdout,
            /underscore.*1\.3\.1.*1\.3\.1.*1\.5\.1.*whatever\n/g,
            'child package listed')
          t.match(
            stdout,
            /underscore.*1\.3\.1.*1\.3\.1.*1\.5\.1.*whatever > npm-test-peer-deps/g,
            'child package listed')
          s.close()
          t.end()
        })
      })
    })
  })
})

test('cleanup', function (t) {
  cleanup()
  t.end()
})
