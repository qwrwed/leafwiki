import { EditorView } from '@codemirror/view'

export function insertWrappedText(
  view: EditorView,
  before: string,
  after: string = before,
) {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const hasSelection = from !== to

  if (hasSelection) {
    // Case 1: The selection itself IS the formatted block (e.g. user selected "**bold**")
    if (
      selected.startsWith(before) &&
      selected.endsWith(after) &&
      selected.length > before.length + after.length
    ) {
      const unwrapped = selected.slice(
        before.length,
        selected.length - after.length,
      )
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from + unwrapped.length },
      })
      view.focus()
      return
    }

    // Case 2: Markers are directly outside the selection (e.g. user selected "bold" with ** around it)
    const docLen = view.state.doc.length
    const extBefore = view.state.doc.sliceString(
      Math.max(0, from - before.length),
      from,
    )
    const extAfter = view.state.doc.sliceString(
      to,
      Math.min(docLen, to + after.length),
    )
    if (extBefore === before && extAfter === after) {
      view.dispatch({
        changes: [
          { from: from - before.length, to: from, insert: '' },
          { from: to, to: to + after.length, insert: '' },
        ],
        selection: { anchor: from - before.length + selected.length },
      })
      view.focus()
      return
    }
  }

  const insertText = hasSelection
    ? `${before}${selected}${after}`
    : `${before}${after}`
  const cursorPos = hasSelection
    ? from + insertText.length
    : from + before.length

  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: { anchor: cursorPos },
  })
  view.focus()
}

// Matches VS Code's default auto-surround pairs.
export const AUTO_SURROUND_PAIRS: Record<string, [string, string]> = {
  '(': ['(', ')'],
  '[': ['[', ']'],
  '{': ['{', '}'],
  '<': ['<', '>'],
  "'": ["'", "'"],
  '"': ['"', '"'],
  '`': ['`', '`'],
  '~': ['~', '~'],
}

// Prepends "> " to every line touched by the current selection (or just the
// cursor's line, if the selection is empty). Reselects the whole prepended
// block afterwards, so pressing `>` again nests another quote level.
export function blockquoteSelectedLines(view: EditorView) {
  const { from, to } = view.state.selection.main
  let firstLine = view.state.doc.lineAt(from)
  let lastLine = view.state.doc.lineAt(to)
  // If the selection starts exactly at the end of the previous line, nothing
  // in that line is actually selected (can happen with a bottom-to-top drag
  // that resolves its endpoint to the prior line's last position) — don't
  // count it as touched.
  if (from !== to && from === firstLine.to) {
    firstLine = view.state.doc.lineAt(from + 1)
  }
  // If the selection ends exactly at the start of a line, nothing in that
  // line is actually selected (common with a trailing newline, or a
  // Shift+Down-style selection) — don't count it as touched.
  if (from !== to && to === lastLine.from) {
    lastLine = view.state.doc.lineAt(to - 1)
  }
  // Degenerate case: both adjustments fired (e.g. the selection spans just
  // a single line break) — fall back to the line the selection started on.
  if (firstLine.number > lastLine.number) {
    firstLine = view.state.doc.lineAt(from)
    lastLine = firstLine
  }

  const changes = []
  for (let n = firstLine.number; n <= lastLine.number; n++) {
    const line = view.state.doc.line(n)
    changes.push({ from: line.from, to: line.from, insert: '> ' })
  }
  const linesTouched = lastLine.number - firstLine.number + 1

  view.dispatch({
    changes,
    selection: { anchor: firstLine.from, head: lastLine.to + linesTouched * 2 },
  })
  view.focus()
}

// If the selection is non-empty and starts at the beginning of its line,
// typing `>` blockquotes every touched line instead of just typing `>` at
// that position. Returns true (caller should preventDefault) if it fired.
export function autoBlockquoteSelection(view: EditorView, key: string) {
  if (key !== '>') return false

  const { from, to } = view.state.selection.main
  if (from === to) return false
  if (view.state.doc.lineAt(from).from !== from) return false

  blockquoteSelectedLines(view)
  return true
}

// If the view has a non-empty selection and `key` is one of the surround
// trigger characters, wraps the selection in the matching pair and returns
// true (caller should preventDefault). Otherwise returns false and leaves
// the view untouched, so the caller falls through to normal typing.
//
// Keeps the original (inner) text selected afterwards, not the whole wrapped
// block, so typing another surround character nests another pair around it
// (e.g. selecting "text", typing "(" then "*" gives "(*text*)").
export function autoSurroundSelection(view: EditorView, key: string) {
  const pair = AUTO_SURROUND_PAIRS[key]
  if (!pair) return false

  const { from, to } = view.state.selection.main
  if (from === to) return false

  const [before, after] = pair
  const selected = view.state.doc.sliceString(from, to)

  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
  })
  view.focus()
  return true
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Replaces a filename in markdown link/image targets (`[text](.../old)` -> `[text](.../new)`).
// Also updates the link/alt text itself when it exactly matches the old filename, since
// inserted assets default to using the filename as their alt/link text.
export function replaceFilenameInText(
  docText: string,
  before: string,
  after: string,
) {
  const newFilename = after.startsWith('/') ? after.slice(1) : after
  const regex = new RegExp(
    `(!?\\[)([^\\]]*?)(\\]\\((?:(?!\\]\\().)*?\\/?)\\/${escapeRegExp(before)}(\\))`,
    'g',
  )

  return docText.replace(
    regex,
    (_match, bracket, altText, pathPrefix, closeParen) => {
      const newAltText = altText === before ? newFilename : altText
      return `${bracket}${newAltText}${pathPrefix}/${newFilename}${closeParen}`
    },
  )
}

// Wraps the current selection in a `:::collapsed <title>` / `:::` block and
// selects the title text, so typing immediately replaces it.
export function insertCollapsibleBlock(view: EditorView, title: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const before = `:::collapsed ${title}\n`
  const after = '\n:::'
  const insertText = `${before}${selected}${after}`
  const titleStart = from + ':::collapsed '.length
  const titleEnd = titleStart + title.length

  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: { anchor: titleStart, head: titleEnd },
  })
  view.focus()
}

// Inserts a heading of the specified level (1, 2, or 3) at the current line at the start position
export function insertHeadingAtStart(view: EditorView, level: 1 | 2 | 3) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const lineStart = line.from
  const prefix = '#'.repeat(level) + ' '

  const transaction = view.state.update({
    changes: { from: lineStart, insert: prefix },
    selection: { anchor: from + prefix.length - (from - lineStart) },
    scrollIntoView: true,
  })
  view.dispatch(transaction)
  view.focus()
}
