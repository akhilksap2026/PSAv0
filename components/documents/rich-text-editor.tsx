'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Heading2,
  Heading3,
  Quote,
  Link2,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreVertical,
} from 'lucide-react'

interface RichTextEditorProps {
  initialContent?: string
  onContentChange?: (content: string) => void
  readOnly?: boolean
}

export function RichTextEditor({ initialContent = '', onContentChange, readOnly = false }: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [isPreview, setIsPreview] = useState(false)

  const handleChange = (newContent: string) => {
    setContent(newContent)
    onContentChange?.(newContent)
  }

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end)

    handleChange(newContent)
    setTimeout(() => {
      textarea.selectionStart = start + before.length
      textarea.selectionEnd = start + before.length + selectedText.length
      textarea.focus()
    }, 0)
  }

  if (readOnly) {
    return (
      <div className="w-full border rounded-lg p-4 bg-muted/50 prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    )
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('**', '**')}
            title="Bold"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('*', '*')}
            title="Italic"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('<u>', '</u>')}
            title="Underline"
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px bg-border" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('## ')}
            title="Heading 2"
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('### ')}
            title="Heading 3"
            className="h-8 w-8 p-0"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px bg-border" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('- ')}
            title="Bullet List"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('1. ')}
            title="Ordered List"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px bg-border" />

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('`', '`')}
            title="Code"
            className="h-8 w-8 p-0"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('> ')}
            title="Quote"
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto">
          <Button
            variant={isPreview ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="text-xs"
          >
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      {isPreview ? (
        <div className="p-4 bg-background prose prose-sm max-w-none min-h-96">
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />
        </div>
      ) : (
        <textarea
          id="editor-textarea"
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Start typing or paste your content here..."
          className="w-full p-4 font-mono text-sm border-0 focus:outline-none resize-none min-h-96 bg-background"
        />
      )}
    </div>
  )
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>')

  // Lists
  html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')

  // Quote
  html = html.replace(/^&gt; (.*?)$/gm, '<blockquote>$1</blockquote>')

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'

  return html
}
