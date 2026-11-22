// npm run repro        main.js starts importing new.js; new.js is saved during the build that first loads it
// npm run control      the same save, but new.js was already loaded by the first build
// npm run first-build  new.js is saved during the first build
import { watch } from 'rolldown'
import fs from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const mode = process.argv[2] ?? 'repro'
const saveDuringBuild = mode === 'first-build' ? 1 : 2

fs.rmSync('src', { recursive: true, force: true })
fs.rmSync('dist', { recursive: true, force: true })
fs.mkdirSync('src')
fs.writeFileSync('src/new.js', `export const x = 'OLD'\n`)
if (mode === 'repro') {
  fs.writeFileSync('src/main.js', `console.log('no import yet')\n`)
} else {
  fs.writeFileSync('src/main.js', `import { x } from './new.js'\nconsole.log(x, 'first version')\n`)
}

// Simulates a save in the editor: new.js changes right after the build read it.
let buildsStarted = 0
const saveNewJsDuringBuild = {
  name: 'save-new-js-during-build',
  buildStart() {
    buildsStarted++
  },
  transform(code, id) {
    if (buildsStarted === saveDuringBuild && id.endsWith('new.js') && code.includes('OLD')) {
      fs.writeFileSync('src/new.js', `export const x = 'NEW'\n`)
    }
  },
}

let buildsDone = 0
const watcher = watch({
  input: 'src/main.js',
  output: { dir: 'dist' },
  plugins: [saveNewJsDuringBuild],
})
watcher.on('event', (event) => {
  if (event.code === 'BUNDLE_END') {
    buildsDone++
    event.result.close()
  }
})

await sleep(1000) // the first build is done
if (mode !== 'first-build') {
  // starts the second build
  fs.writeFileSync('src/main.js', `import { x } from './new.js'\nconsole.log(x)\n`)
}
await sleep(2000)

const bundled = fs.readFileSync('dist/main.js', 'utf8').match(/OLD|NEW/)[0]
const onDisk = fs.readFileSync('src/new.js', 'utf8').match(/OLD|NEW/)[0]
console.log(`${mode}: ${buildsDone} builds, dist has ${bundled}, src/new.js has ${onDisk}`)
await watcher.close()
process.exitCode = bundled === onDisk ? 0 : 1
