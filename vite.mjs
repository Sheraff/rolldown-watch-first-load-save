// npm run vite   the repro case with `vite build --watch` (Vite's own Rolldown)
import { build } from 'vite'
import fs from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

fs.rmSync('src', { recursive: true, force: true })
fs.rmSync('dist', { recursive: true, force: true })
fs.mkdirSync('src')
fs.writeFileSync('src/new.js', `export const x = 'OLD'\n`)
fs.writeFileSync('src/main.js', `console.log('no import yet')\n`)

// Simulates a save in the editor: new.js changes right after the build read it.
const saveNewJsDuringBuild = {
  name: 'save-new-js-during-build',
  transform(code, id) {
    if (id.endsWith('new.js') && code.includes('OLD')) {
      fs.writeFileSync('src/new.js', `export const x = 'NEW'\n`)
    }
  },
}

let buildsDone = 0
const watcher = await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [saveNewJsDuringBuild],
  build: {
    watch: {},
    minify: false,
    rolldownOptions: { input: 'src/main.js', output: { entryFileNames: 'main.js' } },
  },
})
watcher.on('event', (event) => {
  if (event.code === 'BUNDLE_END') {
    buildsDone++
    event.result.close()
  }
})

await sleep(1000) // the first build is done
fs.writeFileSync('src/main.js', `import { x } from './new.js'\nconsole.log(x)\n`) // starts the second build
await sleep(2000)

const bundled = fs.readFileSync('dist/main.js', 'utf8').match(/OLD|NEW/)[0]
const onDisk = fs.readFileSync('src/new.js', 'utf8').match(/OLD|NEW/)[0]
console.log(`vite: ${buildsDone} builds, dist has ${bundled}, src/new.js has ${onDisk}`)
await watcher.close()
process.exitCode = bundled === onDisk ? 0 : 1
