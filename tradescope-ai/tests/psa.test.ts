/* PSA OpenSTAT connector: picks the year's table, sums a commodity line, and refuses thin volumes. */
import { done, ok } from './assert';

const { PSA_LINES, sumByPrefix, tableForYear, unitValue } = await import('../scripts/psa.mjs');

const listing = [
  { id: '0012L4DXVD5.px', type: 't', text: 'Monthly FOB Value of Philippine Exports by commodity and country of destination,2026', updated: '2026-11-27T10:31:06' },
  { id: '0022L4DXVD4.px', type: 't', text: 'Monthly FOB Value of Philippine Exports by commodity and country of destination, 2025', updated: '2026-07-15T10:54:08' },
  { id: 'x', type: 'l', text: 'Some folder 2025' },
];
ok('the table for a year is found (with or without a space before the year)', tableForYear(listing, 2025)?.id === '0022L4DXVD4.px' && tableForYear(listing, 2026)?.id === '0012L4DXVD5.px');
ok('a year with no table gives null', tableForYear(listing, 2019) === null && tableForYear('garbage', 2025) === null);

const csv = [
  '"Commodity Code","Country","2025 January","2025 February","2025 March"',
  '"08045022000","Korea, Republic Of",82200,103224,..',
  '"08045022001","Korea, Republic Of",-,1000,',
  '"08045021000","Korea, Republic Of",5000,5000,5000',
  '"20089940006","Korea, Republic Of",100,200,300',
].join('\n');
const dried = sumByPrefix(csv, ['08045022']);
ok('sums every month of every sub-line with the prefix, skipping ".." "-" and blanks', dried.total === 82200 + 103224 + 1000 && dried.rows === 2);
ok('other lines are not mixed in (fresh mango 0804.50.21)', sumByPrefix(csv, ['08045021']).total === 15000);
ok('a prefix with no rows sums to zero', sumByPrefix(csv, ['99999999']).total === 0);

ok('unit value in USD/kg and tonnes', JSON.stringify(unitValue(801104, 63264)) === JSON.stringify({ usdPerKg: 12.66, tonnes: 63.3 }));
ok('too little weight gives no unit value', unitValue(1000, 100) === null);
ok('no value gives no unit value', unitValue(0, 100000) === null);
ok('the three PH→KR products have lines', ['dried-mango', 'banana-chips', 'coconut-oil'].every((id) => PSA_LINES[id]?.prefixes.length));

done('psa');
