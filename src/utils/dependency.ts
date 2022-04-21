import { compare } from 'compare-versions'
import type { MaybeRef } from '@vueuse/core'
import type { Versions } from 'src/store'
import type { Ref } from 'vue'

export const genUnpkgLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : ''
  return `https://unpkg.com/${pkg}${version}${path}`
}

export const genJsdelivrLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : ''
  return `https://cdn.jsdelivr.net/npm/${pkg}${version}${path}`
}

export const genVueLink = (version: string) => {
  const compilerSfc = genUnpkgLink(
    '@vue/compiler-sfc',
    version,
    '/dist/compiler-sfc.esm-browser.js'
  )
  const runtimeDom = genUnpkgLink(
    '@vue/runtime-dom',
    version,
    '/dist/runtime-dom.esm-browser.js'
  )
  return {
    compilerSfc,
    runtimeDom,
  }
}

export const genImportMap = ({ vue, elementPlus }: Partial<Versions> = {}) => {
  interface Dependency {
    pkg?: string
    version?: string
    path: string
    source?: 'unpkg' | 'jsdelivr'
  }
  const deps: Record<string, Dependency> = {
    vue: {
      pkg: '@vue/runtime-dom',
      version: vue,
      path: '/dist/runtime-dom.esm-browser.js',
      source: 'jsdelivr',
    },
    '@vue/shared': {
      version: vue,
      path: '/dist/shared.esm-bundler.js',
      source: 'jsdelivr',
    },
    'element-plus': {
      pkg: 'element-plus',
      version: elementPlus,
      path: '/dist/index.full.min.mjs',
      source: 'jsdelivr',
    },
    'element-plus/': {
      pkg: 'element-plus',
      version: elementPlus,
      path: '/',
      source: 'jsdelivr',
    },
    '@element-plus/icons-vue': {
      path: '/dist/index.min.mjs',
      source: 'jsdelivr',
    },
    'el-table-next': {
      pkg: 'el-table-next',
      version: '1.0.0-beta3',
      path: '/dist/index.mjs',
      source: 'jsdelivr',
    },
  }

  return Object.fromEntries(
    Object.entries(deps).map(([key, dep]) => [
      key,
      (dep.source === 'unpkg' ? genUnpkgLink : genJsdelivrLink)(
        dep.pkg ?? key,
        dep.version,
        dep.path
      ),
    ])
  )
}

export const getVersions = (pkg: MaybeRef<string>) => {
  const url = computed(
    () => `https://data.jsdelivr.com/v1/package/npm/${unref(pkg)}`
  )
  return useFetch(url, {
    initialData: [],
    afterFetch: (ctx) => ((ctx.data = ctx.data.versions), ctx),
    refetch: true,
  }).json<string[]>().data as Ref<string[]>
}

export const getSupportedVueVersions = () => {
  const versions = getVersions('vue')
  return computed(() =>
    versions.value.filter((version) => compare(version, '3.2.0', '>='))
  )
}

export const getSupportedEpVersions = () => {
  const versions = getVersions('element-plus')
  return computed(() => {
    return versions.value.filter((version) =>
      compare(version, '1.1.0-beta.18', '>=')
    )
  })
}
