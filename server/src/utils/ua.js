// Very small user-agent sniffing, good enough for the analytics breakdown
export function parseUA(ua = '') {
  let browser = 'Other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/curl|bot|spider|crawl/i.test(ua)) browser = 'Bot';

  let device = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';

  return { browser, device };
}

export function parseReferrer(ref) {
  if (!ref) return 'Direct';
  try {
    return new URL(ref).hostname.replace(/^www\./, '') || 'Direct';
  } catch {
    return 'Direct';
  }
}
