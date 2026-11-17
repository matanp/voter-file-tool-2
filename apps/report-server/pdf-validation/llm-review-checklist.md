# LLM review checklist (PDF validation)

You are reviewing rendered report PDFs after the deterministic checks. Your findings can only
add problems: you cannot pass a fixture, approve or create baselines, accept visual
differences, or waive a deterministic failure. A human does all of that with `approve` and
`accept`.

## Input

`llm-review-request.md` in the run directory lists, for every render, its fixture purpose,
paper size, review notes, and one PNG per page (144 DPI). When a reference exists, it also
lists a diff image: the candidate greyed out, with every changed pixel in red. Open each page
image. Open the diff when there is one.

## Check every page for

1. **Clipped or overflowing content:** text or table rows cut at the page edge, or a table
   running into or past the footer.
2. **Text cut at page edges:** characters missing at the left, right, top or bottom margin.
3. **Overlapping elements:** text over text, text over borders, or a footer over table rows.
4. **Wrong orientation or paper:** compare with the paper named in the request (Letter
   landscape, Legal landscape, Legal portrait). Look for a blank band where content should
   fill the page.
5. **Unreadable text:** wrong font, boxes or tofu, missing glyphs, illegibly small text.
6. **Broken table structure:** missing borders, misaligned columns, header cells wrapping into
   the body, a header without its body or a body without its header.
7. **Truncation:** Committee Roster cells may end in an ellipsis only in the columns the
   request's notes allow. A token at the start of each value must still be visible.
8. **Changes report geometry:** the component lays out an 8.5in-wide portrait container,
   but production prints Letter landscape. Describe what you see: a blank right third,
   clipping, or content off the page. Report clipping or overflow as a `defect`. Report an
   unused band without clipping as a `question` for the human to decide. Never describe it
   as correct.
9. **Petition outcome colours:** Won and Unopposed rows are light green, Tie rows light
   amber, and Lost rows plain white. A wrong colour is a `defect`.
10. **Diffs:** for each red region, say what changed (wrapping, glyph positions, a moved
    row). Missing or duplicated content is a `defect`. A plausible rendering difference with
    identical content is a `question`.

## Output

Write `llm-review.json` in the run directory. Give every page of every render listed in the
request at least one entry; use `"severity": "none"` with a one-line description for a
clean page.

```json
{
  "runId": "<run id>",
  "checklistSha256": "<sha256 of this file, as printed in llm-review-request.md>",
  "reviewer": "claude-code <model>",
  "reviewedAt": "<ISO timestamp>",
  "findings": [
    { "fixture": "roster-quick", "browser": "chrome", "page": 1, "severity": "none", "finding": "Title, LD header, 4 rows, footer; nothing clipped." },
    { "fixture": "changes-quick", "browser": "shell", "page": 1, "severity": "question", "finding": "Table fills the left 8.5in; right 2.5in empty, nothing clipped." }
  ]
}
```

Severities:

- `defect`: a layout problem. The item fails unless a human accepts it.
- `question`: a human should look. The item stays needs-review.
- `none`: no problem on this page.

Then run `pdf-validation verify --run-id <id>` again to merge the review.
