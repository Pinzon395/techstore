import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/lib/i18n.ts', import.meta.url), 'utf8');
const spanishBlock = source.match(/es:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*en:\s*\{/);
const englishBlock = source.match(/en:\s*\{([\s\S]*?)\n\s*\},\s*\n\}\s+as const;/);

if (!spanishBlock || !englishBlock) {
  throw new Error('Unable to locate ES/EN dictionaries in src/lib/i18n.ts');
}

function keys(block) {
  return new Set([...block.matchAll(/(?:^|[\n,{])\s*([A-Za-z][A-Za-z0-9_]*):/g)].map((match) => match[1]));
}

const es = keys(spanishBlock[1]);
const en = keys(englishBlock[1]);

const required = [
  'home', 'services', 'contact', 'store',
  'yourCart', 'subtotal', 'quantity', 'deleteItem', 'proceedToCheckout',
  'checkoutTitle', 'stepCart', 'stepDetails', 'stepPayment', 'stepConfirmation', 'placeOrder',
  'orderTrackingTitle', 'orderSummaryCard', 'orderTimeline',
  'accountTitle', 'loginToAccount', 'logout', 'myTickets',
  'ticketPageTitle', 'selectDevice', 'issueDescription', 'submitTicket',
  'returnHome', 'browseServices',
];

const missing = required.filter((key) => !es.has(key) || !en.has(key));
const asymmetric = [...new Set([...es, ...en])]
  .filter((key) => !es.has(key) || !en.has(key));

if (missing.length || asymmetric.length) {
  if (missing.length) console.error(`Critical i18n keys missing: ${missing.join(', ')}`);
  if (asymmetric.length) console.error(`Locale dictionaries differ: ${asymmetric.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`I18N coverage OK: ${required.length} critical keys and ${en.size} shared UI keys.`);
}
