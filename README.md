# Rolldown watch: a file saved during the build that first loads it is not rebuilt

Reproduction for <!-- rolldown#10935 comment link once posted -->.

`repro.mjs` runs `rolldown.watch()` on `src/main.js`. After the first build, `main.js` starts importing
`src/new.js`. A plugin saves `new.js` (`'OLD'` → `'NEW'`) right after the second build read it, as an editor save
would. The plugin does not delay the build.

```sh
npm install
npm run repro        # exits 1: no build after the save, dist keeps OLD
npm run control      # new.js was already loaded by the first build: the save is rebuilt
npm run first-build  # exits 1: new.js saved during the first build, never rebuilt
npm run vite         # exits 1: the repro case with `vite build --watch` (Vite's own Rolldown)
```

## Output

rolldown 1.3.3, Vite 8.3.8, Linux x64, Node 26.12.1:

```
repro: 2 builds, dist has OLD, src/new.js has NEW
control: 3 builds, dist has NEW, src/new.js has NEW
first-build: 1 builds, dist has OLD, src/new.js has NEW
vite: 2 builds, dist has OLD, src/new.js has NEW
```

Expected for `repro`, `first-build` and `vite`: one more build, with `NEW`, as in `control`.

The next save of `new.js` is rebuilt. A save at `BUNDLE_END` of the same build is rebuilt too.
