/* KOBC KCCI parser: reads the dated index table, and refuses a page whose layout it does not recognise. */
import { done, ok } from './assert';

const { parseKcci } = await import('../scripts/kcci.mjs');

const page = `<html><body><table>
<thead><tr><th>Group</th><th>Code</th><th>Route</th><th>Weight</th><th>Current Index<br><span>2026-11-23</span></th><th>Previous Index<br><span>2026-11-16</span></th><th>Weekly Change</th></tr></thead>
<tbody>
<tr><td>Index</td><td>KCCI</td><td>Comprehensive Index</td><td>100%</td><td>4,429</td><td>4,608</td><td>-179(-3.88%)</td></tr>
<tr><td>Intra Asia</td><td>KCI</td><td>China</td><td>15%</td><td>52</td><td>52</td><td>0(0.00%)</td></tr>
<tr><td></td><td>KJI</td><td>Japan</td><td>10%</td><td>217</td><td>217</td><td>0(0.00%)</td></tr>
<tr><td></td><td>KSEI</td><td>South East Asia</td><td>10%</td><td>1,679</td><td>1,686</td><td>-7(-0.42%)</td></tr>
</tbody></table></body></html>`;

const r = parseKcci(page);
ok('dates come from the header', r?.date === '2026-11-23' && r?.prevDate === '2026-11-16');
ok('South East Asia route parsed with thousands separators', r?.routes.KSEI?.value === 1679 && r?.routes.KSEI?.prev === 1686 && r?.routes.KSEI?.route === 'South East Asia');
ok('composite index parsed', r?.routes.KCCI?.value === 4429);
ok('unit is USD per FEU', r?.unit === 'USD/FEU');
ok('a page without dates is refused', parseKcci(page.replace('2026-11-23', 'n/a')) === null);
ok('a page without the Southeast Asia row is refused', parseKcci(page.replace(/<tr><td><\/td><td>KSEI[\s\S]*?<\/tr>/, '')) === null);
ok('an empty page is refused', parseKcci('') === null);

done('kcci');
