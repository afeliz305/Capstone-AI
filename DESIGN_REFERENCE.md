# Capstone portal design reference

Inspected in Chrome on September 10, 2026. This prototype mirrors the **signed-in portal's light workspace**, not the public homepage's dark promotional layout. The live site was not modified. No student profiles, account photos, grades, messages, or other private portal content were copied into the project.

## Source styles

- [Shared brand tokens](https://capstone.cs.fiu.edu/static/brand/tokens.css?v=p4-557b80cc)
- [Public masthead and brand lockup](https://capstone.cs.fiu.edu/static/public/site.css?v=p4-557b80cc)
- [Portal components](https://capstone.cs.fiu.edu/static/portal/app.css?v=p3-9752da1c)
- [Portal theme overrides](https://capstone.cs.fiu.edu/static/portal/portal-shell.css?v=p3-9752da1c)
- [Help form styles](https://capstone.cs.fiu.edu/static/portal/help_request.css)

The prototype uses its own small stylesheets rather than importing the entire portal CSS cascade. This avoids bringing unrelated selectors, dependencies, or private application functionality into the demo.

## Measured theme

| Element | Portal value used here |
| --- | --- |
| Masthead/sidebar | Flat FIU navy `#081E3F` |
| Selected navigation | Gold `#D1A644` with navy text, 12px corners |
| Workspace | `#F2F4F8`, white `#FFFFFF` surfaces |
| Main action | Blue `#2F6FE0`, white text |
| Font stack | Proxima Nova, Mulish, Inter, system sans-serif |
| Body / headings | 16px body; heavy sans-serif headings, no Georgia |
| Cards | 16px corners, 16px 20px padding, subtle navy border and shadow |
| Controls | 11px corners, 9px 12px padding, at least 40px high |
| Context bar | White, 14px 22px padding, blue term chip |
| Success / warning / error | `#13633A` / `#8A6516` / `#B3261E` on light surfaces |

Secondary text and navigation labels are slightly larger where needed for readability. On narrower screens the chat appears before the reference cards; the sidebar is hidden on phones. The existing search, escalation, account autofill, and queue behavior remain unchanged.

## Assets and attribution

- `public/assets/FIU_mark_white.svg`: unaltered FIU mark from the portal's [public brand asset](https://capstone.cs.fiu.edu/static/brand/FIU_mark_white.svg?v=p4-557b80cc). Used for this FIU Capstone prototype, not as a claim of production approval. FIU branding remains FIU's; confirm usage with the project owner before public release.
- `public/assets/mulish-var.woff2`: the portal's [self-hosted Mulish variable font](https://capstone.cs.fiu.edu/static/fonts/mulish-var.woff2). Bundled locally so the demo needs no third-party font request. Its SIL Open Font License is included in `public/assets/Mulish-OFL.txt`, from the [Google Fonts Mulish license](https://github.com/google/fonts/blob/main/ofl/mulish/OFL.txt).
- `public/assets/icons.svg`: simple outline interface icons authored for this prototype.

No proprietary Proxima Nova font files or browser-extension fonts are bundled. The shared font stack uses the locally bundled Mulish fallback, as supported by the reference site's own brand tokens.
