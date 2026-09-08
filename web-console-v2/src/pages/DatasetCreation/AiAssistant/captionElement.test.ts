import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * The app's theme maps `caption: 'caption'` in `MuiTypography.variantMapping`
 * (see `theme.ts`), so `<Typography variant="caption">` renders a literal
 * `<caption>` element — a table caption. Outside a table that is invalid
 * HTML, and React reports it as a hydration error:
 *
 *   In HTML, <caption> cannot be a child of <div>.
 *
 * Every caption in this feature therefore has to name its own element. This
 * guard exists because the mistake is invisible in tests that only query by
 * text, and it was found by reading the browser console rather than by any
 * assertion.
 */
const ROOT = join(__dirname);

const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });

/** The `<Typography ...>` opening tags in a file, whitespace collapsed. */
const typographyTags = (source: string): string[] =>
  source
    .match(/<Typography\b[^>]*>/g)
    ?.map((tag) => tag.replace(/\s+/g, ' ')) ?? [];

describe('captions name their own element', () => {
  const offenders = tsxFiles(ROOT).flatMap((path) =>
    typographyTags(readFileSync(path, 'utf8'))
      .filter(
        (tag) =>
          tag.includes('variant="caption"') && !tag.includes('component='),
      )
      .map((tag) => ({ file: path.replace(ROOT, ''), tag })),
  );

  it('has no caption Typography without an explicit component', () => {
    expect(offenders).toEqual([]);
  });

  it('found some Typography tags to check, so the scan is working', () => {
    const scanned = tsxFiles(ROOT).flatMap((path) =>
      typographyTags(readFileSync(path, 'utf8')),
    );

    expect(scanned.length).toBeGreaterThan(10);
  });
});
