# Repository text hygiene

This repository is edited heavily by humans and AI tools. The rules below prevent
mojibake, line-ending churn, and fragile partial patches on corrupted text.

## Encoding and line endings

- All tracked text files must be **UTF-8** (no invalid byte sequences).
- Line endings must be **LF only** (no CRLF in text files).
- Do not commit the Unicode replacement character (U+FFFD).

`.editorconfig` and `.gitattributes` enforce these defaults in editors and git checkouts.

## Punctuation in markdown and governance files

In `*.md`, `*.txt`, and similar documentation under this repo, prefer **ASCII punctuation**:

| Avoid | Use instead |
|-------|-------------|
| Curly/smart single quotes | `'` |
| Curly/smart double quotes | `"` |
| Em dash or en dash | `-` or ` -- ` |
| Ellipsis character | `...` |
| Fancy bullets or arrows | `-` or `->` |

Smart punctuation often survives copy-paste and re-encoding as mojibake (garbled
apostrophe/quote/dash sequences when UTF-8 is read as Windows-1252).

## AI and manual editing when text is corrupted

If a file shows mojibake or replacement characters:

1. **Do not** apply small line-level hunks over corrupted spans.
2. **Replace the whole section** bounded by a markdown heading, or the **whole file** if it is small and mostly corrupted.
3. Re-type affected prose in plain ASCII punctuation.
4. Save as UTF-8 with LF endings.

## Checks

From the repository root:

```bash
npm run check:text
```

This runs `scripts/check-text-hygiene.js`, which scans **git-tracked** text files for:

- Common mojibake byte sequences
- U+FFFD replacement characters
- CRLF (or bare CR) line endings
- Invalid UTF-8

Optional git whitespace check (trailing space, conflict markers):

```bash
git diff --check
```

Add `npm run check:text` to CI or a pre-commit hook if you want failures to block merges.
