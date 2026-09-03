const FENCED_BLOCK_PATTERN = /(^|\n)([ \t]*)(`{3,}|~{3,})[ \t]*(?:gfm|markdown|md|text|plaintext|table)?[ \t]*\r?\n([\s\S]*?)\r?\n\2\3[ \t]*(?=\r?\n|$)/gi;

function isTableDelimiter(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = trimmed.split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isGfmTableBlock(value) {
  const lines = value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !lines[0].includes("|") || !isTableDelimiter(lines[1])) {
    return false;
  }

  return lines.slice(2).every((line) => line.includes("|"));
}

function unwrapFencedTables(text) {
  return text.replace(
    FENCED_BLOCK_PATTERN,
    (match, leadingNewline, indentation, fence, content) => {
      const dedented = content
        .split(/\r?\n/)
        .map((line) => (indentation && line.startsWith(indentation)
          ? line.slice(indentation.length)
          : line))
        .join("\n");

      return isGfmTableBlock(dedented) ? `${leadingNewline}${dedented}` : match;
    },
  );
}

function unwrapIndentedTables(text) {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerMatch = lines[index].match(/^( {4,}|\t+)(.*\|.*)$/);
    if (!headerMatch) continue;

    const indentation = headerMatch[1];
    const delimiter = lines[index + 1].startsWith(indentation)
      ? lines[index + 1].slice(indentation.length)
      : "";
    if (!isTableDelimiter(delimiter)) continue;

    for (let tableIndex = index; tableIndex < lines.length; tableIndex += 1) {
      if (!lines[tableIndex].startsWith(indentation)) break;
      const tableLine = lines[tableIndex].slice(indentation.length);
      if (!tableLine.includes("|")) break;
      lines[tableIndex] = tableLine;
      index = tableIndex;
    }
  }

  return lines.join("\n");
}

export function normalizeMarkdownForRendering(text) {
  if (typeof text !== "string" || !text) return text;
  return unwrapIndentedTables(unwrapFencedTables(text));
}
