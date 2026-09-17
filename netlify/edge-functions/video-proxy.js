// Streams a video file from an allow-listed host, server-side, and hands it back
// with headers that force a real download. The browser only ever talks to our own
// domain here — CORS never comes into play because this fetch happens on Netlify's
// server, not in the user's browser.

const ALLOWED_HOSTS = [
  'selectionwayrecordedmp4.hranker.com',
  'backend.multistreaming.site',
  'gdgoenkaratia.com'
];

export default async (request) => {
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('url');
  if (!target) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  const hostOk = ALLOWED_HOSTS.some(
    (h) => targetUrl.hostname === h || targetUrl.hostname.endsWith('.' + h)
  );
  if (!hostOk) {
    return new Response('This host is not allowed', { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString());
  } catch (e) {
    return new Response('Could not reach the video server: ' + e.message, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('Video server returned ' + upstream.status, { status: 502 });
  }

  const rawName = reqUrl.searchParams.get('name') || 'video.mp4';
  const safeName = rawName.replace(/["\r\n]/g, '').slice(0, 150);

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'video/mp4');
  const len = upstream.headers.get('Content-Length');
  if (len) headers.set('Content-Length', len);
  headers.set('Content-Disposition', 'attachment; filename="' + safeName + '"');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: 200, headers });
};

export const config = { path: '/video-proxy' };
