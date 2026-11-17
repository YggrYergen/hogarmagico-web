import { getBookingData } from '../../lib/beds24.mjs';

export async function onRequestGet({ request }) {
    const result = await getBookingData(new URL(request.url).searchParams);
    return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
