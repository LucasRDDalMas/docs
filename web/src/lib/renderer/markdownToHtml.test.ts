import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdownToHtml'

describe('markdownToHtml', () => {
  it('renders markdown to html', async () => {
    const { html } = await markdownToHtml('# Hello\n\nWorld')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<p')
    expect(html).toContain('World')
  })

  it('injects data-paragraph-index on block elements', async () => {
    const { html } = await markdownToHtml('# Title\n\nFirst paragraph\n\nSecond paragraph')
    expect(html).toContain('data-paragraph-index="0"')
    expect(html).toContain('data-paragraph-index="1"')
    expect(html).toContain('data-paragraph-index="2"')
  })

  it('strips frontmatter from html but returns it as data', async () => {
    const md = '---\ntitle: Test\n---\n\n# Hello'
    const { html, frontmatter } = await markdownToHtml(md)
    expect(html).not.toContain('title: Test')
    expect(html).toContain('Hello')
    expect(frontmatter.title).toBe('Test')
  })

  it('converts [[wiki links]] to anchor tags', async () => {
    const { html } = await markdownToHtml('See [[Portal Overview]] for details.')
    expect(html).toContain('href="/docs/portal-overview"')
    expect(html).toContain('Portal Overview')
  })

  it('supports [[wiki links|display text]] syntax', async () => {
    const { html } = await markdownToHtml('Read [[portal/overview|the overview]].')
    expect(html).toContain('href="/docs/portal/overview"')
    expect(html).toContain('the overview')
  })
})
