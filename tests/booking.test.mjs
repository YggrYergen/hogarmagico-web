import assert from 'node:assert/strict';
import test from 'node:test';
import { getBookingData } from '../lib/beds24.mjs';

const start = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const end = new Date(Date.now() + 33 * 86400000).toISOString().slice(0, 10);
const lastnight = new Date(Date.now() + 32 * 86400000).toISOString().slice(0, 10);
const valid = { checkin: start, lastnight, numadult: 2, numchild: 0, roomid: 522714, offerid: 1, roomprice: 300000, roompricedisplay: '<span>CLP </span><span>300.000</span>', warn: '' };
const query = new URLSearchParams({ kind: 'quote', house: 'chascona', checkin: start, checkout: end, guests: '2' });

test('public source contract and reservation safeguards', async t => {
    const original = globalThis.fetch;
    try {
        await t.test('uses the correct property and passes the selected dates to checkout', async () => {
            globalThis.fetch = async () => Response.json([valid]);
            const result = await getBookingData(query);
            assert.equal(result.body.available, true);
            assert.equal(result.body.total, 300000);
            const checkout = new URL(result.body.checkoutURL);
            assert.equal(checkout.searchParams.get('propid'), '248224');
            assert.equal(checkout.searchParams.get('checkin_hide'), start);
            assert.equal(checkout.searchParams.get('br1-522714'), 'Book');
        });
        await t.test('does not sell a positive quote carrying an availability warning', async () => {
            globalThis.fetch = async () => Response.json([{ ...valid, warn: 'No disponible' }]);
            const result = await getBookingData(query);
            assert.equal(result.body.available, false);
            assert.equal(result.body.checkoutURL, null);
            assert.equal(result.body.total, null);
        });
        await t.test('does not sell a request-only rate or zero available rooms', async () => {
            for (const flags of [{ ratetype: 1 }, { enquire: '1' }, { roomsavail: 0 }]) {
                globalThis.fetch = async () => Response.json([{ ...valid, ...flags }]);
                const result = await getBookingData(query);
                assert.equal(result.body.available, false);
            }
        });
        await t.test('fails closed when the source returns another house or another stay', async () => {
            for (const changes of [{ roomid: 535728 }, { checkin: end }, { roompricedisplay: '300.000' }]) {
                globalThis.fetch = async () => Response.json([{ ...valid, ...changes }]);
                const result = await getBookingData(query);
                assert.equal(result.status, 502);
                assert.equal(result.body.checkoutURL, undefined);
            }
        });
        await t.test('rejects unknown properties and excessive occupancy before contacting Beds24', async () => {
            globalThis.fetch = async () => { throw new Error('Unexpected upstream request'); };
            assert.equal((await getBookingData(new URLSearchParams('house=unknown'))).status, 400);
            assert.equal((await getBookingData(new URLSearchParams('house=__proto__'))).status, 400);
            assert.equal((await getBookingData(new URLSearchParams('house=lamar&guests=5'))).status, 400);
        });
    } finally { globalThis.fetch = original; }
});
