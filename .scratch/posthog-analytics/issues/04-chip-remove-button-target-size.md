# 04 - Chip "×" remove buttons are a 16px target

Status: resolved

## Problem

The remove button on value chips is a 12px icon (`h-3 w-3`) with `p-0.5`, about 16×16px in total. During the May
volunteer session it drew rage clicks. That's below the WCAG 2.2 SC 2.5.8 minimum target size of 24×24px. It's
also hard to hit on a phone or trackpad.

Same markup in two places:
- `apps/frontend/src/components/ui/MultiValueInputBase.tsx:195`
- `apps/frontend/src/components/ui/MultiSelectCombobox.tsx:114`

## Do

- Make the clickable area at least 24×24px, by enlarging the button or with a padded hit area or negative margin,
  so the chip doesn't look bigger.
- Give each remove button an accessible name that names the value (e.g. "Remove MAIN ST"), if it doesn't have one.
- Pull the two copies into one component if that's cheap.

## Done when

Both components render a ≥24px target, there's a test for the accessible name, and the existing
`SearchRow` / `FieldRenderer` integration tests still pass.

## Comments

2026-11-21: Done. Both chips now use `components/ui/ChipRemoveButton.tsx`: a 24×24px button with negative margins
so the chip's height and the visible hover circle don't change. Its accessible name is "Remove <label>". In
`MultiValueInputBase` that's new; `MultiSelectCombobox` already had one. Test:
`__tests__/components/ChipRemoveButton.test.tsx`. Not yet checked visually in the running app.
