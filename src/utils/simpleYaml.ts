/**
 * A small YAML reader for run files (`orabbit-client run submit --file run.yaml`).
 *
 * It supports the subset those files use: nested mappings by indentation,
 * `key: value` scalars (strings, quoted strings, numbers, booleans, null),
 * `- item` lists, inline `[a, b]` lists and `{}`, `|` / `>` block scalars
 * (for multi-line SQL) and `#` comments. Anchors, tags, multi-document
 * streams and lists of mappings are rejected with a clear error instead of
 * being misread.
 */

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

interface Line {
  indent: number;
  text: string;
  number: number;
}

export class YamlError extends Error {
  constructor(message: string, line?: number) {
    super(line ? `YAML line ${line}: ${message}` : `YAML: ${message}`);
    this.name = 'YamlError';
  }
}

/** Removes a trailing `# comment` that is not inside quotes. */
function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

function parseScalar(raw: string, line: number): YamlValue {
  const v = raw.trim();
  if (v === '' || v === '~' || v === 'null' || v === 'Null' || v === 'NULL') return null;
  if (v.startsWith('"')) {
    if (!v.endsWith('"') || v.length < 2) throw new YamlError('unterminated double-quoted string', line);
    try {
      return JSON.parse(v) as string;
    } catch {
      throw new YamlError(`invalid double-quoted string ${v}`, line);
    }
  }
  if (v.startsWith("'")) {
    if (!v.endsWith("'") || v.length < 2) throw new YamlError('unterminated single-quoted string', line);
    return v.slice(1, -1).replace(/''/g, "'");
  }
  if (v.startsWith('[')) {
    if (!v.endsWith(']')) throw new YamlError('unterminated inline list', line);
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((item) => parseScalar(item, line)) : [];
  }
  if (v === '{}') return {};
  if (v.startsWith('{')) throw new YamlError('inline mappings other than {} are not supported; use indentation', line);
  if (v.startsWith('&') || v.startsWith('*') || v.startsWith('!')) {
    throw new YamlError('anchors, aliases and tags are not supported', line);
  }
  if (/^(true|True|TRUE)$/.test(v)) return true;
  if (/^(false|False|FALSE)$/.test(v)) return false;
  if (/^[-+]?\d+$/.test(v)) return Number(v);
  if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(v)) return Number(v);
  return v;
}

function toLines(text: string): Line[] {
  const lines: Line[] = [];
  text.replace(/\r\n?/g, '\n').split('\n').forEach((rawLine, i) => {
    if (/^\s*\t/.test(rawLine)) throw new YamlError('tabs are not allowed for indentation', i + 1);
    lines.push({ indent: rawLine.length - rawLine.trimStart().length, text: rawLine, number: i + 1 });
  });
  return lines;
}

class Parser {
  private pos = 0;

  constructor(private readonly lines: Line[]) {}

  /** Skips blank and comment-only lines. */
  private skipEmpty(): void {
    while (this.pos < this.lines.length && stripComment(this.lines[this.pos].text).trim() === '') this.pos++;
  }

  parseDocument(): YamlValue {
    this.skipEmpty();
    if (this.pos >= this.lines.length) return null;
    const first = this.lines[this.pos];
    if (first.text.trim() === '---') {
      this.pos++;
      return this.parseDocument();
    }
    const value = this.parseBlock(first.indent);
    this.skipEmpty();
    if (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.text.trim() === '---') throw new YamlError('multiple documents are not supported', line.number);
      throw new YamlError('unexpected indentation', line.number);
    }
    return value;
  }

  private parseBlock(indent: number): YamlValue {
    this.skipEmpty();
    const line = this.lines[this.pos];
    const content = stripComment(line.text).trim();
    return content === '-' || content.startsWith('- ') ? this.parseList(indent) : this.parseMap(indent);
  }

  private parseList(indent: number): YamlValue[] {
    const items: YamlValue[] = [];
    while (true) {
      this.skipEmpty();
      if (this.pos >= this.lines.length) break;
      const line = this.lines[this.pos];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new YamlError('unexpected indentation in list', line.number);
      const content = stripComment(line.text).trim();
      if (!(content === '-' || content.startsWith('- '))) break;
      const item = content.slice(1).trim();
      if (/^[^"'[{][^:]*:(\s|$)/.test(item)) {
        throw new YamlError('lists of mappings are not supported in run files', line.number);
      }
      this.pos++;
      items.push(parseScalar(item, line.number));
    }
    return items;
  }

  private parseMap(indent: number): { [key: string]: YamlValue } {
    const map: { [key: string]: YamlValue } = {};
    while (true) {
      this.skipEmpty();
      if (this.pos >= this.lines.length) break;
      const line = this.lines[this.pos];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new YamlError('unexpected indentation', line.number);
      const content = stripComment(line.text).trim();
      if (content.startsWith('- ') || content === '-') break;

      const match = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^:]+?)\s*:(?:\s+(.*))?$/.exec(content);
      if (!match) throw new YamlError(`expected "key: value", got "${content}"`, line.number);
      const key = String(parseScalar(match[1], line.number));
      if (key in map) throw new YamlError(`duplicate key "${key}"`, line.number);
      const rest = (match[2] ?? '').trim();
      this.pos++;

      if (rest === '|' || rest === '|-' || rest === '>' || rest === '>-') {
        map[key] = this.parseBlockScalar(indent, rest);
      } else if (rest === '') {
        this.skipEmpty();
        const next = this.lines[this.pos];
        const nextContent = next ? stripComment(next.text).trim() : '';
        const isList = nextContent === '-' || nextContent.startsWith('- ');
        // A list may sit at the same indentation as its key; a mapping must be deeper.
        if (next && (next.indent > indent || (isList && next.indent === indent))) {
          map[key] = this.parseBlock(next.indent);
        } else {
          map[key] = null;
        }
      } else {
        map[key] = parseScalar(rest, line.number);
      }
    }
    return map;
  }

  /** `|` keeps newlines, `>` folds them into spaces; `-` drops the final newline. */
  private parseBlockScalar(parentIndent: number, style: string): string {
    const raw: string[] = [];
    let blockIndent = -1;
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.text.trim() === '') {
        raw.push('');
        this.pos++;
        continue;
      }
      if (line.indent <= parentIndent) break;
      if (blockIndent < 0) blockIndent = line.indent;
      if (line.indent < blockIndent) break;
      raw.push(line.text.slice(blockIndent));
      this.pos++;
    }
    while (raw.length && raw[raw.length - 1] === '') raw.pop();
    const text = style.startsWith('>') ? raw.join(' ').replace(/ {2,}/g, ' ') : raw.join('\n');
    return style.endsWith('-') ? text : `${text}\n`;
  }
}

export function parseYaml(text: string): YamlValue {
  return new Parser(toLines(text)).parseDocument();
}
