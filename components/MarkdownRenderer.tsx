import React from 'react';

// A simple parser to handle bold, italics, and unordered lists.
const parseMarkdown = (text: string) => {
  if (!text) return '';

  const html = text
    // Bold: **text** or __text__
    .replace(
      /\*\*(.*?)\*\*|__(.*?)__/g,
      '<strong class="text-teal-800">$1$2</strong>',
    )
    // Italics: *text* or _text_
    .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

  // Handle lists: - item or * item
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const listItem = `<li>${trimmedLine.substring(2)}</li>`;
      if (!inList) {
        inList = true;
        return `<ul>${listItem}`;
      }
      return listItem;
    } else {
      if (inList) {
        inList = false;
        // Close the list and add the current line
        return `</ul>${line}`;
      }
      return line;
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  // Rejoin lines, replacing newlines with <br> only outside of list context
  return processedLines
    .join('\n')
    .replace(/<\/ul>\n/g, '</ul>')
    .replace(/\n/g, '<br />');
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({
  content,
}) => {
  const renderedHtml = parseMarkdown(content);

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
