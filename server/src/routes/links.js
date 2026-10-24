import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Link from '../models/Link.js';
import Click from '../models/Click.js';
import { generateCode, isValidAlias, normalizeUrl } from '../utils/code.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many links created. Try again in a minute.' },
});

// There are no accounts. Each browser sends a random id and only sees its own links.
function requireOwner(req, res, next) {
  const owner = req.get('x-owner-id');
  if (!owner || owner.length < 10 || owner.length > 64) {
    return res.status(400).json({ error: 'Missing owner id' });
  }
  req.owner = owner;
  next();
}

function baseUrl(req) {
  return (process.env.BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function present(link, req) {
  return {
    code: link.code,
    url: link.url,
    shortUrl: `${baseUrl(req)}/${link.code}`,
    clicks: link.clicks,
    expiresAt: link.expiresAt,
    expired: !!link.expiresAt && link.expiresAt <= new Date(),
    createdAt: link.createdAt,
  };
}

router.use(requireOwner);

router.post('/', createLimiter, async (req, res, next) => {
  try {
    const { url, alias, expiresAt } = req.body;

    const target = normalizeUrl(url);
    if (!target) {
      return res.status(400).json({ error: 'Enter a valid http or https URL.' });
    }

    // Don't let people shorten our own short links
    const ownHost = new URL(baseUrl(req)).host;
    if (new URL(target).host === ownHost) {
      return res.status(400).json({ error: 'That link already points to this site.' });
    }

    let expiry = null;
    if (expiresAt) {
      expiry = new Date(expiresAt);
      if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
        return res.status(400).json({ error: 'Expiry must be a date in the future.' });
      }
    }

    if (alias) {
      if (!isValidAlias(alias)) {
        return res.status(400).json({
          error: 'Custom alias must be 3-30 characters: letters, numbers, - or _.',
        });
      }
      try {
        const link = await Link.create({ code: alias, url: target, owner: req.owner, expiresAt: expiry });
        return res.status(201).json(present(link, req));
      } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'That alias is already taken.' });
        throw err;
      }
    }

    // Random code. A collision is very unlikely, but retry if it happens.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const link = await Link.create({
          code: generateCode(7),
          url: target,
          owner: req.owner,
          expiresAt: expiry,
        });
        return res.status(201).json(present(link, req));
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    res.status(500).json({ error: 'Could not generate a unique code. Please try again.' });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const links = await Link.find({ owner: req.owner }).sort({ createdAt: -1 }).limit(100);
    res.json(links.map((l) => present(l, req)));
  } catch (err) {
    next(err);
  }
});

router.get('/:code/stats', async (req, res, next) => {
  try {
    const link = await Link.findOne({ code: req.params.code, owner: req.owner });
    if (!link) return res.status(404).json({ error: 'Link not found.' });

    const DAYS = 14;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (DAYS - 1));

    const breakdown = (field) =>
      Click.aggregate([
        { $match: { link: link._id } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).then((rows) => rows.map((r) => ({ label: r._id, count: r.count })));

    const [daily, referrers, browsers, devices] = await Promise.all([
      Click.aggregate([
        { $match: { link: link._id, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      breakdown('referrer'),
      breakdown('browser'),
      breakdown('device'),
    ]);

    // Fill in days with zero clicks so the chart has no gaps
    const counts = Object.fromEntries(daily.map((d) => [d._id, d.count]));
    const series = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, count: counts[key] || 0 });
    }

    res.json({ link: present(link, req), daily: series, referrers, browsers, devices });
  } catch (err) {
    next(err);
  }
});

router.delete('/:code', async (req, res, next) => {
  try {
    const link = await Link.findOneAndDelete({ code: req.params.code, owner: req.owner });
    if (!link) return res.status(404).json({ error: 'Link not found.' });
    await Click.deleteMany({ link: link._id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
