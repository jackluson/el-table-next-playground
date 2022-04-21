import { genUnpkgLink } from './dependency'
export const ELEMENT_PLUS_FILE = 'element-plus.js'

export const mainFile = {
  name: 'PlaygroundMain.vue',
  code: `
  <script setup>
  import App from './App.vue'
  import { setupElementPlus } from './${ELEMENT_PLUS_FILE}'
  setupElementPlus()
  </script>
  <template>
    <App />
  </template>`.trim(),
}

const elementPlusCode = (version: string) => `
import { getCurrentInstance } from 'vue'
import ElementPlus from 'element-plus'
import ElTableNext from 'el-table-next'

let installed = false
await loadStyle()

export function setupElementPlus() {
  if(installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
  instance.appContext.app.use(ElTableNext)
  installed = true
}

export function loadStyle() {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
  	link.rel = 'stylesheet'
  	link.href = '${genUnpkgLink('element-plus', version, '/dist/index.css')}'
    link.onload = resolve
    link.onerror = reject
  	document.body.appendChild(link)
  })
}
`

export const elementPlusFile = {
  name: ELEMENT_PLUS_FILE,
  code: elementPlusCode,
}

export const welcomeFile = {
  name: 'App.vue',
  code: `
  <template>
  <h1>
    Hello World
  </h1>
  <el-table-next :column="column" :data="tableData" border />
</template>
<script setup lang="ts">
const column= [
  {
    type: "index",
    width: "60px",
    label: "序号",
  },
  {
    prop: "name",
    label: "名字",
  },
  {
    prop: "date",
    label: "日期",
  },
  {
    prop: "address",
    label: "地址",
  },
];
const tableData = [
  {
    date: "2016-05-02",
    name: "佘太君",
    address: "上海市普陀区金沙江路 1516 弄",
  },
  {
    date: "2016-05-04",
    name: "王小虎",
    address: "上海市普陀区金沙江路 1517 弄",
  },
  {
    date: "2016-05-01",
    name: "王小帅",
    address: "上海市普陀区金沙江路 1519 弄",
  },
  {
    date: "2016-05-03",
    name: "王小呆",
    address: "上海市普陀区金沙江路 1516 弄",
  },
];
</script>
  `.trim(),
}
