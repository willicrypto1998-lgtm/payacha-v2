import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Modal, Alert, ActivityIndicator,
  RefreshControl, Linking, Vibration,
} from 'react-native';
import { GuepexAPI, GUEPEX_STATUS, ALGERIA_WILAYAS, useStore, GUEPEX } from '../store';

const C = {
  primary:'#085041', primary2:'#1D9E75', light:'#E1F5EE', white:'#fff',
  bg:'#F4F6F5', card:'#fff', border:'#E5E7EB', text:'#111827', sub:'#6B7280',
  danger:'#A32D2D', dangerBg:'#FCEBEB', warn:'#854F0B', warnBg:'#FAEEDA',
  success:'#3B6D11', successBg:'#EAF3DE', info:'#185FA5', infoBg:'#E6F1FB',
};

export default function GuepexScreen() {
  const { parcels, addParcel, updateParcel, setParcels, orders } = useStore();
  const [tab, setTab] = useState('livraisons'); // livraisons | nouveau | tracking
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Nouveau colis ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerWilaya: 'Boumerdès',
    customerCommune: '', customerAddress: '', productList: '',
    total: '', notes: '', isStopdesk: false,
  });
  const [showWilayas, setShowWilayas] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // ─── Tracking ─────────────────────────────────────────────────────────────
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // ─── Charger colis depuis Guepex ─────────────────────────────────────────
  const loadParcels = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await GuepexAPI.listParcels();
      if (data.length > 0) {
        const formatted = data.map(p => ({
          tracking: p.tracking || p.id,
          customerName: `${p.firstname || ''} ${p.familyname || ''}`.trim(),
          customerPhone: p.contact_phone,
          customerWilaya: p.to_wilaya_name,
          total: p.price,
          status: p.last_status?.status || p.status || 'En attente',
          createdAt: p.created_at || new Date().toISOString(),
          productList: p.product_list,
        }));
        setParcels(formatted);
      }
    } catch (e) {}
    setRefreshing(false);
  }, []);

  useEffect(() => { loadParcels(); }, []);

  const createParcel = async () => {
    if (!form.customerName || !form.customerPhone || !form.customerWilaya || !form.total) {
      Alert.alert('Champs manquants', 'Nom, téléphone, wilaya et montant sont obligatoires.');
      return;
    }
    setCreating(true);
    const result = await GuepexAPI.createParcel({
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerWilaya: form.customerWilaya,
      customerCommune: form.customerCommune,
      customerAddress: form.customerAddress,
      items: [{ name: form.productList || 'Produit', qty: 1 }],
      total: parseInt(form.total) || 0,
      notes: form.notes,
      isStopdesk: form.isStopdesk,
    });

    if (result.success && result.tracking) {
      Vibration.vibrate(100);
      addParcel({
        tracking: result.tracking,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerWilaya: form.customerWilaya,
        total: parseInt(form.total) || 0,
        status: 'En attente de ramassage',
        createdAt: new Date().toISOString(),
        productList: form.productList,
      });
      Alert.alert('✅ Colis créé !', `Numéro de suivi:\n${result.tracking}`, [
        { text: 'Copier', onPress: () => {} },
        { text: 'OK', onPress: () => {
          setForm({ customerName:'', customerPhone:'', customerWilaya:'Boumerdès',
            customerCommune:'', customerAddress:'', productList:'', total:'', notes:'', isStopdesk:false });
          setTab('livraisons');
        }}
      ]);
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de créer le colis. Vérifiez votre connexion.');
    }
    setCreating(false);
  };

  const trackSingle = async () => {
    if (!trackingCode.trim()) return;
    setTrackingLoading(true);
    setTrackingResult(null);
    const result = await GuepexAPI.trackParcel(trackingCode.trim());
    setTrackingResult(result);
    if (result.tracking) {
      updateParcel(result.tracking, { status: result.status });
    }
    setTrackingLoading(false);
  };

  const getStatusInfo = (status) => GUEPEX_STATUS[status] || { icon: '📦', color: C.sub, bg: C.bg };

  const filteredWilayas = ALGERIA_WILAYAS.filter(w =>
    w.toLowerCase().includes(wilayaSearch.toLowerCase())
  );

  // Stats
  const total = parcels.length;
  const enLivraison = parcels.filter(p => p.status === 'En livraison').length;
  const livres = parcels.filter(p => p.status === 'Livré').length;
  const retournes = parcels.filter(p => p.status === 'Retourné').length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.htitle}>🚚 Guepex — Livraisons</Text>
          <Text style={s.hsub}>Boumerdès · {GUEPEX.PHONE}</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={loadParcels}>
          <Text style={{ color: C.white, fontSize: 18 }}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[[total,'Total',C.text],[enLivraison,'En route',C.info],[livres,'Livrés',C.success],[retournes,'Retours',C.danger]].map(([v,l,c]) => (
          <View key={l} style={s.statCard}>
            <Text style={[s.statVal, { color: c }]}>{v}</Text>
            <Text style={s.statLbl}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[['livraisons','📦 Colis'],['nouveau','➕ Nouveau'],['tracking','🔍 Tracking']].map(([k,l]) => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabActive]} onPress={() => setTab(k)}>
            <Text style={[s.tabText, tab === k && s.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── LIVRAISONS ─── */}
      {tab === 'livraisons' && (
        <FlatList
          data={parcels}
          keyExtractor={p => p.tracking}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadParcels} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>🚚</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>Aucun colis Guepex</Text>
              <Text style={{ fontSize: 13, color: C.sub, textAlign: 'center', marginTop: 6 }}>
                Créez votre premier colis depuis l'onglet "Nouveau"
              </Text>
              <TouchableOpacity style={[s.mainBtn, { marginTop: 16, paddingHorizontal: 24 }]}
                onPress={() => setTab('nouveau')}>
                <Text style={{ color: C.white, fontWeight: '600' }}>➕ Créer un colis</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: p }) => {
            const si = getStatusInfo(p.status);
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tracking}>{p.tracking}</Text>
                    <Text style={s.cardName}>{p.customerName} · {p.customerWilaya}</Text>
                    <Text style={s.cardPhone}>{p.customerPhone}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: si.bg }]}>
                    <Text style={s.badgeIcon}>{si.icon}</Text>
                    <Text style={[s.badgeText, { color: si.color }]}>{p.status}</Text>
                  </View>
                </View>
                {p.productList && (
                  <Text style={s.productList} numberOfLines={1}>📦 {p.productList}</Text>
                )}
                <View style={s.cardFooter}>
                  <Text style={s.cardTotal}>{p.total?.toLocaleString()} DA</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={s.iconBtn}
                      onPress={() => Linking.openURL(`tel:${p.customerPhone}`)}>
                      <Text style={{ fontSize: 16 }}>📞</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.successBg }]}
                      onPress={() => {
                        const msg = `Bonjour ${p.customerName}, votre colis est en cours de livraison. Suivi: ${p.tracking}`;
                        Linking.openURL(`whatsapp://send?phone=213${p.customerPhone?.replace(/^0/,'')||''}&text=${encodeURIComponent(msg)}`);
                      }}>
                      <Text style={{ fontSize: 16 }}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.iconBtn, { backgroundColor: C.infoBg }]}
                      onPress={() => { setTrackingCode(p.tracking); setTab('tracking'); setTimeout(trackSingle, 300); }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: C.info }}>Suivre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ─── NOUVEAU COLIS ─── */}
      {tab === 'nouveau' && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <View style={s.formCard}>
            <Text style={s.formTitle}>📦 Nouveau colis Guepex</Text>

            {[
              ['Nom du client *', 'customerName', 'text', 'Ex: Ahmed Benali'],
              ['Téléphone *', 'customerPhone', 'phone-pad', '05XX XXX XXX'],
              ['Commune', 'customerCommune', 'text', 'Ex: Boumerdès Centre'],
              ['Adresse', 'customerAddress', 'text', 'Ex: Rue des Martyrs'],
              ['Produits', 'productList', 'text', 'Ex: T-shirt x2, Lunettes x1'],
              ['Montant à payer (DA) *', 'total', 'numeric', '0'],
              ['Notes', 'notes', 'text', 'Instructions spéciales...'],
            ].map(([label, key, kt, ph]) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={form[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholder={ph}
                  placeholderTextColor={C.sub}
                  keyboardType={kt}
                  multiline={key === 'notes'}
                />
              </View>
            ))}

            {/* Wilaya picker */}
            <Text style={s.label}>Wilaya de destination *</Text>
            <TouchableOpacity style={s.input} onPress={() => setShowWilayas(true)}>
              <Text style={{ fontSize: 14, color: form.customerWilaya ? C.text : C.sub }}>
                {form.customerWilaya || 'Choisir une wilaya'}
              </Text>
            </TouchableOpacity>

            {/* Stop desk toggle */}
            <TouchableOpacity
              style={[s.toggleRow, form.isStopdesk && s.toggleActive]}
              onPress={() => setForm(f => ({ ...f, isStopdesk: !f.isStopdesk }))}>
              <Text style={{ fontSize: 14, color: form.isStopdesk ? C.primary : C.sub, fontWeight: '600' }}>
                {form.isStopdesk ? '✅' : '⬜'} Livraison Stop-Desk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.mainBtn, { marginTop: 16, opacity: creating ? 0.7 : 1 }]}
              onPress={createParcel}
              disabled={creating}>
              {creating
                ? <ActivityIndicator color={C.white} />
                : <Text style={{ color: C.white, fontWeight: '700', fontSize: 15 }}>🚀 Créer le colis Guepex</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ─── TRACKING ─── */}
      {tab === 'tracking' && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
          <View style={s.formCard}>
            <Text style={s.formTitle}>🔍 Suivi de colis</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={trackingCode}
                onChangeText={setTrackingCode}
                placeholder="Numéro de suivi Guepex..."
                placeholderTextColor={C.sub}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[s.mainBtn, { paddingHorizontal: 16 }]} onPress={trackSingle}>
                <Text style={{ color: C.white, fontWeight: '700' }}>Suivre</Text>
              </TouchableOpacity>
            </View>

            {trackingLoading && (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ color: C.sub, marginTop: 10 }}>Récupération du suivi...</Text>
              </View>
            )}

            {trackingResult && !trackingLoading && (
              <View>
                {/* Statut actuel */}
                <View style={[s.statusBox, { backgroundColor: getStatusInfo(trackingResult.status).bg }]}>
                  <Text style={{ fontSize: 36 }}>{getStatusInfo(trackingResult.status).icon}</Text>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: getStatusInfo(trackingResult.status).color }}>
                      {trackingResult.status}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.sub }}>Colis: {trackingResult.tracking}</Text>
                  </View>
                </View>

                {/* Historique */}
                {trackingResult.history?.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={s.label}>HISTORIQUE</Text>
                    {trackingResult.history.map((h, i) => (
                      <View key={i} style={s.historyItem}>
                        <View style={[s.historyDot, { backgroundColor: i === 0 ? C.primary : C.border }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                            {getStatusInfo(h.status)?.icon} {h.status}
                          </Text>
                          {h.date && <Text style={{ fontSize: 11, color: C.sub }}>{h.date}</Text>}
                          {h.location && <Text style={{ fontSize: 11, color: C.sub }}>📍 {h.location}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {trackingResult.error && (
                  <View style={[s.statusBox, { backgroundColor: C.dangerBg }]}>
                    <Text style={{ fontSize: 24 }}>❌</Text>
                    <Text style={{ fontSize: 13, color: C.danger, flex: 1 }}>{trackingResult.error}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal wilayas */}
      <Modal visible={showWilayas} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 }}>Choisir une wilaya</Text>
            <TextInput
              style={[s.input, { marginBottom: 10 }]}
              value={wilayaSearch}
              onChangeText={setWilayaSearch}
              placeholder="Rechercher..."
              placeholderTextColor={C.sub}
            />
            <FlatList
              data={filteredWilayas}
              keyExtractor={w => w}
              renderItem={({ item: w }) => (
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border }}
                  onPress={() => {
                    setForm(f => ({ ...f, customerWilaya: w }));
                    setShowWilayas(false);
                    setWilayaSearch('');
                  }}>
                  <Text style={{ fontSize: 14, color: C.text }}>{w}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  htitle: { fontSize: 18, fontWeight: '700', color: C.white },
  hsub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  refreshBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 0.5, borderBottomColor: C.border },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLbl: { fontSize: 10, color: C.sub, marginTop: 1 },
  tabRow: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 12, color: C.sub, fontWeight: '500' },
  tabTextActive: { color: C.primary, fontWeight: '700' },
  card: { backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  tracking: { fontSize: 12, fontFamily: 'Courier', color: C.primary, fontWeight: '700', marginBottom: 2 },
  cardName: { fontSize: 13, fontWeight: '600', color: C.text },
  cardPhone: { fontSize: 11, color: C.sub },
  productList: { fontSize: 12, color: C.sub, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 8 },
  cardTotal: { fontSize: 15, fontWeight: '700', color: C.text },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeIcon: { fontSize: 12 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  iconBtn: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  formCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: C.border },
  formTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 5 },
  input: { backgroundColor: C.bg, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, height: 44 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, marginTop: 8 },
  toggleActive: { borderColor: C.primary, backgroundColor: C.light },
  mainBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, marginBottom: 8 },
  historyItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
});
