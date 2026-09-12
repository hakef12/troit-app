const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('fideliza_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Ocurrió un error inesperado');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  loginWithGoogle: (credential) => request('/auth/google', { method: 'POST', body: { credential }, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (payload) => request('/auth/me', { method: 'PUT', body: payload }),

  getProducts: (all = false) => request(`/products${all ? '?all=1' : ''}`, { auth: false }),
  createProduct: (payload) => request('/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getCoupons: (all = false) => request(`/coupons${all ? '?all=1' : ''}`, { auth: false }),
  createCoupon: (payload) => request('/coupons', { method: 'POST', body: payload }),
  updateCoupon: (id, payload) => request(`/coupons/${id}`, { method: 'PUT', body: payload }),
  deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),
  redeemCoupon: (id) => request(`/coupons/${id}/redeem`, { method: 'POST' }),
  myRedemptions: () => request('/coupons/redemptions/mine'),

  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  myOrders: () => request('/orders/mine'),
  allOrders: () => request('/orders'),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: { status } }),

  getStoreInfo: () => request('/store-info', { auth: false }),

  getDeliveryEstimate: (lat, lng) => request(`/delivery-estimate?lat=${lat}&lng=${lng}`, { auth: false }),

  submitGameScore: (score) => request('/game/score', { method: 'POST', body: { score } }),

  getPromos: (all = false) => request(`/promos${all ? '?all=1' : ''}`, { auth: false }),
  createPromo: (payload) => request('/promos', { method: 'POST', body: payload }),
  updatePromo: (id, payload) => request(`/promos/${id}`, { method: 'PUT', body: payload }),
  deletePromo: (id) => request(`/promos/${id}`, { method: 'DELETE' }),

  getBanners: (all = false) => request(`/banners${all ? '?all=1' : ''}`, { auth: false }),
  createBanner: (payload) => request('/banners', { method: 'POST', body: payload }),
  updateBanner: (id, payload) => request(`/banners/${id}`, { method: 'PUT', body: payload }),
  deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/uploads`, { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo subir la imagen');
    return data;
  },
};

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
    );
    if (!res.ok) return '';
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}

export { getToken };
