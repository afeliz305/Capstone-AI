# Capstone portal design reference

October 12, 2026 compact-dashboard refinement: MIRA now uses a 212px icon-led desktop sidebar, a 68px tablet rail, the existing mobile navigation disclosure, a compact account menu, denser work/weekly/assistant surfaces, an inline next-step status, and an icon-sized launcher on the dashboard. The profile remains **MIRA user / Standalone mode** unless an authorized local or portal-native adapter deliberately provides a display name; email, account IDs, grades, and unrelated profile fields are never requested for this UI. The status presentation describes connection capability only and does not imitate presence.

## Portal theme signal audit

Read-only checks of the current published portal stylesheets and signed-out portal document found no stable, documented root class, `data-theme` attribute, `color-scheme` rule, or public JavaScript preference contract that MIRA can safely treat as the authenticated portal theme. The signed-out page exposes only a navy browser `theme-color` metadata value; that is page chrome, not a user theme preference. MIRA therefore does not inspect portal `localStorage`, cookies, account settings, or arbitrary computed styles.

| Audit item | Result |
| --- | --- |
| Portal theme signal | No stable public/authenticated signal verified |
| Accepted adapter values | Exact `light` or `dark` only |
| Safe to read | **Yes**, only when supplied through the authorized local/portal-native adapter contract |
| Portal preference modified | **No** |
| Follow Portal without a signal | Falls back to Auto/system preference |

The shared theme controller supports **Follow portal**, **Light**, **Dark**, and **Auto**. Follow Portal applies only an allowlisted `light`/`dark` event from an authorized adapter. Missing, cleared, or unrecognized values immediately use the operating-system preference; explicit MIRA Light/Dark choices remain independent. The normal theme button continues to cycle Auto, Dark, and Light for compatibility and accessibility.

October 12, 2026 dashboard candidate: the homepage now presents MIRA as a student operating system rather than a utility landing page. A navy Next Best Step hero establishes priority; compact work metrics and weekly rows carry secondary status; the embedded Ask MIRA surface is visually prominent without exposing every tool at once; and portal, course, and people destinations are grouped into a restrained directory. The desktop navigation rail collapses to icon-only at intermediate widths and to an accessible disclosure on mobile. Every private-data widget defines live, unavailable, and loading presentation; the standalone build defaults to unavailable and never displays an unknown value as zero. The icon sprite now covers the full dashboard vocabulary with one outline family. Dark mode uses the established deep-navy surfaces rather than color inversion, while the mobile launcher is deliberately compact to avoid hiding hero actions.

October 9, 2026 UX modernization candidate: the shared theme layer now supports system, dark, and light presentation across MIRA, Staff Queue, recovery, syllabus, cards, dialogs, chips, and generated hosting notices. The floating assistant prioritizes **My Capstone** and **Check my work**; Guide me, Ask a person, temporary shared information, and fictional sample data are grouped under **More tools**. Context is a compact collapsible chip, response depth is an optional compact selector, source/guidance blocks use reusable raised-surface tokens, and the launcher has subtle hover/open motion plus a one-time dismissible signal. Desktop, tablet, 200% zoom, 390px, and 320px are the required browser smoke sizes. The redesign does not copy FARO, change source authority, or grant hosted access to private portal data.

October 8, 2026 candidate refresh: MIRA now defines shared audited tokens for FIU navy `#081E3F`, gold `#D1A644`, dark canvas `#0B1426`, dark cards `#111D33`, border `#24365A`, primary text `#E6EBF3`, muted text `#A3B0C4`, success `#2E7D4F`, and warning `#9A6212`. Mulish, approximately 15px/24px body text, 8px controls, 10px cards, 4px badges, pill controls, consistent focus treatment, and denser staff surfaces align the prototype with the current portal without copying its stylesheet or administrative controls. MIRA-specific chat, source/evidence, privacy, temporary-information, and staff-workflow patterns remain distinct. Responsive acceptance covers desktop, 390px, and 320px.

The current assistant brand is **MIRA (Messaging, Information & Resolution Assistant)**. The unchanged technical Ocelot folder may still contain the previous project name.

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

The current project is **MIRA**. Its minimized launcher is a compact navy button with an original white speech-bubble icon, three gold dots, a project-name line, and **Let's chat**. The SVG is drawn from basic geometry with no mascot, raster image, or third-party icon dependency. The button is at least 68px high on desktop and 60px on mobile; the icon is 48px/44px. Its accessible name is **Open MIRA chat**, with visible keyboard focus and an empty decorative image alt. Opening reveals the existing floating non-modal popup; minimizing/Escape restores launcher focus and keeps unsent text. Extra mobile bottom spacing keeps the final content reachable. Search, escalation, account autofill, and ticket storage behavior are unchanged.

## Assets and attribution

- `css/images/FIU_mark_white.svg`: unaltered FIU mark from the portal's [public brand asset](https://capstone.cs.fiu.edu/static/brand/FIU_mark_white.svg?v=p4-557b80cc). Used for this FIU Capstone prototype, not as a claim of production approval. FIU branding remains FIU's; confirm usage with the project owner before public release.
- `css/fonts/mulish-var.woff2`: the portal's [self-hosted Mulish variable font](https://capstone.cs.fiu.edu/static/fonts/mulish-var.woff2). Bundled locally so the demo needs no third-party font request. Its SIL Open Font License is included in `docs/licenses/Mulish-OFL.txt`, from the [Google Fonts Mulish license](https://github.com/google/fonts/blob/main/ofl/mulish/OFL.txt).
- `css/images/icons.svg`: simple outline interface icons authored for this prototype.
- `css/images/capstone-chat.svg`: original, code-drawn generic chat icon introduced September 24. Included by the Node allowlist and every hosting package. Retired mascot artwork and its old HTML preview are preserved only in ignored local `dist/archive/branding/`, not served or packaged. Existing Git history and older release archives are unchanged. The FIU header mark is unchanged; this icon replacement is not a blanket clearance of institutional branding.

No proprietary Proxima Nova font files or browser-extension fonts are bundled. The shared font stack uses the locally bundled Mulish fallback, as supported by the reference site's own brand tokens.
