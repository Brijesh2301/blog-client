'use client'

import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * RICH EDITOR (TipTap)
 * ═════════════════════════════════════════════════════════════════════════════
 * Structure is constrained at the SOURCE, not just checked at publish:
 *
 *  - HEADINGS are limited to h2/h3/h4. The page title is the document's only
 *    H1, so the editor simply cannot produce a second one — the SEO check for
 *    it becomes a backstop for pasted HTML rather than the first line of
 *    defence.
 *  - IMAGES cannot be inserted without alt text. The prompt refuses an empty
 *    value, so an undescribed image never enters the document in the first
 *    place.
 *  - LINKS get `rel="noopener noreferrer"` here, and again when the article is
 *    rendered (lib/article.ts), because pasted markup bypasses this editor.
 *
 * `immediatelyRender: false` is required under SSR: TipTap would otherwise
 * render on the server and mismatch during hydration.
 */

export function RichEditor({
  value,
  onChange,
  placeholder = 'Open with the claim, then the evidence…',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // h2–h4 only. See the note above: the page title owns the H1.
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
        codeBlock: { HTMLAttributes: { class: 'language-plaintext' } },
      }),
      Image.configure({
        // Inline images would let an image sit mid-sentence, which breaks the
        // article's reading rhythm and the figure/caption styling.
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        // `prose` gives the editor the same typography as the published page,
        // so what the writer sees genuinely matches the article.
        class: 'prose max-w-none focus:outline-none min-h-[28rem]',
        'aria-label': 'Article body',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  })

  /**
   * Pull external changes in (loading a post, switching drafts) without
   * fighting the user's typing: only reset when the incoming value differs
   * from what the editor already holds.
   */
  React.useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // Intentionally keyed on `value` only — reacting to `editor` identity
    // would reset the document on every render.
  }, [value, editor])

  if (!editor) {
    // Same box as the mounted editor, so mounting shifts nothing.
    return (
      <div className="border-border bg-surface min-h-[32rem] rounded-lg border p-4">
        <p className="text-foreground-subtle text-sm">Loading editor…</p>
      </div>
    )
  }

  return (
    <div className="border-border bg-surface rounded-lg border">
      <Toolbar editor={editor} />
      <div className="px-4 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = React.useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')

    // Cancelled.
    if (url === null) return

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // Only http(s) and mailto. A javascript: URL in an article body is an XSS
    // vector, and the sanitiser would strip it on render anyway — refusing it
    // here means the writer finds out immediately instead of silently losing
    // the link.
    if (!/^(https?:|mailto:)/i.test(url)) {
      window.alert('Links must start with http://, https:// or mailto:')
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = React.useCallback(() => {
    const src = window.prompt('Image URL')
    if (!src?.trim()) return

    if (!/^https?:\/\//i.test(src)) {
      window.alert('Image URLs must start with http:// or https://')
      return
    }

    // Alt text is mandatory. An image without it fails the publish checklist,
    // so refusing it here saves the writer a round trip.
    const alt = window.prompt('Alt text — describe the image in a sentence')
    if (!alt?.trim()) {
      window.alert('Alt text is required. The image was not inserted.')
      return
    }

    editor.chain().focus().setImage({ src, alt: alt.trim() }).run()
  }, [editor])

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="border-hairline flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
    >
      <Group>
        <Btn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          label="Bold"
          Icon={Bold}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          label="Italic"
          Icon={Italic}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          label="Strikethrough"
          Icon={Strikethrough}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          label="Inline code"
          Icon={Code}
        />
      </Group>

      <Divider />

      <Group>
        {([2, 3, 4] as const).map((level) => {
          const Icon = level === 2 ? Heading2 : level === 3 ? Heading3 : Heading4
          return (
            <Btn
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              active={editor.isActive('heading', { level })}
              label={`Heading ${level}`}
              Icon={Icon}
            />
          )
        })}
      </Group>

      <Divider />

      <Group>
        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          label="Bullet list"
          Icon={List}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          label="Numbered list"
          Icon={ListOrdered}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          label="Blockquote"
          Icon={Quote}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          label="Code block"
          Icon={SquareCode}
        />
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Divider"
          Icon={Minus}
        />
      </Group>

      <Divider />

      <Group>
        <Btn
          onClick={setLink}
          active={editor.isActive('link')}
          label="Add link"
          Icon={Link2}
        />
        <Btn
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          label="Remove link"
          Icon={Link2Off}
        />
        <Btn onClick={addImage} label="Insert image" Icon={ImagePlus} />
      </Group>

      <div className="ml-auto flex items-center gap-0.5">
        <Btn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
          Icon={Undo2}
        />
        <Btn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
          Icon={Redo2}
        />
      </div>
    </div>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function Divider() {
  return <span aria-hidden="true" className="bg-hairline mx-1 h-5 w-px" />
}

function Btn({
  onClick,
  active,
  disabled,
  label,
  Icon,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'grid size-8 place-items-center rounded-md transition-colors',
        'disabled:pointer-events-none disabled:opacity-35',
        active
          ? 'bg-primary-soft text-primary'
          : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground'
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
