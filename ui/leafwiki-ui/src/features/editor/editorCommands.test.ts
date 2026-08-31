import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import {
  autoBlockquoteSelection,
  autoSurroundSelection,
  blockquoteSelectedLines,
  replaceFilenameInText,
} from './editorCommands'

function makeView(doc: string, from: number, to: number) {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: from, head: to },
    }),
  })
}

describe('replaceFilenameInText', () => {
  it('updates both the src filename and the alt text when the alt text matches the old filename', () => {
    const doc = '![old-name.png](/assets/old-name.png)'
    const result = replaceFilenameInText(doc, 'old-name.png', 'new-name.png')
    expect(result).toBe('![new-name.png](/assets/new-name.png)')
  })

  it('updates the src filename but preserves custom alt text that does not match the old filename', () => {
    const doc = '![a nice photo](/assets/old-name.png)'
    const result = replaceFilenameInText(doc, 'old-name.png', 'new-name.png')
    expect(result).toBe('![a nice photo](/assets/new-name.png)')
  })

  it('updates plain (non-image) markdown links the same way', () => {
    const doc = '[old-name.pdf](/assets/old-name.pdf)'
    const result = replaceFilenameInText(doc, 'old-name.pdf', 'new-name.pdf')
    expect(result).toBe('[new-name.pdf](/assets/new-name.pdf)')
  })

  it('handles filenames containing regex-special characters', () => {
    const doc = '![old (1).png](/assets/old (1).png)'
    const result = replaceFilenameInText(doc, 'old (1).png', 'new.png')
    expect(result).toBe('![new.png](/assets/new.png)')
  })

  it('replaces every occurrence in the document', () => {
    const doc = [
      '![old-name.png](/assets/old-name.png)',
      'See also [old-name.png](/assets/old-name.png) below.',
    ].join('\n')
    const result = replaceFilenameInText(doc, 'old-name.png', 'new-name.png')
    expect(result).toBe(
      [
        '![new-name.png](/assets/new-name.png)',
        'See also [new-name.png](/assets/new-name.png) below.',
      ].join('\n'),
    )
  })

  it('does not match across multiple links on the same line', () => {
    const doc =
      '![foo.png](/assets/foo.png) and ![old-name.png](/assets/old-name.png)'
    const result = replaceFilenameInText(doc, 'old-name.png', 'new-name.png')
    expect(result).toBe(
      '![foo.png](/assets/foo.png) and ![new-name.png](/assets/new-name.png)',
    )
  })
})

describe('autoSurroundSelection', () => {
  it.each([
    ['(', '(', ')'],
    ['[', '[', ']'],
    ['{', '{', '}'],
    ["'", "'", "'"],
    ['"', '"', '"'],
    ['`', '`', '`'],
    ['~', '~', '~'],
    ['<', '<', '>'],
  ])('wraps the selection when the key is %s', (key, before, after) => {
    const view = makeView('hello world', 0, 5)
    const handled = autoSurroundSelection(view, key)
    expect(handled).toBe(true)
    expect(view.state.doc.toString()).toBe(`${before}hello${after} world`)
  })

  it('keeps the original text selected so another surround character nests', () => {
    const view = makeView('hello world', 0, 5)
    autoSurroundSelection(view, '(')
    expect(view.state.doc.toString()).toBe('(hello) world')
    expect(view.state.selection.main.from).toBe(1)
    expect(view.state.selection.main.to).toBe(6)
    expect(
      view.state.doc.sliceString(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe('hello')

    autoSurroundSelection(view, '`')
    expect(view.state.doc.toString()).toBe('(`hello`) world')
  })

  it('does nothing for > (only the opening bracket triggers surround)', () => {
    const view = makeView('hello world', 0, 5)
    expect(autoSurroundSelection(view, '>')).toBe(false)
    expect(view.state.doc.toString()).toBe('hello world')
  })

  it('does nothing when there is no selection', () => {
    const view = makeView('hello world', 3, 3)
    expect(autoSurroundSelection(view, '(')).toBe(false)
    expect(view.state.doc.toString()).toBe('hello world')
  })

  it('does nothing for keys with no configured pair', () => {
    const view = makeView('hello world', 0, 5)
    expect(autoSurroundSelection(view, 'a')).toBe(false)
    expect(view.state.doc.toString()).toBe('hello world')
  })
})

describe('blockquoteSelectedLines', () => {
  it('prepends "> " to every line touched by the selection', () => {
    const view = makeView('one\ntwo\nthree', 0, 7)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('> one\n> two\nthree')
  })

  it('quotes just the cursor line when the selection is empty', () => {
    const view = makeView('one\ntwo', 5, 5)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('one\n> two')
  })

  it('nests another quote level when run again on the reselected block', () => {
    const view = makeView('one\ntwo', 0, 7)
    blockquoteSelectedLines(view)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('> > one\n> > two')
  })

  it('does not quote a trailing empty line when the selection ends exactly at its start', () => {
    // e.g. doc with a trailing newline, selected to the very end (doc.length
    // lands at the start of the phantom empty last line)
    const view = makeView('ooo\noao\naoa\n', 0, 12)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('> ooo\n> oao\n> aoa\n')
  })

  it('does not quote a preceding line when the selection starts exactly at its end (bottom-to-top drag)', () => {
    // doc: "before\naaa\naaa\naaa" — selection from the end of "before"
    // (position 6) through the end of the doc, as a bottom-to-top drag can
    // produce
    const view = makeView('before\naaa\naaa\naaa', 6, 18)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('before\n> aaa\n> aaa\n> aaa')
  })

  it('reselects the entire quoted lines, not just the originally-selected text', () => {
    // selecting only "aaa" and "bbb" (not their line starts) should still
    // highlight the whole resulting "> aaa" / "> bbb" lines afterwards
    const view = makeView('aaa\nbbb', 1, 5)
    blockquoteSelectedLines(view)
    expect(view.state.doc.toString()).toBe('> aaa\n> bbb')
    expect(view.state.selection.main.from).toBe(0)
    expect(view.state.selection.main.to).toBe(11)
  })
})

describe('autoBlockquoteSelection', () => {
  it('blockquotes touched lines when the selection starts at a line start and key is >', () => {
    const view = makeView('one\ntwo\nthree', 0, 7)
    expect(autoBlockquoteSelection(view, '>')).toBe(true)
    expect(view.state.doc.toString()).toBe('> one\n> two\nthree')
  })

  it('does nothing when the selection does not start at a line start', () => {
    const view = makeView('one\ntwo', 1, 3)
    expect(autoBlockquoteSelection(view, '>')).toBe(false)
    expect(view.state.doc.toString()).toBe('one\ntwo')
  })

  it('does nothing when the selection is empty', () => {
    const view = makeView('one\ntwo', 0, 0)
    expect(autoBlockquoteSelection(view, '>')).toBe(false)
    expect(view.state.doc.toString()).toBe('one\ntwo')
  })

  it('does nothing for keys other than >', () => {
    const view = makeView('one\ntwo', 0, 3)
    expect(autoBlockquoteSelection(view, '<')).toBe(false)
    expect(view.state.doc.toString()).toBe('one\ntwo')
  })
})
