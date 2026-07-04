"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Palette,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BLOCK_TYPES,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
} from "@/lib/tiptap/toolbar-options";
import { cn } from "@/lib/utils";

type EditorToolbarProps = {
  editor: Editor;
};

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-7 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value || option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function getBlockTypeValue(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

function setBlockType(editor: Editor, value: string) {
  switch (value) {
    case "h1":
      editor.chain().focus().toggleHeading({ level: 1 }).run();
      break;
    case "h2":
      editor.chain().focus().toggleHeading({ level: 2 }).run();
      break;
    case "h3":
      editor.chain().focus().toggleHeading({ level: 3 }).run();
      break;
    default:
      editor.chain().focus().setParagraph().run();
  }
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);

    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);

    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const currentFontFamily =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "";
  const currentFontSize =
    (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "16px";
  const currentColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) ?? "";

  return (
    <div
      role="toolbar"
      aria-label="Formatting tools"
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-2 py-2"
    >
      <ToolbarSelect
        ariaLabel="Block type"
        value={getBlockTypeValue(editor)}
        onChange={(value) => setBlockType(editor, value)}
        options={BLOCK_TYPES}
        className="min-w-[7.5rem]"
      />

      <ToolbarSelect
        ariaLabel="Font family"
        value={currentFontFamily}
        onChange={(value) => {
          if (!value) {
            editor.chain().focus().unsetFontFamily().run();
            return;
          }

          editor.chain().focus().setFontFamily(value).run();
        }}
        options={FONT_FAMILIES}
        className="min-w-[5.5rem]"
      />

      <ToolbarSelect
        ariaLabel="Font size"
        value={currentFontSize}
        onChange={(value) => {
          if (!value) {
            editor.chain().focus().unsetFontSize().run();
            return;
          }

          editor.chain().focus().setFontSize(value).run();
        }}
        options={FONT_SIZES}
        className="w-14"
      />

      <ToolbarDivider />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Subscript"
        active={editor.isActive("subscript")}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        <Subscript className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Superscript"
        active={editor.isActive("superscript")}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        <Superscript className="size-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      <Popover>
        <PopoverTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label="Text color"
          title="Text color"
        >
          <Palette className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="start">
          <Label className="text-xs text-muted-foreground">Text color</Label>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set text color ${color}`}
                className={cn(
                  "size-6 rounded-md border border-border",
                  currentColor === color && "ring-2 ring-ring ring-offset-2",
                )}
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Reset color
          </Button>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label="Highlight color"
          title="Highlight"
        >
          <Highlighter className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="start">
          <Label className="text-xs text-muted-foreground">Highlight</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set highlight ${color}`}
                className={cn(
                  "h-6 rounded-md border border-border",
                  currentHighlight === color &&
                    "ring-2 ring-ring ring-offset-2",
                )}
                style={{ backgroundColor: color }}
                onClick={() =>
                  editor.chain().focus().toggleHighlight({ color }).run()
                }
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => editor.chain().focus().unsetHighlight().run()}
          >
            Remove highlight
          </Button>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      <ToolbarButton
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Task list"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodo className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-7 gap-1 px-2",
          )}
        >
          <Table2 className="size-3.5" />
          Table
          <ChevronDown className="size-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Table</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              Insert 3×3 table
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={!editor.can().addColumnAfter()}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Add column after
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editor.can().addColumnBefore()}
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              Add column before
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editor.can().addRowAfter()}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Add row after
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editor.can().addRowBefore()}
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              Add row before
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={!editor.can().deleteColumn()}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Delete column
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editor.can().deleteRow()}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Delete row
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editor.can().deleteTable()}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
