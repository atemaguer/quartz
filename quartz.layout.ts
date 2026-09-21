import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

const explorer = Component.Explorer({
  sortFn: (a, b) => {
    // folders first, then files; newest published date first
    if ((!a.isFolder && !b.isFolder) || (a.isFolder && b.isFolder)) {
      const dateA = a.data?.date ? new Date(a.data.date).getTime() : 0
      const dateB = b.data?.date ? new Date(b.data.date).getTime() : 0
      if (dateA !== dateB) {
        return dateB - dateA
      }

      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    if (!a.isFolder && b.isFolder) {
      return 1
    } else {
      return -1
    }
  },
})

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      // GitHub: "https://github.com/jackyzha0/quartz",
      // "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    explorer,
  ],
  right: [
    Component.DesktopOnly(Component.Darkmode()),
    // Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    // Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    explorer,
  ],
  right: [],
}
