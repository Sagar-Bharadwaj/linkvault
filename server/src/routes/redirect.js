import Link from '../models/Link.js';
import Click from '../models/Click.js';
import { parseUA, parseReferrer } from '../utils/ua.js';

function messagePage(res, status, title, text) {
  res
    .status(status)
    .type('html')
    .send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:18vh auto;padding:0 20px;color:#222}
h1{font-size:22px;margin-bottom:8px}p{color:#555;line-height:1.5}a{color:#0f5c63}</style></head>
<body><h1>${title}</h1><p>${text}</p><p><a href="/">Go to LinkVault</a></p></body></html>`);
}

export default async function redirect(req, res, next) {
  try {
    const link = await Link.findOne({ code: req.params.code });
    if (!link) return messagePage(res, 404, 'Link not found', 'This short link does not exist or was deleted.');

    if (link.expiresAt && link.expiresAt <= new Date()) {
      return messagePage(res, 410, 'Link expired', 'The owner set this link to stop working after a certain date.');
    }

    // Record the visit without making the visitor wait for it
    const { browser, device } = parseUA(req.get('user-agent'));
    Click.create({ link: link._id, referrer: parseReferrer(req.get('referer')), browser, device }).catch(
      (err) => console.error('click log failed:', err.message)
    );
    Link.updateOne({ _id: link._id }, { $inc: { clicks: 1 } }).catch((err) =>
      console.error('counter update failed:', err.message)
    );

    // 302 on purpose: a 301 gets cached by browsers and later clicks would never reach us
    res.redirect(302, link.url);
  } catch (err) {
    next(err);
  }
}
