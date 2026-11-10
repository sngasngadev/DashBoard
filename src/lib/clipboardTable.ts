/** Preserve spreadsheet cell ranges as editable tables instead of clipboard image previews. */
export function isSpreadsheetHtml(html:string):boolean {
  return /<table(?:\s|>)/i.test(html);
}

export function tabularTextToHtml(text:string):string|null {
  if (!text.includes('\t')) return null;
  const rows=text.replace(/\r\n?/g,'\n').replace(/\n$/,'').split('\n').map(row=>row.split('\t'));
  if (rows.length===0 || !rows.some(row=>row.length>1)) return null;
  const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return '<table><tbody>'+rows.map(cells=>'<tr>'+cells.map(cell=>'<td><p>'+(escape(cell)||'<br>')+'</p></td>').join('')+'</tr>').join('')+'</tbody></table>';
}
