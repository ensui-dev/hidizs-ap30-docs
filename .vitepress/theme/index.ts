// SPDX-License-Identifier: CC0-1.0
import { defineComponent, h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { setupMermaid } from './mermaid'
import './custom.css'

// The default layout, plus the Mermaid renderer.
const Layout = defineComponent({
  setup() {
    setupMermaid()
    return () => h(DefaultTheme.Layout)
  },
})

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme
