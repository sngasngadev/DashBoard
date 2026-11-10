import { describe, expect, it } from 'vitest';
import { isSpreadsheetHtml, tabularTextToHtml } from './clipboardTable';

describe('spreadsheet clipboard content', () => {
  it('recognizes Excel HTML tables even with attributes', () => {
    expect(isSpreadsheetHtml('<html><table class="xl"> <tr><td>A</td></tr></table></html>')).toBe(true);
    expect(isSpreadsheetHtml('<img src="data:image/png;base64,AAA">')).toBe(false);
  });
  it('converts tab-separated cells into editable HTML table cells', () => {
    expect(tabularTextToHtml('A\tB\r\n1\t2\r\n')).toContain('<tr><td><p>A</p></td><td><p>B</p></td></tr>');
    expect(tabularTextToHtml('A\tB\r\n1\t2\r\n')).toContain('<tr><td><p>1</p></td><td><p>2</p></td></tr>');
    expect(tabularTextToHtml('single line')).toBeNull();
  });
  it('escapes HTML markup in tabular cell values', () => {
    expect(tabularTextToHtml('<script>\tA&B')).toContain('&lt;script&gt;');
    expect(tabularTextToHtml('<script>\tA&B')).toContain('A&amp;B');
  });
});
