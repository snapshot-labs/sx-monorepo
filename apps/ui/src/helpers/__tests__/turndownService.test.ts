import { describe, expect, it } from 'vitest';
import turndownService from '../turndownService';

describe('turndownService table conversion', () => {
  const converter = turndownService();

  it('should convert a basic table with headers and data', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>City</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>John</td>
            <td>30</td>
            <td>New York</td>
          </tr>
          <tr>
            <td>Jane</td>
            <td>25</td>
            <td>Paris</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| Name | Age | City |
| --- | --- | --- |
| John | 30 | New York |
| Jane | 25 | Paris |`;

    expect(result).toBe(expected);
  });

  it('should handle table with empty cells', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Item 1</td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td>100</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| Name | Value |
| --- | --- |
| Item 1 |  |
|  | 100 |`;

    expect(result).toBe(expected);
  });

  it('should handle table with complex cell content', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Bold text</strong> and <em>italic</em></td>
            <td>Active</td>
          </tr>
          <tr>
            <td>Plain text</td>
            <td><code>pending</code></td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();

    // Should preserve formatting within table cells
    const expected = `| Description | Status |
| --- | --- |
| **Bold text** and _italic_ | Active |
| Plain text | \`pending\` |`;

    expect(result).toBe(expected);
  });

  it('should handle single row table', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Header</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Single cell</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| Header |
| --- |
| Single cell |`;

    expect(result).toBe(expected);
  });

  it('should handle table without tbody wrapper', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Col1</th>
            <th>Col2</th>
          </tr>
        </thead>
        <tr>
          <td>Data1</td>
          <td>Data2</td>
        </tr>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| Col1 | Col2 |
| --- | --- |
| Data1 | Data2 |`;

    expect(result).toBe(expected);
  });

  it('should preserve table structure with multiple data rows', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Alice</td>
            <td>95</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Bob</td>
            <td>87</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Charlie</td>
            <td>92</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| ID | Name | Score |
| --- | --- | --- |
| 1 | Alice | 95 |
| 2 | Bob | 87 |
| 3 | Charlie | 92 |`;

    expect(result).toBe(expected);
  });

  it('should handle column alignment', () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th style="text-align:left">Left</th>
            <th style="text-align:center">Center</th>
            <th style="text-align:right">Right</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>A</td>
            <td>B</td>
            <td>C</td>
            <td>D</td>
          </tr>
        </tbody>
      </table>
    `;

    const result = converter(html).trim();
    const expected = `| Left | Center | Right | Default |
| :--- | :---: | ---: | --- |
| A | B | C | D |`;

    expect(result).toBe(expected);
  });
});
