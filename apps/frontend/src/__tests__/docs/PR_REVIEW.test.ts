// Tests implemented with Jest (ts-jest) per apps/frontend/jest.config.cjs.
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../../../../../PR_REVIEW.md');
const KEYWORDS: string[] = [
  'pull request',
  'pr',
  'review',
  'code review',
  'merge',
  'branch',
  'commit',
  'diff',
];
const HTML_PATTERN = new RegExp('<(?:div|span|p|a|img|br|hr|h[1-6]|ul|ol|li)[^>]*>', 'gi');

describe('PR_REVIEW.md documentation quality', () => {
  let content = '';
  let stats: fs.Stats;

  beforeAll(() => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected PR documentation to exist at ${filePath}`);
    }
    stats = fs.statSync(filePath);
    content = fs.readFileSync(filePath, 'utf8');
  });

  it('should exist at the repository root', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should not be empty', () => {
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('should contain at least one markdown header', () => {
    const headerMatches = content.match(new RegExp('^#+\\s+.+$', 'gm')) ?? [];
    expect(headerMatches.length).toBeGreaterThan(0);
  });

  it('should not skip header levels when increasing depth', () => {
    const headers = [...content.matchAll(new RegExp('^(#+)\\s+(.+)$', 'gm'))];
    if (headers.length <= 1) {
      return;
    }
    for (let index = 1; index < headers.length; index += 1) {
      const prevLevel = headers[index - 1][1].length;
      const currentLevel = headers[index][1].length;
      expect(currentLevel <= prevLevel + 1).toBe(true);
    }
  });

  it('should avoid trailing whitespace at line ends', () => {
    const problemLines = content
      .split('\n')
      .reduce<number[]>((accumulator, line, idx) => {
        if (new RegExp('\\s$').test(line) && line.length > 0) {
          accumulator.push(idx + 1);
        }
        return accumulator;
      }, []);
    expect(problemLines).toHaveLength(0);
  });

  it('should not mix CRLF and LF line endings', () => {
    const totalLf = (content.match(new RegExp('\\n', 'g')) ?? []).length;
    const totalCrlf = (content.match(new RegExp('\\r\\n', 'g')) ?? []).length;
    const hasMixed = totalCrlf > 0 && totalCrlf !== totalLf;
    const hasStrayCarriageReturn = content
      .replace(new RegExp('\\r\\n', 'g'), '')
      .includes('\r');
    expect(hasMixed || hasStrayCarriageReturn).toBe(false);
  });

  it('should have balanced fenced code blocks', () => {
    const fenceCount = content.match(new RegExp('```', 'g'))?.length ?? 0;
    expect(fenceCount % 2).toBe(0);
  });

  it('should emphasise pull request review concepts', () => {
    const lower = content.toLowerCase();
    const matches = KEYWORDS.filter((keyword) => lower.includes(keyword));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should format markdown links correctly when present', () => {
    const linkMatches = [
      ...content.matchAll(new RegExp('\\[([^\\]]+)\\]\\(([^)]+)\\)', 'g')),
    ];
    if (linkMatches.length === 0) {
      return;
    }
    for (const [, text, url] of linkMatches) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(url.trim().length).toBeGreaterThan(0);
      if (url.startsWith('http')) {
        expect(new RegExp('^https?:\\/\\/.+').test(url)).toBe(true);
      }
    }
  });

  it('should not duplicate header titles', () => {
    const headers = [...content.matchAll(new RegExp('^(#+)\\s+(.+)$', 'gm'))];
    if (headers.length <= 1) {
      return;
    }
    const titles = headers.map((match) =>
      match[2].trim().toLowerCase()
    );
    const duplicates = titles.filter(
      (title, index) => titles.indexOf(title) !== index
    );
    expect(duplicates).toHaveLength(0);
  });

  it('should avoid inline HTML tags', () => {
    const matches = content.match(HTML_PATTERN) ?? [];
    expect(matches).toHaveLength(0);
  });

  it('should maintain reasonable file size for documentation', () => {
    expect(stats.size).toBeGreaterThanOrEqual(100);
    expect(stats.size).toBeLessThanOrEqual(100 * 1024);
  });

  it('should ensure list markers are followed by a space', () => {
    const issueLines = content
      .split('\n')
      .reduce<number[]>((accumulator, line, idx) => {
        if (
          new RegExp('^\\s*[-*+][^\\s]').test(line) ||
          new RegExp('^\\s*\\d+\\.[^\\s]').test(line)
        ) {
          accumulator.push(idx + 1);
        }
        return accumulator;
      }, []);
    expect(issueLines).toHaveLength(0);
  });
});