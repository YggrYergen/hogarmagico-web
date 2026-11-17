// Public booking-page adapter. These endpoints are also used by Beds24's guest UI.
// Fail closed when the public response changes. No account credentials are used.
export const houses = {
    chascona: { name: 'La Chascona', property: '248224', room: '522714', slug: 'book-hogarmagicochascona', maximum: 6 },
    lamar: { name: 'La Mar', property: '255007', room: '535728', slug: 'book-casalamar', maximum: 4 },
    calma: { name: 'La Calma', property: '248225', room: '522715', slug: 'book-cochiguaz', maximum: 8 }
};

function dateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Selecciona fechas válidas.');
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Selecciona fechas válidas.');
    return date;
}

function plainText(value) {
    return String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

async function readPublic(url) {
    const response = await fetch(url.toString(), { headers: { Accept: 'text/html, application/json' }, signal: AbortSignal.timeout(12000), redirect: 'manual' });
    if (!response.ok) throw new Error(`beds24_http_${response.status}`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 750000) {
            await reader.cancel();
            throw new Error('Respuesta inesperada del servicio de reservas.');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(bytes);
}

export async function getBookingData(params) {
    const house = Object.hasOwn(houses, params.get('house')) ? houses[params.get('house')] : null;
    if (!house) return { status: 400, body: { error: 'Casa desconocida.' } };
    const guests = Number(params.get('guests') || 2);
    if (!Number.isInteger(guests) || guests < 1 || guests > house.maximum) return { status: 400, body: { error: 'Revisa la cantidad de personas.' } };
    try {
        const kind = params.get('kind');
        if (kind === 'calendar') {
            const month = params.get('month');
            dateValue(`${month}-01`);
            const url = new URL(`https://beds24.com/${house.slug}`);
            url.search = new URLSearchParams({ checkin_hide: `${month}-01`, numnight: '1', numadult: String(guests), lang: 'es' });
            const html = await readPublic(url);
            const expected = new RegExp(`id="roomid${house.room}"`);
            const availability = html.match(new RegExp(`\\$\\("#ajaxroomoffer1-${house.room}"\\)\\.data\\("avail",\\s*(\\{[^;]*?\\})\\)`));
            if (!expected.test(html) || !availability) throw new Error('No pudimos verificar el calendario.');
            const raw = JSON.parse(availability[1]);
            const days = {};
            for (const [key, value] of Object.entries(raw)) {
                if (!/^\d{8}$/.test(key) || !/^\d+$/.test(String(value))) throw new Error('Calendario inesperado.');
                days[`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`] = Number(value);
            }
            return { status: 200, body: { days, checkedAt: new Date().toISOString(), source: 'Beds24' } };
        }
        if (kind !== 'quote') return { status: 400, body: { error: 'Consulta desconocida.' } };
        const checkin = params.get('checkin');
        const checkout = params.get('checkout');
        const nights = (dateValue(checkout) - dateValue(checkin)) / 86400000;
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (checkin < today || nights < 1 || nights > 60) return { status: 400, body: { error: 'Elige una estadía de entre 1 y 60 noches, desde hoy.' } };
        const query = new URLSearchParams({ ro: house.room, ci: checkin, co: checkout, na: String(guests), nc: '0', of: '1', nr: '1', la: 'es', cu: '' });
        const raw = JSON.parse(await readPublic(`https://beds24.com/api/ajax/getroomprice.php?${query}`));
        const quote = Array.isArray(raw) && raw.find(item => String(item.roomid) === house.room && Number(item.offerid) === 1);
        const lastnight = new Date(dateValue(checkout).getTime() - 86400000).toISOString().slice(0, 10);
        if (!quote || quote.checkin !== checkin || quote.lastnight !== lastnight || Number(quote.numadult) !== guests || Number(quote.numchild) !== 0 || !Number.isFinite(quote.roomprice)) throw new Error('No pudimos verificar la cotización.');
        const warning = plainText(quote.warn);
        const available = quote.roomprice > 0 && !warning && Number(quote.enquire) !== 1 && ![1, 5].includes(Number(quote.ratetype)) && (quote.roomsavail === undefined || Number(quote.roomsavail) > 0);
        const currency = plainText(quote.roompricedisplay).match(/\b(CLP|USD|EUR)\b/)?.[1];
        if (available && !currency) throw new Error('No pudimos verificar la moneda de la cotización.');
        const checkoutURL = new URL('https://beds24.com/booking2.php');
        checkoutURL.search = new URLSearchParams({ propid: house.property, checkin_hide: checkin, checkout_hide: checkout, numnight: String(nights), numadult: String(guests), numchild: '0', lang: 'es', [`br1-${house.room}`]: 'Book' });
        return { status: 200, body: { available, total: available ? quote.roomprice : null, currency: currency || null, nights, warning: warning || (available ? '' : 'Estas fechas requieren otra selección o una consulta al anfitrión.'), checkoutURL: available ? checkoutURL.href : null, checkedAt: new Date().toISOString() } };
    } catch (error) {
        console.warn(JSON.stringify({ event: 'booking_lookup_failed', house: params.get('house'), message: error.message }));
        const reference = /^beds24_http_\d{3}$/.test(error.message) ? error.message : error.name;
        return { status: 502, body: { reference, error: 'No pudimos comprobar los datos de reserva. Intenta nuevamente o consulta directamente en reservas.' } };
    }
}
