import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── GUEPEX CONFIG ────────────────────────────────────────────────────────────
export const GUEPEX = {
  API_ID: '23209051799957729516',
  API_TOKEN: 'Xv8AijbRMF0Zh5IBEDmSedcToNHCl1gVfqQu4GKy3sUp6raY72Ltwn9xkWPOzJ',
  BASE_URL: 'https://api.guepex.app/v1',
  WEBHOOK: 'https://payacha.leaderscod.com/tenants/api/guepex/webhooks?token=JHyEqobuXl',
  FROM_WILAYA: 'Boumerdès',
  PHONE: '+213550322176',
};

const guepexHeaders = {
  'X-API-ID': GUEPEX.API_ID,
  'X-API-TOKEN': GUEPEX.API_TOKEN,
  'Content-Type': 'application/json',
};

// ─── GUEPEX API CALLS ─────────────────────────────────────────────────────────
export const GuepexAPI = {
  // Créer un colis
  createParcel: async (order) => {
    try {
      const res = await fetch(`${GUEPEX.BASE_URL}/parcels/`, {
        method: 'POST',
        headers: guepexHeaders,
        body: JSON.stringify({
          firstname: order.customerName?.split(' ')[0] || 'Client',
          familyname: order.customerName?.split(' ').slice(1).join(' ') || '',
          contact_phone: order.customerPhone,
          address: order.customerAddress || order.customerCommune,
          from_wilaya_name: GUEPEX.FROM_WILAYA,
          to_wilaya_name: order.customerWilaya,
          to_commune_name: order.customerCommune || '',
          product_list: order.items?.map(i => `${i.name} x${i.qty}`).join(', ') || '',
          price: order.total,
          weight: 1,
          is_stopdesk: order.isStopdesk || false,
          has_exchange: false,
          notes: order.notes || '',
        }),
      });
      const data = await res.json();
      return { success: true, tracking: data?.tracking || data?.data?.tracking, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Suivre un colis
  trackParcel: async (tracking) => {
    try {
      const res = await fetch(`${GUEPEX.BASE_URL}/parcels/${tracking}/`, {
        headers: guepexHeaders,
      });
      const data = await res.json();
      return {
        tracking,
        status: data?.last_status?.status || data?.status || 'Inconnu',
        history: data?.history || [],
        data,
      };
    } catch (err) {
      return { tracking, status: 'Erreur', error: err.message, history: [] };
    }
  },

  // Lister les colis
  listParcels: async (page = 1) => {
    try {
      const res = await fetch(`${GUEPEX.BASE_URL}/parcels/?page=${page}&page_size=50`, {
        headers: guepexHeaders,
      });
      const data = await res.json();
      return data?.results || data?.data || [];
    } catch (err) {
      return [];
    }
  },

  // Wilayas disponibles
  getWilayas: async () => {
    try {
      const res = await fetch(`${GUEPEX.BASE_URL}/wilayas/`, { headers: guepexHeaders });
      const data = await res.json();
      return data?.results || data?.data || ALGERIA_WILAYAS;
    } catch {
      return ALGERIA_WILAYAS;
    }
  },

  // Tarif livraison
  getRate: async (toWilaya) => {
    try {
      const res = await fetch(
        `${GUEPEX.BASE_URL}/deliveryfees/?from_wilaya_name=${GUEPEX.FROM_WILAYA}&to_wilaya_name=${toWilaya}`,
        { headers: guepexHeaders }
      );
      return await res.json();
    } catch { return null; }
  },

  // Annuler un colis
  cancelParcel: async (tracking) => {
    try {
      const res = await fetch(`${GUEPEX.BASE_URL}/parcels/${tracking}/`, {
        method: 'DELETE',
        headers: guepexHeaders,
      });
      return { success: res.ok };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

// ─── STATUTS GUEPEX ───────────────────────────────────────────────────────────
export const GUEPEX_STATUS = {
  'En attente de ramassage': { icon: '⏳', color: '#854F0B', bg: '#FAEEDA' },
  'Ramassé': { icon: '📦', color: '#185FA5', bg: '#E6F1FB' },
  'En cours de traitement': { icon: '⚙️', color: '#185FA5', bg: '#E6F1FB' },
  'En transit': { icon: '🚛', color: '#185FA5', bg: '#E6F1FB' },
  'En livraison': { icon: '🛵', color: '#085041', bg: '#E1F5EE' },
  'Livré': { icon: '✅', color: '#3B6D11', bg: '#EAF3DE' },
  'Retourné': { icon: '↩️', color: '#A32D2D', bg: '#FCEBEB' },
  'Échoué': { icon: '❌', color: '#A32D2D', bg: '#FCEBEB' },
  'Annulé': { icon: '🚫', color: '#6B7280', bg: '#F3F4F6' },
  'Reporté': { icon: '📅', color: '#854F0B', bg: '#FAEEDA' },
};

// ─── 48 WILAYAS ALGÉRIE ───────────────────────────────────────────────────────
export const ALGERIA_WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
  'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
  'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
  'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
  'M\'Sila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj',
  'Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane'
];

// ─── STORE ZUSTAND ────────────────────────────────────────────────────────────
const SEED_PRODUCTS = [
  { id:'p1', name:'Nike Air Max 270', sku:'SKU-001', ean:'3614524061049', price:12500, stock:0, minStock:5, category:'Chaussures', supplier:'Sport Pro', emoji:'👟' },
  { id:'p2', name:'Robe Été Fleurie', sku:'SKU-002', ean:'6111111011011', price:4800, stock:2, minStock:5, category:'Vêtements', supplier:'Mode Alger', emoji:'👗' },
  { id:'p3', name:'Sac Cuir Marron', sku:'SKU-003', ean:'7612345678900', price:8200, stock:3, minStock:5, category:'Accessoires', supplier:'Atlas', emoji:'👜' },
  { id:'p4', name:'T-shirt Oversize', sku:'SKU-004', ean:'3560070014309', price:1900, stock:42, minStock:10, category:'Vêtements', supplier:'Cotton Co', emoji:'👕' },
  { id:'p5', name:'Lunettes UV400', sku:'SKU-005', ean:'8001234567890', price:3500, stock:18, minStock:5, category:'Accessoires', supplier:'Med Style', emoji:'🕶' },
  { id:'p6', name:'Crème SPF50', sku:'SKU-006', ean:'3337875539119', price:2300, stock:5, minStock:8, category:'Beauté', supplier:'Pharma DZ', emoji:'🧴' },
];

export const useStore = create((set, get) => ({
  products: SEED_PRODUCTS,
  orders: [],
  movements: [],
  returns: [],
  parcels: [], // colis Guepex

  // ─── PRODUCTS ────────────────────────────────────────────────────────────
  addProduct: (p) => set(s => ({ products: [...s.products, { ...p, id: `p${Date.now()}` }] })),
  updateProduct: (id, data) => set(s => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) })),
  deleteProduct: (id) => set(s => ({ products: s.products.filter(p => p.id !== id) })),

  adjustStock: (productId, qty, type, method = 'manual') => {
    const product = get().products.find(p => p.id === productId);
    if (!product) return;
    const delta = (type === 'in' || type === 'return') ? qty : -qty;
    set(s => ({
      products: s.products.map(p => p.id === productId
        ? { ...p, stock: Math.max(0, p.stock + delta) } : p),
      movements: [{
        id: `m${Date.now()}`, productId,
        productName: product.name, type, qty, method,
        date: new Date().toISOString(),
      }, ...s.movements],
    }));
  },

  getByEAN: (ean) => get().products.find(p => p.ean === ean),
  getBySKU: (sku) => get().products.find(p => p.sku === sku),
  getLow: () => get().products.filter(p => p.stock > 0 && p.stock <= p.minStock),
  getOut: () => get().products.filter(p => p.stock === 0),

  // ─── ORDERS ──────────────────────────────────────────────────────────────
  addOrder: (order) => set(s => ({
    orders: [{ ...order, id: `CMD-${Date.now()}`, createdAt: new Date().toISOString() }, ...s.orders]
  })),
  updateOrder: (id, data) => set(s => ({
    orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o)
  })),
  deleteOrder: (id) => set(s => ({ orders: s.orders.filter(o => o.id !== id) })),

  // ─── RETURNS ─────────────────────────────────────────────────────────────
  addReturn: (productId, productName, qty, reason, action) => {
    if (action === 'restock') get().adjustStock(productId, qty, 'return');
    set(s => ({
      returns: [{
        id: `r${Date.now()}`, productId, productName,
        qty, reason, action, date: new Date().toISOString()
      }, ...s.returns]
    }));
  },

  // ─── PARCELS (Guepex) ────────────────────────────────────────────────────
  addParcel: (parcel) => set(s => ({ parcels: [parcel, ...s.parcels] })),
  updateParcel: (tracking, data) => set(s => ({
    parcels: s.parcels.map(p => p.tracking === tracking ? { ...p, ...data } : p)
  })),
  setParcels: (parcels) => set({ parcels }),
}));
