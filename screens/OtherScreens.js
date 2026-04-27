import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ScrollView, Modal, Alert, Vibration, Linking,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useStore, GUEPEX } from '../store';

const C = {
  primary:'#085041', primary2:'#1D9E75', light:'#E1F5EE', white:'#fff',
  bg:'#F4F6F5', card:'#fff', border:'#E5E7EB', text:'#111827', sub:'#6B7280',
  danger:'#A32D2D', dangerBg:'#FCEBEB', warn:'#854F0B', warnBg:'#FAEEDA',
  success:'#3B6D11', successBg:'#EAF3DE', info:'#185FA5', infoBg:'#E6F1FB',
  scanBg:'#0a1628', scanGreen:'#1D9E75',
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ label, bg, color }) => (
  <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
    <Text style={{ fontSize: 10, fontWeight: '600', color }}>{label}</Text>
  </View>
);

const StockBadge = ({ stock, min }) => {
  if (stock === 0) return <Badge label="Rupture" bg={C.dangerBg} color={C.danger} />;
  if (stock <= min) return <Badge label="Stock bas" bg={C.warnBg} color={C.warn} />;
  return <Badge label="Dispo" bg={C.successBg} color={C.success} />;
};

const Header = ({ title, sub, right }) => (
  <View style={{ backgroundColor: C.primary, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }}>{title}</Text>
      {sub && <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{sub}</Text>}
    </View>
    {right}
  </View>
);

// ─── SCANNER ─────────────────────────────────────────────────────────────────
export default function ScannerScreen() {
  const [hasPerm, setHasPerm] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(null);
  const [manual, setManual] = useState('');
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [reason, setReason] = useState('wrong_size');
  const [retAction, setRetAction] = useState('restock');
  const { getByEAN, getBySKU, adjustStock, addReturn } = useStore();

  React.useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPerm(status === 'granted'));
  }, []);

  const lookup = (code) => {
    const p = getByEAN(code) || getBySKU(code);
    if (p) { setFound(p); setQty(1); setAction(null); setConfirmed(false); }
    else Alert.alert('Introuvable', `Code "${code}" non trouvé.`);
    setScanning(false);
  };

  const confirm = () => {
    if (!found || !action) return;
    if (action === 'return') { setShowReturn(true); return; }
    adjustStock(found.id, qty, action, 'scan');
    setConfirmed(true);
    Vibration.vibrate([0, 60, 60, 60]);
  };

  const confirmReturn = () => {
    addReturn(found.id, found.name, qty, reason, retAction);
    setShowReturn(false); setConfirmed(true);
    Vibration.vibrate([0, 60, 60, 60]);
  };

  const reset = () => { setFound(null); setManual(''); setQty(1); setAction(null); setConfirmed(false); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="📷 Scanner" sub="Code-barres · QR Code · SKU" />
      <ScrollView style={{ flex: 1, padding: 12 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Viewport */}
        <View style={{ height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: C.scanBg, marginBottom: 10 }}>
          {scanning && hasPerm ? (
            <BarCodeScanner
              onBarCodeScanned={({ data }) => { Vibration.vibrate(60); lookup(data); }}
              style={StyleSheet.absoluteFillObject}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 200, height: 140, position: 'relative' }}>
                  {[{t:0,l:0,bt:3,bl:3,br:0,bb:0},{t:0,r:0,bt:3,br:3,bl:0,bb:0},{b:0,l:0,bb:3,bl:3,bt:0,br:0},{b:0,r:0,bb:3,br:3,bt:0,bl:0}].map((corner, i) => (
                    <View key={i} style={{ position:'absolute', width:24, height:24, borderColor:C.scanGreen, borderStyle:'solid',
                      top:corner.t, bottom:corner.b, left:corner.l, right:corner.r,
                      borderTopWidth:corner.bt||0, borderBottomWidth:corner.bb||0,
                      borderLeftWidth:corner.bl||0, borderRightWidth:corner.br||0 }} />
                  ))}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 10 }}>Pointez sur le code</Text>
                <TouchableOpacity onPress={() => setScanning(false)}
                  style={{ marginTop: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}>
                  <Text style={{ color: C.white, fontSize: 13 }}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </BarCodeScanner>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' }}>Appuyez sur Scanner</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>EAN-13 · QR Code · Code128</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            onPress={() => { if (!hasPerm) { Alert.alert('Permission', 'Activez la caméra dans les paramètres.'); } else setScanning(true); }}>
            <Text style={{ color: C.white, fontWeight: '600', fontSize: 13 }}>📷 Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 0.5, borderColor: C.border }}
            onPress={() => lookup('3614524061049')}>
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>🔍 Démo</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <TextInput style={{ flex: 1, backgroundColor: C.white, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 12, fontSize: 13, color: C.text, height: 44 }}
            value={manual} onChangeText={setManual}
            placeholder="SKU ou EAN manuellement..." placeholderTextColor={C.sub}
            returnKeyType="search" onSubmitEditing={() => { lookup(manual); setManual(''); }} />
          <TouchableOpacity style={{ backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', height: 44 }}
            onPress={() => { lookup(manual); setManual(''); }}>
            <Text style={{ color: C.white, fontWeight: '700' }}>OK</Text>
          </TouchableOpacity>
        </View>

        {confirmed && (
          <View style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>{action === 'return' ? '↩️' : action === 'out' ? '📤' : '✅'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 }}>
              {action === 'return' ? 'Retour enregistré' : action === 'out' ? 'Sortie confirmée' : 'Stock mis à jour'}
            </Text>
            <Text style={{ fontSize: 13, color: C.sub }}>{action === 'out' ? `−${qty}` : `+${qty}`} unité(s) · {found?.name}</Text>
            <TouchableOpacity style={{ marginTop: 14, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 }} onPress={reset}>
              <Text style={{ color: C.white, fontWeight: '600' }}>Nouveau scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {found && !confirmed && (
          <View style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.light, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{found.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{found.name}</Text>
                <Text style={{ fontSize: 11, color: C.sub }}>{found.sku}</Text>
                <Text style={{ fontSize: 11, color: C.primary }}>{found.supplier}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: found.stock === 0 ? C.danger : found.stock <= found.minStock ? C.warn : C.success }}>{found.stock}</Text>
                <Text style={{ fontSize: 10, color: C.sub }}>stock actuel</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: C.text }}>{found.price?.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: C.sub }}>prix DA</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 8 }}>Quantité</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setQty(q => Math.max(1, q - 1))}>
                  <Text style={{ fontSize: 22, color: C.text }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 26, fontWeight: '700', color: C.text, minWidth: 40, textAlign: 'center' }}>{qty}</Text>
                <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setQty(q => q + 1)}>
                  <Text style={{ fontSize: 22, color: C.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {[['in','📥 Entrée',C.primary],['return','↩️ Retour',C.info],['out','📤 Sortie',C.warnBg]].map(([val, lbl, bg]) => (
                <TouchableOpacity key={val}
                  style={{ flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: action === val ? bg : C.bg }}
                  onPress={() => setAction(val)}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: action === val ? C.white : C.sub, textAlign: 'center' }}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {action && (
              <TouchableOpacity style={{ backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={confirm}>
                <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Confirmer — {action === 'out' ? `−${qty}` : `+${qty}`} unité(s)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showReturn} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 }}>↩️ Détails retour</Text>
            <Text style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>{found?.name}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 8 }}>Motif</Text>
            {[['wrong_size','Mauvaise taille'],['defect','Défaut produit'],['changed_mind',"Changement d'avis"],['damaged','Endommagé']].map(([v, l]) => (
              <TouchableOpacity key={v}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 0.5, borderColor: reason === v ? C.primary : C.border, backgroundColor: reason === v ? C.light : C.bg, marginBottom: 6 }}
                onPress={() => setReason(v)}>
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: reason === v ? C.primary : C.border, backgroundColor: reason === v ? C.primary : 'transparent' }} />
                <Text style={{ fontSize: 13, color: C.text }}>{l}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginTop: 10, marginBottom: 8 }}>Action</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[['restock','✅ Remettre en stock'],['discard','🗑 Écarter']].map(([v, l]) => (
                <TouchableOpacity key={v}
                  style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: retAction === v ? C.primary : C.border, backgroundColor: retAction === v ? C.light : C.bg, alignItems: 'center' }}
                  onPress={() => setRetAction(v)}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: retAction === v ? C.primary : C.sub }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.primary }} onPress={() => setShowReturn(false)}>
                <Text style={{ color: C.primary, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: C.primary }} onPress={confirmReturn}>
                <Text style={{ color: C.white, fontWeight: '600' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STOCK SCREEN ─────────────────────────────────────────────────────────────
export function StockScreen() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', sku:'', ean:'', price:'', stock:'', minStock:'5', emoji:'📦', supplier:'', category:'Vêtements' });

  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search) || (p.ean||'').includes(search);
    const mf = filter === 'all' || (filter === 'out' && p.stock === 0) || (filter === 'low' && p.stock > 0 && p.stock <= p.minStock);
    return ms && mf;
  });

  const out = products.filter(p => p.stock === 0).length;
  const low = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;

  const save = () => {
    if (!form.name || !form.sku) { Alert.alert('Erreur', 'Nom et SKU obligatoires'); return; }
    const data = { name:form.name, sku:form.sku, ean:form.ean, price:parseInt(form.price)||0, stock:parseInt(form.stock)||0, minStock:parseInt(form.minStock)||5, emoji:form.emoji, supplier:form.supplier, category:form.category };
    editing ? updateProduct(editing.id, data) : addProduct(data);
    setModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="📦 Stock" sub={`${products.length} produits · ${out} ruptures · ${low} alertes`}
        right={
          <TouchableOpacity style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
            onPress={() => { setEditing(null); setForm({ name:'', sku:'', ean:'', price:'', stock:'', minStock:'5', emoji:'📦', supplier:'', category:'Vêtements' }); setModal(true); }}>
            <Text style={{ color: C.white, fontWeight: '600', fontSize: 13 }}>+ Ajouter</Text>
          </TouchableOpacity>
        } />

      <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: C.primary }}>
        {[['all',`Tous (${products.length})`],['out',`Ruptures (${out})`],['low',`Alertes (${low})`]].map(([v,l]) => (
          <TouchableOpacity key={v} style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: filter === v ? C.white : 'rgba(255,255,255,0.15)' }} onPress={() => setFilter(v)}>
            <Text style={{ fontSize: 11, color: filter === v ? C.primary : 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 10, paddingBottom: 4 }}>
        <TextInput style={{ backgroundColor: C.white, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 14, height: 42, fontSize: 14, color: C.text }}
          value={search} onChangeText={setSearch} placeholder="Rechercher nom, SKU, EAN..." placeholderTextColor={C.sub} />
      </View>

      <FlatList data={filtered} keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={<View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ fontSize: 40 }}>📭</Text><Text style={{ fontSize: 14, color: C.sub, marginTop: 8 }}>Aucun produit</Text></View>}
        renderItem={({ item: p }) => (
          <TouchableOpacity style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => { setEditing(p); setForm({ name:p.name, sku:p.sku, ean:p.ean||'', price:String(p.price), stock:String(p.stock), minStock:String(p.minStock), emoji:p.emoji, supplier:p.supplier||'', category:p.category||'Vêtements' }); setModal(true); }}>
            <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: p.stock === 0 ? C.dangerBg : p.stock <= p.minStock ? C.warnBg : C.light, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ fontSize: 11, color: C.sub }}>{p.sku} · {p.category}</Text>
              <Text style={{ fontSize: 11, color: C.primary }}>{p.supplier}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: p.stock === 0 ? C.danger : p.stock <= p.minStock ? C.warn : C.success }}>{p.stock}</Text>
              <Text style={{ fontSize: 10, color: C.sub }}>unités</Text>
              <StockBadge stock={p.stock} min={p.minStock} />
            </View>
          </TouchableOpacity>
        )} />

      <Modal visible={modal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 }}>{editing ? 'Modifier' : 'Nouveau produit'}</Text>
              {[['Nom *','name'],['SKU *','sku'],['Code EAN','ean'],['Prix (DA)','price'],['Stock','stock'],['Seuil alerte','minStock'],['Fournisseur','supplier'],['Emoji','emoji']].map(([lbl, key]) => (
                <View key={key} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 4 }}>{lbl}</Text>
                  <TextInput style={{ backgroundColor: C.bg, borderRadius: 8, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 12, height: 44, fontSize: 14, color: C.text }}
                    value={form[key]} onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                    keyboardType={['price','stock','minStock'].includes(key) ? 'numeric' : 'default'} />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {editing && <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: C.dangerBg }} onPress={() => { deleteProduct(editing.id); setModal(false); }}><Text style={{ color: C.danger, fontWeight: '600' }}>Supprimer</Text></TouchableOpacity>}
                <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.primary }} onPress={() => setModal(false)}><Text style={{ color: C.primary, fontWeight: '600' }}>Annuler</Text></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: C.primary }} onPress={save}><Text style={{ color: C.white, fontWeight: '600' }}>Sauvegarder</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── ORDERS SCREEN ────────────────────────────────────────────────────────────
export function OrdersScreen() {
  const { orders, addOrder, updateOrder, deleteOrder } = useStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customerName:'', customerPhone:'', customerWilaya:'', items:'', total:'', notes:'' });

  const STATUS = { pending:{l:'En attente',bg:C.warnBg,c:C.warn}, confirmed:{l:'Confirmé',bg:C.infoBg,c:C.info}, shipped:{l:'Expédié',bg:C.infoBg,c:C.info}, delivered:{l:'Livré',bg:C.successBg,c:C.success}, cancelled:{l:'Annulé',bg:C.dangerBg,c:C.danger} };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="📋 Commandes" sub={`${orders.length} commandes`}
        right={<TouchableOpacity style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }} onPress={() => setModal(true)}><Text style={{ color: C.white, fontWeight: '600', fontSize: 13 }}>+ Ajouter</Text></TouchableOpacity>} />

      <FlatList data={orders} keyExtractor={o => o.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📋</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>Aucune commande</Text>
            <Text style={{ fontSize: 13, color: C.sub, textAlign: 'center', marginTop: 6 }}>Ajoutez vos commandes Octomatic manuellement</Text>
            <TouchableOpacity style={{ marginTop: 16, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }} onPress={() => setModal(true)}>
              <Text style={{ color: C.white, fontWeight: '600' }}>+ Nouvelle commande</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: o }) => {
          const st = STATUS[o.status] || STATUS.pending;
          return (
            <View style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{o.id}</Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>{o.customerName} · {o.customerWilaya}</Text>
                </View>
                <View style={{ backgroundColor: st.bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: st.c }}>{st.l}</Text>
                </View>
              </View>
              {o.items && <Text style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>{o.items}</Text>}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{o.total?.toLocaleString()} DA</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={{ backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }} onPress={() => Linking.openURL(`tel:${o.customerPhone}`)}>
                    <Text style={{ fontSize: 14 }}>📞</Text>
                  </TouchableOpacity>
                  {['pending','confirmed','shipped'].includes(o.status) && (
                    <TouchableOpacity style={{ backgroundColor: C.light, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}
                      onPress={() => { const next = {pending:'confirmed',confirmed:'shipped',shipped:'delivered'}; updateOrder(o.id, { status: next[o.status] }); }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: C.primary }}>
                        {o.status === 'pending' ? 'Confirmer' : o.status === 'confirmed' ? 'Expédier' : 'Livré ✓'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }} />

      <Modal visible={modal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 }}>Nouvelle commande</Text>
            {[['Nom client','customerName'],['Téléphone','customerPhone'],['Wilaya','customerWilaya'],['Produits','items'],['Montant (DA)','total'],['Notes','notes']].map(([lbl,key]) => (
              <View key={key} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.sub, marginBottom: 4 }}>{lbl}</Text>
                <TextInput style={{ backgroundColor: C.bg, borderRadius: 8, borderWidth: 0.5, borderColor: C.border, paddingHorizontal: 12, height: 44, fontSize: 14, color: C.text }}
                  value={form[key]} onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  keyboardType={key === 'total' ? 'numeric' : key === 'customerPhone' ? 'phone-pad' : 'default'} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.primary }} onPress={() => setModal(false)}>
                <Text style={{ color: C.primary, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: C.primary }}
                onPress={() => { addOrder({ customerName:form.customerName, customerPhone:form.customerPhone, customerWilaya:form.customerWilaya, items:form.items, total:parseInt(form.total)||0, notes:form.notes, status:'pending' }); setModal(false); setForm({ customerName:'',customerPhone:'',customerWilaya:'',items:'',total:'',notes:'' }); }}>
                <Text style={{ color: C.white, fontWeight: '600' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const { products, orders, returns, parcels, getOut, getLow } = useStore();
  const out = getOut();
  const low = getLow();
  const delivered = orders.filter(o => o.status === 'delivered');
  const revenue = delivered.reduce((a, o) => a + (o.total || 0), 0);
  const livres = parcels.filter(p => p.status === 'Livré').length;
  const enRoute = parcels.filter(p => p.status === 'En livraison').length;
  const week = [42, 58, 37, 51, 63, 48, 30];
  const maxW = Math.max(...week);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="📊 Dashboard" sub="Vue d'ensemble Payacha" />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>

        {/* KPIs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {[
            [orders.length, 'Commandes', C.text],
            [(revenue/1000).toFixed(0)+'K', 'CA (DA)', C.success],
            [parcels.length, 'Colis Guepex', C.info],
            [livres, 'Livrés', C.success],
          ].map(([v, l, c]) => (
            <View key={l} style={{ width: '48%', backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12 }}>
              <Text style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>{l}</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: c }}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Guepex Stats */}
        <View style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 10 }}>🚚 Guepex — Livraisons actives</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[['🛵', enRoute, 'En route', C.primary],[' ✅', livres, 'Livrés', C.success],['↩️', parcels.filter(p=>p.status==='Retourné').length, 'Retours', C.danger]].map(([icon, val, lbl, c]) => (
              <View key={lbl} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: c }}>{val}</Text>
                <Text style={{ fontSize: 11, color: C.sub }}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Alertes stock */}
        {(out.length > 0 || low.length > 0) && (
          <>
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              ⚠️ Alertes stock ({out.length + low.length})
            </Text>
            {out.slice(0, 3).map(p => (
              <View key={p.id} style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: C.danger }}>
                <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{p.name}</Text><Text style={{ fontSize: 11, color: C.danger }}>Rupture</Text></View>
              </View>
            ))}
            {low.slice(0, 2).map(p => (
              <View key={p.id} style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: C.warn }}>
                <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{p.name}</Text><Text style={{ fontSize: 11, color: C.warn }}>{p.stock} unité(s)</Text></View>
              </View>
            ))}
          </>
        )}

        {/* Graphe */}
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 }}>Ventes 7 derniers jours</Text>
        <View style={{ backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {week.map((v, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 10, color: C.sub, fontWeight: '600' }}>{v}</Text>
                <View style={{ width: '100%', height: Math.round((v / maxW) * 60), backgroundColor: i === 4 ? C.primary2 : i === 5 ? C.primary : C.light, borderRadius: 4 }} />
                <Text style={{ fontSize: 10, color: C.sub }}>{['L','M','M','J','V','S','D'][i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
