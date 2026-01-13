import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  // Helper for buttons
  const Btn = ({ onClick, isActive, icon: Icon }: any) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-primary/10 ${isActive ? 'text-primary bg-primary/10' : 'text-text-secondary'}`}
      type="button" // Prevent form submission
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-surface/50">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} />
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} />
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} />
      <div className="w-px h-4 bg-border mx-2" />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} />
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} />
      <div className="w-px h-4 bg-border mx-2" />
      <Btn onClick={() => editor.chain().focus().undo().run()} icon={Undo} />
      <Btn onClick={() => editor.chain().focus().redo().run()} icon={Redo} />
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder, editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: content,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { 
        attributes: { 
            class: 'prose dark:prose-invert max-w-none p-4 min-h-[150px] focus:outline-none' 
        } 
    }
  });

  // Effect to update content if it changes externally
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Basic check to avoid cursor jumping, better handling needed for robust collab
      if (editor.getText() === '' && content === '') return;
      // editor.commands.setContent(content); // Can cause issues if typing, usually managed by internal state
    }
  }, [content, editor]);

  return (
    <div className="border border-border rounded-lg bg-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
