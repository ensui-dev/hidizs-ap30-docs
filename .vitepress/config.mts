// SPDX-License-Identifier: CC0-1.0
// Site configuration for the GitHub Pages build of hidizs-ap30-docs.
// The Markdown pages stay plain GitHub-flavoured Markdown: nothing here requires front matter,
// so every page reads the same on github.com and on the site.
import { defineConfig, type DefaultTheme } from 'vitepress'
import GithubSlugger from 'github-slugger'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = 'https://github.com/ensui-dev/hidizs-ap30-docs'

// Section order and page order come from the "Layout" block in README.md, so the README stays
// the single place that defines the structure.
const sections: { dir: string; title: string }[] = [
  { dir: 'overview', title: 'Overview' },
  { dir: 'hardware', title: 'Hardware' },
  { dir: 'firmware', title: 'Firmware' },
  { dir: 'formats', title: 'Formats' },
  { dir: 'guides', title: 'Guides' },
  { dir: 'related', title: 'Related' },
  { dir: 'community', title: 'Community' },
]

function layoutOrder(): Map<string, string[]> {
  const order = new Map<string, string[]>()
  const readme = readFileSync(join(root, 'README.md'), 'utf8')
  const block = readme.split('## Layout')[1]?.split('```')[1] ?? ''
  let dir = ''
  for (const line of block.split('\n')) {
    const d = line.match(/^([a-z_]+)\/\s*$/)
    if (d) { dir = d[1]; order.set(dir, []); continue }
    const f = line.match(/^\s+([A-Za-z0-9_]+\.md)\b/)
    if (f && dir) order.get(dir)!.push(f[1])
  }
  return order
}

function pageTitle(file: string): string {
  const text = readFileSync(join(root, file), 'utf8')
  const h = text.match(/^#\s+(.+)$/m)
  return h ? h[1].replace(/[`*_]/g, '').trim() : file
}

function sidebar(): DefaultTheme.SidebarItem[] {
  const order = layoutOrder()
  return sections.map(({ dir, title }) => {
    const files = (order.get(dir) ?? []).filter((f) => existsSync(join(root, dir, f)))
    const items = files
      .filter((f) => f !== 'README.md')
      .map((f) => ({ text: pageTitle(`${dir}/${f}`), link: `/${dir}/${f.replace(/\.md$/, '')}` }))
    const hasIndex = existsSync(join(root, dir, 'README.md'))
    return {
      text: title,
      link: hasIndex ? `/${dir}/` : undefined,
      collapsed: dir !== 'overview',
      items,
    }
  })
}

// Heading anchors use GitHub's rules, so "Contents" links written for github.com work here too.
const slugger = new GithubSlugger()

export default defineConfig({
  lang: 'en',
  title: 'hidizs-ap30-docs',
  description: 'Unofficial, open documentation of the Hidizs AP30: hardware, firmware, formats, recovery.',
  base: '/hidizs-ap30-docs/',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['LICENSES/**', '.github/**', 'node_modules/**'],
  rewrites: {
    'README.md': 'index.md',
    ':dir/README.md': ':dir/index.md',
  },
  head: [
    ['meta', { property: 'og:image', content: 'https://ensui-dev.github.io/hidizs-ap30-docs/social-preview.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  markdown: {
    // The pages contain no intended HTML; text such as `<id>` or `<= 0x40` must stay text.
    html: false,
    // `{offset, size}` in tables and text is data, not markdown-it attribute syntax.
    attrs: { disable: true },
    // Links to files that are not pages (LICENSE, LICENSES/*.txt, .github/...) point to the file on
    // GitHub on the site, and links to README.md go to the folder index, while the Markdown keeps
    // plain relative links that also work on github.com.
    config: (md) => {
      md.core.ruler.push('repo_file_links', (state) => {
        const page: string = (state.env as any).relativePath ?? ''
        for (const block of state.tokens) {
          for (const tok of block.children ?? []) {
            if (tok.type !== 'link_open') continue
            const href = tok.attrGet('href')
            if (!href || /^[a-z]+:|^#|^\//i.test(href)) continue
            const [path, hash] = href.split('#')
            const target = posix.normalize(posix.join(posix.dirname(page), path))
            if (/^(LICENSE|LICENSES\/.+|\.github\/.+)$/.test(target)) {
              tok.attrSet('href', `${repo}/blob/main/${target}${hash ? '#' + hash : ''}`)
            }
            // Plain links to full-size photos: serve the file from the repository (raw), since only
            // embedded images (![...]) are copied into the site build.
            else if (/^images\/.+\.(jpe?g|png)$/i.test(target)) {
              tok.attrSet('href', `${repo}/raw/main/${target}`)
            }
            // README.md pages are served as their folder's index (see rewrites).
            else if (/(^|\/)README\.md$/.test(path)) {
              tok.attrSet('href', path.replace(/README\.md$/, 'index.md') + (hash ? '#' + hash : ''))
            }
          }
        }
      })
    },
    anchor: {
      slugify: (s: string) => { slugger.reset(); return slugger.slug(s) },
    },
  },
  themeConfig: {
    nav: [
      { text: 'Overview', link: '/overview/device' },
      { text: 'Hardware', link: '/hardware/', activeMatch: '^/hardware/(?!photos)' },
      { text: 'Photos', link: '/hardware/photos' },
      { text: 'Firmware', link: '/firmware/' },
      { text: 'Guides', link: '/guides/' },
      { text: 'Contribute', link: '/CONTRIBUTING' },
    ],
    sidebar: sidebar(),
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repo }],
    editLink: { pattern: `${repo}/edit/main/:path`, text: 'Edit this page on GitHub' },
    footer: {
      message: 'Text CC BY 4.0 · data tables and snippets CC0 1.0 · not affiliated with Hidizs',
      copyright: 'the hidizs-ap30-docs contributors',
    },
  },
})
