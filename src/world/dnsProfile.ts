import { encodeText } from '../core/textEncoding';
import { stateInteger } from '../core/stateValidation';
import type { NetworkIdentity } from '../core/networkDevice';

/** Initial configuration only; native dnsServer still validates and answers queries. */
export const COMPACT_DNS = Object.freeze({capacity: 108, nameCells: 18, stride: 24, base: 2552, end: 5143});

/** Keep the general 54-cell/27-record firmware available for other scenarios.
 * The expanded web uses short hostnames to fit 108 records below the echo buffer. */
export function compactDnsServer(source: string): string {
  const replace = (before: string, after: string) => {
    if (!source.includes(before)) throw new Error(`DNS source contract changed: ${before}`);
    source = source.replace(before, after);
  };
  replace('ifg E 27 J dns_bad_name', 'ifg E 108 J dns_bad_name');
  replace('      R B I\n      M A I', '      R B I\n      ifg B 18 J dns_bad_name end\n      M A I');
  replace('      M G 54', '      M G 18');
  replace('      A F 55', '      A F 19');
  replace('      M E I/58', '      M E I/22');
  replace('      N I/59 Z J dns_bad_name\n      N I/60 Z J dns_bad_name\n      N I/61 Z J dns_bad_name\n      N I/62 Z J dns_bad_name', '      N I/23 Z J dns_bad_name');
  for (const register of ['K', 'E', 'I']) replace(`      A ${register} 63`, `      A ${register} 24`);
  replace('        A B 55', '        A B 19');
  return '; Compact profile: 108 x 24 cells at 2552..5143; 18-cell names.\n' + source;
}

export function compactDnsRecord(name: string, address: NetworkIdentity, ttl = 729): number[] {
  if (name.length < 1 || name.length > COMPACT_DNS.nameCells ||
      !name.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) throw new Error('Invalid compact DNS name');
  for (const cell of address) stateInteger(cell, -9841, 9841);
  if (address.length !== 3 || address.every(cell => cell === 0)) throw new Error('Invalid DNS address');
  stateInteger(ttl, 1, 9841);
  const record = new Array<number>(COMPACT_DNS.stride).fill(0);
  record[0] = name.length; record.splice(1, name.length, ...encodeText(name));
  record.splice(19, 4, ...address, ttl);
  return record;
}
