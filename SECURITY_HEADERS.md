# Security header recommendations

Use these as hosting headers where your platform supports them. GitHub Pages does not apply custom response headers directly, so use Cloudflare, Netlify, Vercel, or another edge layer if you need enforcement.

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: https://www.google-analytics.com; media-src 'self'; connect-src 'self' https://kkkcbkiolcfqfzosupiy.supabase.co https://www.google-analytics.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```