import prepare, { preparePackages } from '@pnpm/prepare'
import loadJsonFile = require('load-json-file')
import fs = require('mz/fs')
import path = require('path')
import tape = require('tape')
import promisifyTape from 'tape-promise'
import writeYamlFile = require('write-yaml-file')
import { execPnpm } from './utils'

const test = promisifyTape(tape)

test('readPackage hook in single project doesn\'t modify manifest', async (t) => {
  const project = prepare(t)
  const pnpmfile = `
      module.exports = { hooks: { readPackage } }
      function readPackage (pkg) {
      pkg.dependencies = pkg.dependencies || {}
      pkg.dependencies['dep-of-pkg-with-1-dep'] = '100.1.0'
      return pkg
      }
  `
  await fs.writeFile('pnpmfile.js', pnpmfile, 'utf8')
  let pkg
  await execPnpm(['add', 'is-positive@1.0.0'])
  pkg = await loadJsonFile(path.resolve('package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '1.0.0' }, 'add dependency & readPackage hook work')

  await execPnpm(['update', 'is-positive@2.0.0'])
  pkg = await loadJsonFile(path.resolve('package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '2.0.0' }, 'update dependency & readPackage hook work')

  await execPnpm(['install'])
  pkg = await loadJsonFile(path.resolve('package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '2.0.0' }, 'install & readPackage hook work')

  await execPnpm(['remove', 'is-positive'])
  pkg = await loadJsonFile(path.resolve('package.json'))
  t.notOk(pkg.dependencies, 'remove & readPackage hook work')
})

test.skip('readPackage hook in monorepo doesn\'t modify manifest', async (t) => {
  const projects = preparePackages(t, [
    {
      name: 'project-a',
      version: '1.0.0',
    },
    {
      name: 'project-b',
      version: '1.0.0',
    },
  ])

  const pnpmfile = `
      module.exports = { hooks: { readPackage } }
      function readPackage (pkg) {
        pkg.dependencies = pkg.dependencies || {}
        pkg.dependencies['dep-of-pkg-with-1-dep'] = '100.1.0'
        return pkg
      }
    `
  await fs.writeFile('pnpmfile.js', pnpmfile, 'utf8')
  await writeYamlFile('pnpm-workspace.yaml', { packages: ['**', '!store/**'] })

  let pkg
  await execPnpm(['add', 'is-positive@1.0.0', '--filter', 'project-a'])
  pkg = await loadJsonFile(path.resolve('project-a/package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '1.0.0' }, 'add dependency & readPackage hook work')

  await execPnpm(['update', 'is-positive@2.0.0', '--filter', 'project-a'])
  pkg = await loadJsonFile(path.resolve('project-a/package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '2.0.0' }, 'update dependency & readPackage hook work')

  await execPnpm(['install', '--filter', 'project-a'])
  pkg = await loadJsonFile(path.resolve('project-a/package.json'))
  t.deepEqual(pkg && pkg.dependencies, { 'is-positive': '2.0.0' }, 'install & readPackage hook work')

  await execPnpm(['remove', 'is-positive', '--filter', 'project-a'])
  pkg = await loadJsonFile(path.resolve('project-a/package.json'))
  t.notOk(pkg.dependencies, 'remove & readPackage hook work')
})