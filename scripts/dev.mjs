import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { getBookingData } from '../lib/beds24.mjs';

const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    if (url.pathname === '/api/booking') {
        const result = await getBookingData(url.searchParams);
        response.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(result.body));
        return;
    }
    try {
        const path = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
        const file = resolve(root, path);
        const allowed = /^(?:[^/]+\.html|(?:css|js|images|guias)\/[^.][^]*\.(?:html|css|js|json|jpg|jpeg|png|svg|webp))$/.test(path);
        if (!file.startsWith(root + sep) || !allowed || !(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
        response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
}).listen(8766, '127.0.0.1', () => console.log('Hogar Mágico — http://127.0.0.1:8766'));
