// Each browser gets a random id the first time it visits. The server uses it
// to decide which links belong to whom, so no login is needed.
function getOwnerId() {
  let id = localStorage.getItem('lv_owner');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('lv_owner', id);
  }
  return id;
}

async function request(path, options = {}) {
  const res = await fetch('/api/links' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-owner-id': getOwnerId(),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

export const createLink = (body) => request('', { method: 'POST', body: JSON.stringify(body) });
export const getLinks = () => request('');
export const getStats = (code) => request(`/${code}/stats`);
export const deleteLink = (code) => request(`/${code}`, { method: 'DELETE' });
