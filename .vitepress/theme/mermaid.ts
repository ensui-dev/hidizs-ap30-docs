// SPDX-License-Identifier: CC0-1.0
// Renders ```mermaid blocks in the browser with the same Mermaid version GitHub uses (pinned in package.json),
// and renders them again when the reader switches between light and dark.
import { onMounted, watch, nextTick } from 'vue'
import { useData, useRoute } from 'vitepress'

let count = 0

async function renderAll(dark: boolean) {
  const blocks = document.querySelectorAll<HTMLElement>('.vp-doc .mermaid-diagram')
  if (!blocks.length) return
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
  })
  for (const el of blocks) {
    const src = decodeURIComponent(el.dataset.src ?? '')
    try {
      const { svg } = await mermaid.render(`mermaid-${++count}`, src)
      el.innerHTML = svg
      el.classList.add('rendered')
    } catch (e) {
      // keep the source visible and say why
      el.classList.add('failed')
      console.error('mermaid:', e)
    }
  }
}

export function setupMermaid() {
  const { isDark } = useData()
  const route = useRoute()
  onMounted(() => renderAll(isDark.value))
  watch(() => route.path, () => nextTick(() => renderAll(isDark.value)))
  watch(isDark, (dark) => {
    // re-render from the stored source
    document.querySelectorAll<HTMLElement>('.vp-doc .mermaid-diagram.rendered').forEach((el) => el.classList.remove('rendered'))
    renderAll(dark)
  })
}
