# shadcn/ui on Base UI is the component layer, and the look lives in the components

Supersedes [0006](./0006-base-ui-is-the-component-layer.md).

ADR 0006 moved every control onto Base UI but kept "the look in the app's own classes". In practice each screen styled its own buttons, rows and sheets, so design changes meant touching every page, and phone and desktop were fixed one screen at a time. The UI was rebuilt from the master brief (`docs/rebuild/MASTER_BRIEF.md`) on shadcn/ui, using its Base UI variant, so behaviour and accessibility still come from Base UI.

The components are copied into `src/components/ui/` and owned by us (shadcn's model). One token set in `src/app/globals.css` carries the look; pages compose a small set of layout primitives (`AppShell`, `PageHeader`/`PageBody`, `SectionTabs`, `Row`/`RowList`, `Field`/`TextField`, `ResponsiveSheet`, `ConfirmDelete`, `EmptyState`) and do not style a primitive from scratch. A new variant goes into the primitive.

## Consequences

- Phone first: base styles are the phone's (44px controls, 16px inputs, a bottom sheet for detail and forms), `md:` adds the sidebar and the boxed row lists. A page is checked at 320, 390, 768 and 1280.
- One row grammar for every list, one sheet for every detail or form (a bottom sheet on a phone, a dialog on desktop), inline add fields only where a list is the context.
- Dates stay native inputs, money amounts stay plain text inputs with the decimal keyboard, and the statement-import preview uses plain `<select>`s because hundreds of full menus would be slow.
- Toasts still go through Base UI's toast manager and `useConfirm()` still exists for imperative confirms; screens that hold their own state use `ConfirmDelete`.
- A bottom sheet opened by touch focuses the sheet, not its first field, so the keyboard stays closed.
- Light theme only; the tokens are kept dark-ready.
- Reordering budget rows stays press-and-hold on phones and a grip on desktop (no separate mode).
