"use client";

import { useMemo } from "react";

function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => {
    let text = content;

    // Escape HTML
    text = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Blockquote
    text = text.replace(
      /^&gt;\s*(.*)$/gm,
      '<blockquote class="my-6 pl-4 border-l-2 border-[#2A6FBB] text-[#9CA3AF] italic">$1</blockquote>'
    );

    // H1
    text = text.replace(
      /^#\s+(.*)$/gm,
      '<h1 class="text-3xl sm:text-4xl font-bold text-[#F9F7F2] mt-12 mb-6 leading-tight">$1</h1>'
    );

    // H2
    text = text.replace(
      /^##\s+(.*)$/gm,
      '<h2 class="text-xl sm:text-2xl font-semibold text-[#F9F7F2] mt-10 mb-4 leading-snug">$1</h2>'
    );

    // H3
    text = text.replace(
      /^###\s+(.*)$/gm,
      '<h3 class="text-lg font-semibold text-[#F9F7F2] mt-8 mb-3">$1</h3>'
    );

    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F9F7F2]">$1</strong>');

    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em class="text-[#9CA3AF]">$1</em>');

    // Unordered list
    const listItems: string[] = [];
    text = text.replace(/^[-*]\s+(.*)$/gm, (_match, item) => {
      listItems.push(item);
      return "\u0000LISTITEM\u0000";
    });

    // Ordered list
    const olItems: string[] = [];
    text = text.replace(/^\d+\.\s+(.*)$/gm, (_match, item) => {
      olItems.push(item);
      return "\u0000OLITEM\u0000";
    });

    // Links
    text = text.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="text-[#2A6FBB] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Paragraphs (line breaks become <p>)
    const blocks = text.split(/\n\n+/).map((block) => {
      if (block.startsWith("<")) return block;
      if (block.includes("\u0000LISTITEM\u0000")) {
        const items = block.split("\u0000LISTITEM\u0000").filter(Boolean);
        if (items.length === 0) return "";
        return `<ul class="my-5 pl-5 list-disc space-y-2 text-[#9CA3AF]">${items
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ul>`;
      }
      if (block.includes("\u0000OLITEM\u0000")) {
        const items = block.split("\u0000OLITEM\u0000").filter(Boolean);
        if (items.length === 0) return "";
        return `<ol class="my-5 pl-5 list-decimal space-y-2 text-[#9CA3AF]">${items
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ol>`;
      }
      return `<p class="my-5 text-[#9CA3AF] leading-relaxed">${block.replace(/\n/g, "<br/>")}</p>`;
    });

    return blocks.join("\n");
  }, [content]);

  return (
    <article
      className="prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
