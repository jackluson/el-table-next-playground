import { reactive, watchEffect } from 'vue'
import { File, compileFile } from '@vue/repl'
import {
  ELEMENT_PLUS_FILE,
  elementPlusFile,
  mainFile,
  welcomeFile,
} from './utils/template'
import { genImportMap, genVueLink } from './utils/dependency'
import { atou, utoa } from './utils/encode'
import type { OutputModes, SFCOptions, Store, StoreState } from '@vue/repl'

export type VersionKey = 'vue' | 'elementPlus'
export type Versions = Record<VersionKey, string>

const isHidden = !import.meta.env.DEV

export class ReplStore implements Store {
  state: StoreState
  compiler!: typeof import('vue/compiler-sfc')
  options?: SFCOptions
  versions: Versions
  initialShowOutput = false
  initialOutputMode: OutputModes = 'preview'

  private pendingCompiler: Promise<typeof import('vue/compiler-sfc')> | null =
    null

  constructor({
    serializedState = '',
    versions = { vue: 'latest', elementPlus: 'latest' },
  }: {
    serializedState?: string
    versions?: Versions
  }) {
    const files: StoreState['files'] = {}
    if (serializedState) {
      const saved = JSON.parse(atou(serializedState))
      for (const filename of Object.keys(saved)) {
        files[filename] = new File(filename, saved[filename])
      }
    } else {
      files[welcomeFile.name] = new File(welcomeFile.name, welcomeFile.code)
      files[mainFile.name] = new File(mainFile.name, mainFile.code, isHidden)
    }

    this.state = reactive({
      mainFile: mainFile.name,
      files,
      activeFile: files[welcomeFile.name],
      errors: [],
      vueRuntimeURL: '',
    })
    this.versions = versions

    this.initImportMap()
  }

  async init() {
    await this.setVueVersion(this.versions.vue)
    this.state.files[elementPlusFile.name] = new File(
      elementPlusFile.name,
      elementPlusFile.code('latest').trim(),
      isHidden
    )

    for (const file of Object.values(this.state.files)) {
      compileFile(this, file)
    }

    watchEffect(() => compileFile(this, this.state.activeFile))
  }

  setActive(filename: string) {
    const file = this.state.files[filename]
    if (file.hidden) return
    this.state.activeFile = this.state.files[filename]
  }

  addFile(fileOrFilename: string | File) {
    const file =
      typeof fileOrFilename === 'string'
        ? new File(fileOrFilename)
        : fileOrFilename
    this.state.files[file.filename] = file
    this.setActive(file.filename)
  }

  deleteFile(filename: string) {
    if (filename === ELEMENT_PLUS_FILE) {
      ElMessage.warning(
        'You cannot remove it, because Element Plus requires it.'
      )
      return
    }
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      if (this.state.activeFile.filename === filename) {
        this.setActive(welcomeFile.name)
      }
      delete this.state.files[filename]
    }
  }

  /**
   * remove default deps
   */
  private simplifyImportMaps() {
    const importMap = this.getImportMap()
    const dependencies = Object.keys(genImportMap({}))

    importMap.imports = Object.fromEntries(
      Object.entries(importMap.imports).filter(
        ([key]) => !dependencies.includes(key)
      )
    )
    return JSON.stringify(importMap)
  }

  serialize() {
    const data = JSON.stringify(
      Object.fromEntries(
        Object.entries(this.getFiles()).map(([file, content]) => {
          if (file === 'import-map.json') {
            try {
              const importMap = this.simplifyImportMaps()
              return [file, importMap]
            } catch {}
          }
          return [file, content]
        })
      )
    )

    return `#${utoa(data)}`
  }

  getFiles() {
    const exported: Record<string, string> = {}
    for (const file of Object.values(this.state.files)) {
      if (file.hidden) continue
      exported[file.filename] = file.code
    }
    return exported
  }

  private initImportMap() {
    if (!this.state.files['import-map.json']) {
      this.state.files['import-map.json'] = new File(
        'import-map.json',
        JSON.stringify({ imports: {} }, null, 2)
      )
    }
  }

  getImportMap() {
    try {
      return JSON.parse(this.state.files['import-map.json'].code)
    } catch (e) {
      this.state.errors = [
        `Syntax error in import-map.json: ${(e as Error).message}`,
      ]
      return {}
    }
  }

  setImportMap(map: {
    imports: Record<string, string>
    scopes?: Record<string, Record<string, string>>
  }) {
    this.state.files['import-map.json']!.code = JSON.stringify(map, null, 2)
  }

  private addDeps() {
    const importMap = this.getImportMap()
    importMap.imports = {
      ...importMap.imports,
      ...genImportMap({
        vue: this.versions.vue,
        elementPlus: this.versions.elementPlus,
      }),
    }
    this.setImportMap(importMap)
  }

  async setVersion(key: VersionKey, version: string) {
    switch (key) {
      case 'elementPlus':
        await this.setElementPlusVersion(version)
        break
      case 'vue':
        await this.setVueVersion(version)
        break
    }
  }

  setElementPlusVersion(version: string) {
    this.versions.elementPlus = version
    this.addDeps()
  }

  async setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    this.pendingCompiler = import(/* @vite-ignore */ compilerSfc)
    this.compiler = await this.pendingCompiler
    this.pendingCompiler = null
    this.state.vueRuntimeURL = runtimeDom
    this.versions.vue = version

    this.addDeps()

    // eslint-disable-next-line no-console
    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }
}
