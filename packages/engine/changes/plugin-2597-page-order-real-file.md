---
engine: patch
---
Page order on a real file (#2597), plugin only, no committed artifact moves: file-setup and the page-aware build
never move a page that already exists, and a build creates no divider beside a section header that exists. Every
page move goes through one primitive that lands right after its anchor under either reading of the host's
insertChild index, so the in-place Update's forward moves no longer land one slot early.
