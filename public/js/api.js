const Api = (() => {
  const TOKEN_KEY = 'oc_token';
  const USER_KEY = 'oc_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

  async function request(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      clearSession();
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html';
      }
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      throw new Error((data && data.error) || 'Ha ocurrido un error inesperado.');
    }
    return data;
  }

  const get = (url) => request('GET', url);
  const post = (url, body) => request('POST', url, body);
  const put = (url, body) => request('PUT', url, body);
  const patch = (url, body) => request('PATCH', url, body || {});
  const del = (url) => request('DELETE', url);

  function login(email, password) {
    return post('/api/auth/login', { email, password });
  }
  function logout() {
    clearSession();
    location.href = 'login.html';
  }

  return { getToken, setToken, clearSession, getUser, setUser, get, post, put, patch, del, login, logout };
})();
