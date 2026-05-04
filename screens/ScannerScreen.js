import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Vibration, Modal, ActivityIndicator, Linking,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useStore, GuepexAPI, GUEPEX_STATUS } from '../store';

const C = {
  primary:'#085041', light:'#E1F5EE', white:'#fff', bg:'#F4F6F5',
  card:'#fff', border:'#E5E7EB', text:'#111827', sub:'#6B7280',
  danger:'#A32D2D', dangerBg:'#FCEBEB', warn:'#854F0B', warnBg:'#FAEEDA',
  success:'#3B6D11', successBg:'#EAF3DE', info:'#185FA5', infoBg:'#E6F1FB',
};

function parseGuepexQR(code) {
  if (!code) return null;
  if (code.includes(',')) {
    const parts = code.split(',');
    const tracking = parts.find(p => /yal-|^GX|^YL/i.test(p)) || parts[1];
    if (tracking) {
      return {
        tracking: tracking.trim(),
        customerPhone: parts.find(p => /^0[5-7]\d{8}$/.test(p.trim()))?.trim(),
        customerName: parts[3]?.trim(),
        rawData: code,
      };
    }
  }
  if (/^[A-Z]{2,4}\d{6,}/i.test(code)) return { tracking: code.trim(), rawData: code };
  return null;
}

export default function ScannerScreen() {
  const [hasPerm, setHasPerm] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(null);
  const [guepex, setGuepex] = useState(null);
  const [manual, setManual] = useState('');
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [reason, setReason] = useState('wrong_size');
  const [retAction, setRetAction] = useState('restock');
  const [loading, setLoading] = useState(false);
  const { getByEAN, getBySKU, adjustStock, addReturn, updateParcel } = useStore();

  React.useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPerm(status === 'granted'));
  }, []);

  const lookup = async (code) => {
    setScanning(false);
    setFound(null); setGuepex(null); setConfirmed(false); setAction(null);

    // 1. Guepex QR ?
    const gData = parseGuepexQR(code);
    if (gData) {
      setLoading(true);
      const info = await GuepexAPI.trackParcel(gData.tracking);
      setLoading(false);
      setGuepex({ ...gData, status: info.status, history: info.history || [], error: info.error });
      return;
    }

    // 2. Produit stock
    const p = getByEAN(code) || getBySKU(code);
    if (p) { setFound(p); setQty(1); return; }

    Alert.alert('Non reconnu', `Code non trouvé dans le stock ni dans Guepex.\n\n${code.substring(0, 80)}`);
  };

  const confirmStock = () => {
    if (!found || !action) return;
    if (action === 'return') { setShowReturn(true); return; }
    adjustStock(found.id, qty, action, 'scan');
    setConfirmed(true);
    Vibration.vibrate([0,60,60,60]);
  };

  const confirmReturn = () => {
    addReturn(found.id, found.name, qty, reason, retAction);
    setShowReturn(false); setConfirmed(true);
    Vibration.vibrate([0,60,60,60]);
  };

  const handleGuepexReturn = () => {
    updateParcel(guepex.tracking, { status: 'Retourné' });
    Vibration.vibrate([0,60,60,60]);
    Alert.alert('↩️ Retour enregistré', `Colis ${guepex.tracking} marqué retourné.\n\nVoulez-vous scanner un produit à remettre en stock ?`,
      [{ text: 'Non', onPress: () => setGuepex(null) },
       { text: 'Oui — scanner', onPress: () => { setGuepex(null); setScanning(true); }}]);
  };

  const reset = () => { setFound(null); setGuepex(null); setManual(''); setQty(1); setAction(null); setConfirmed(false); };

  const si = guepex ? (GUEPEX_STATUS[guepex.status] || { icon:'📦', color:C.sub, bg:C.bg }) : null;

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>
      <View style={{ backgroundColor:C.primary, paddingHorizontal:16, paddingTop:52, paddingBottom:14 }}>
        <Text style={{ fontSize:20, fontWeight:'700', color:C.white }}>📷 Scanner</Text>
        <Text style={{ fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2 }}>Produits · Retours Guepex</Text>
      </View>

      <ScrollView style={{ flex:1, padding:12 }} contentContainerStyle={{ paddingBottom:60 }}>

        {/* Caméra */}
        <View style={{ height:200, borderRadius:16, overflow:'hidden', backgroundColor:'#0a1628', marginBottom:10 }}>
          {scanning && hasPerm ? (
            <BarCodeScanner onBarCodeScanned={({ data }) => { Vibration.vibrate(80); lookup(data); }} style={StyleSheet.absoluteFillObject}>
              <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
                <View style={{ width:200, height:140, position:'relative' }}>
                  <View style={[s.c, { top:0, left:0, borderTopWidth:3, borderLeftWidth:3 }]} />
                  <View style={[s.c, { top:0, right:0, borderTopWidth:3, borderRightWidth:3 }]} />
                  <View style={[s.c, { bottom:0, left:0, borderBottomWidth:3, borderLeftWidth:3 }]} />
                  <View style={[s.c, { bottom:0, right:0, borderBottomWidth:3, borderRightWidth:3 }]} />
                </View>
                <Text style={{ color:'rgba(255,255,255,0.8)', fontSize:13, marginTop:10 }}>Produit ou QR Guepex</Text>
                <TouchableOpacity onPress={() => setScanning(false)} style={{ marginTop:8, backgroundColor:'rgba(0,0,0,0.5)', borderRadius:20, paddingHorizontal:18, paddingVertical:7 }}>
                  <Text style={{ color:'#fff', fontSize:13 }}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </BarCodeScanner>
          ) : (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:6 }}>
              <Text style={{ color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:'600' }}>Appuyez sur Scanner</Text>
              <Text style={{ color:'rgba(255,255,255,0.45)', fontSize:11 }}>EAN · QR Guepex · SKU</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
          <TouchableOpacity style={{ flex:1, backgroundColor:C.primary, borderRadius:12, paddingVertical:12, alignItems:'center' }} onPress={() => setScanning(true)}>
            <Text style={{ color:C.white, fontWeight:'600' }}>📷 Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex:1, backgroundColor:C.card, borderRadius:12, paddingVertical:12, alignItems:'center', borderWidth:0.5, borderColor:C.border }}
            onPress={() => lookup('13,yal-CW90LW,1304,Payacha (divers),0542429840')}>
            <Text style={{ color:C.text, fontWeight:'600' }}>🚚 Démo Guepex</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
          <TextInput style={{ flex:1, backgroundColor:C.white, borderRadius:10, borderWidth:0.5, borderColor:C.border, paddingHorizontal:12, fontSize:13, color:C.text, height:44 }}
            value={manual} onChangeText={setManual} placeholder="SKU, EAN ou tracking Guepex..." placeholderTextColor={C.sub}
            returnKeyType="search" onSubmitEditing={() => { lookup(manual); setManual(''); }} />
          <TouchableOpacity style={{ backgroundColor:C.primary, borderRadius:10, paddingHorizontal:16, alignItems:'center', justifyContent:'center', height:44 }}
            onPress={() => { lookup(manual); setManual(''); }}>
            <Text style={{ color:C.white, fontWeight:'700' }}>OK</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ backgroundColor:C.white, borderRadius:12, padding:24, alignItems:'center', borderWidth:0.5, borderColor:C.border }}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color:C.sub, marginTop:10 }}>Vérification Guepex...</Text>
          </View>
        )}

        {/* Résultat Guepex */}
        {guepex && !loading && (
          <View style={{ backgroundColor:C.white, borderRadius:12, borderWidth:0.5, borderColor:C.border, padding:14 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 }}>
              <View style={{ width:44, height:44, borderRadius:12, backgroundColor:C.infoBg, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:24 }}>🚚</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:14, fontWeight:'700', color:C.primary }}>Colis Guepex</Text>
                <Text style={{ fontSize:12, fontFamily:'Courier', color:C.text }}>{guepex.tracking}</Text>
              </View>
            </View>

            <View style={{ backgroundColor:si.bg, borderRadius:10, padding:12, flexDirection:'row', gap:10, alignItems:'center', marginBottom:12 }}>
              <Text style={{ fontSize:28 }}>{si.icon}</Text>
              <View>
                <Text style={{ fontSize:15, fontWeight:'700', color:si.color }}>{guepex.status || 'Inconnu'}</Text>
                {guepex.customerName && <Text style={{ fontSize:12, color:C.sub }}>{guepex.customerName}</Text>}
                {guepex.customerPhone && <Text style={{ fontSize:12, color:C.sub }}>{guepex.customerPhone}</Text>}
              </View>
            </View>

            {guepex.error && (
              <View style={{ backgroundColor:C.warnBg, borderRadius:8, padding:10, marginBottom:10 }}>
                <Text style={{ fontSize:12, color:C.warn }}>⚠️ Statut indisponible en ligne. Colis identifié localement.</Text>
              </View>
            )}

            {guepex.history?.length > 0 && (
              <View style={{ marginBottom:12 }}>
                <Text style={{ fontSize:11, fontWeight:'600', color:C.sub, marginBottom:6 }}>HISTORIQUE</Text>
                {guepex.history.slice(0,3).map((h,i) => (
                  <View key={i} style={{ flexDirection:'row', gap:8, marginBottom:6, alignItems:'flex-start' }}>
                    <View style={{ width:8, height:8, borderRadius:4, backgroundColor:i===0?C.primary:C.border, marginTop:4 }} />
                    <View>
                      <Text style={{ fontSize:12, fontWeight:'600', color:C.text }}>{h.status}</Text>
                      {h.date && <Text style={{ fontSize:11, color:C.sub }}>{h.date}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
              <TouchableOpacity style={{ flex:2, backgroundColor:C.dangerBg, borderRadius:10, padding:12, alignItems:'center' }} onPress={handleGuepexReturn}>
                <Text style={{ fontSize:18 }}>↩️</Text>
                <Text style={{ fontSize:12, fontWeight:'600', color:C.danger }}>Retour client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, backgroundColor:C.light, borderRadius:10, padding:12, alignItems:'center' }}
                onPress={() => guepex.customerPhone && Linking.openURL(`tel:${guepex.customerPhone}`)}>
                <Text style={{ fontSize:18 }}>📞</Text>
                <Text style={{ fontSize:11, fontWeight:'600', color:C.primary }}>Appeler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, backgroundColor:C.successBg, borderRadius:10, padding:12, alignItems:'center' }}
                onPress={() => {
                  const phone = guepex.customerPhone?.replace(/^0/,'213')||'';
                  Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(`Bonjour, votre colis ${guepex.tracking} - ${guepex.status}`)}`);
                }}>
                <Text style={{ fontSize:18 }}>💬</Text>
                <Text style={{ fontSize:11, fontWeight:'600', color:C.success }}>WA</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ borderWidth:1, borderColor:C.border, borderRadius:10, paddingVertical:10, alignItems:'center' }} onPress={reset}>
              <Text style={{ fontSize:13, color:C.sub }}>Nouveau scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confirmation */}
        {confirmed && (
          <View style={{ backgroundColor:C.white, borderRadius:12, borderWidth:0.5, borderColor:C.border, padding:20, alignItems:'center' }}>
            <Text style={{ fontSize:36, marginBottom:8 }}>{action==='return'?'↩️':action==='out'?'📤':'✅'}</Text>
            <Text style={{ fontSize:16, fontWeight:'700', color:C.text, marginBottom:4 }}>
              {action==='return'?'Retour enregistré':action==='out'?'Sortie confirmée':'Stock mis à jour'}
            </Text>
            <Text style={{ fontSize:13, color:C.sub }}>{action==='out'?`−${qty}`:`+${qty}`} · {found?.name}</Text>
            <TouchableOpacity style={{ marginTop:14, backgroundColor:C.primary, borderRadius:10, paddingHorizontal:24, paddingVertical:10 }} onPress={reset}>
              <Text style={{ color:C.white, fontWeight:'600' }}>Nouveau scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Produit trouvé */}
        {found && !confirmed && (
          <View style={{ backgroundColor:C.white, borderRadius:12, borderWidth:0.5, borderColor:C.border, padding:12 }}>
            <View style={{ flexDirection:'row', gap:12, marginBottom:12 }}>
              <View style={{ width:48, height:48, borderRadius:12, backgroundColor:C.light, alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:24 }}>{found.emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'700', color:C.text }}>{found.name}</Text>
                <Text style={{ fontSize:11, color:C.sub }}>{found.sku}</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:16, marginBottom:12 }}>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:20, fontWeight:'700', color:found.stock===0?C.danger:found.stock<=found.minStock?C.warn:C.success }}>{found.stock}</Text>
                <Text style={{ fontSize:10, color:C.sub }}>stock</Text>
              </View>
              <View style={{ alignItems:'center' }}>
                <Text style={{ fontSize:20, fontWeight:'700', color:C.text }}>{found.price?.toLocaleString()}</Text>
                <Text style={{ fontSize:10, color:C.sub }}>DA</Text>
              </View>
            </View>
            <View style={{ borderTopWidth:0.5, borderTopColor:C.border, paddingTop:10, marginBottom:10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:16 }}>
                <TouchableOpacity style={{ width:36, height:36, borderRadius:18, borderWidth:0.5, borderColor:C.border, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}
                  onPress={() => setQty(q => Math.max(1,q-1))}>
                  <Text style={{ fontSize:22 }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize:26, fontWeight:'700', color:C.text, minWidth:40, textAlign:'center' }}>{qty}</Text>
                <TouchableOpacity style={{ width:36, height:36, borderRadius:18, borderWidth:0.5, borderColor:C.border, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' }}
                  onPress={() => setQty(q => q+1)}>
                  <Text style={{ fontSize:22 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
              {[['in','📥 Entrée',C.primary],['return','↩️ Retour',C.info],['out','📤 Sortie',C.warnBg]].map(([val,lbl,bg]) => (
                <TouchableOpacity key={val} style={{ flex:1, borderRadius:10, padding:10, alignItems:'center', backgroundColor:action===val?bg:C.bg }} onPress={() => setAction(val)}>
                  <Text style={{ fontSize:11, fontWeight:'600', color:action===val?C.white:C.sub }}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {action && (
              <TouchableOpacity style={{ backgroundColor:C.primary, borderRadius:12, paddingVertical:12, alignItems:'center' }} onPress={confirmStock}>
                <Text style={{ color:C.white, fontWeight:'700' }}>Confirmer — {action==='out'?`−${qty}`:`+${qty}`} unité(s)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showReturn} transparent animationType="slide">
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' }}>
          <View style={{ backgroundColor:C.white, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 }}>
            <Text style={{ fontSize:18, fontWeight:'700', color:C.text, marginBottom:4 }}>↩️ Retour produit</Text>
            <Text style={{ fontSize:13, color:C.sub, marginBottom:14 }}>{found?.name}</Text>
            {[['wrong_size','Mauvaise taille'],['defect','Défaut produit'],['changed_mind',"Changement d'avis"],['damaged','Endommagé']].map(([v,l]) => (
              <TouchableOpacity key={v} style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:8, borderWidth:0.5, borderColor:reason===v?C.primary:C.border, backgroundColor:reason===v?C.light:C.bg, marginBottom:6 }} onPress={() => setReason(v)}>
                <View style={{ width:16, height:16, borderRadius:8, borderWidth:2, borderColor:reason===v?C.primary:C.border, backgroundColor:reason===v?C.primary:'transparent' }} />
                <Text style={{ fontSize:13, color:C.text }}>{l}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection:'row', gap:8, marginTop:10, marginBottom:14 }}>
              {[['restock','✅ Remettre en stock'],['discard','🗑 Écarter']].map(([v,l]) => (
                <TouchableOpacity key={v} style={{ flex:1, padding:10, borderRadius:10, borderWidth:1, borderColor:retAction===v?C.primary:C.border, backgroundColor:retAction===v?C.light:C.bg, alignItems:'center' }} onPress={() => setRetAction(v)}>
                  <Text style={{ fontSize:12, fontWeight:'600', color:retAction===v?C.primary:C.sub }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection:'row', gap:8 }}>
              <TouchableOpacity style={{ flex:1, borderRadius:12, paddingVertical:12, alignItems:'center', borderWidth:1, borderColor:C.primary }} onPress={() => setShowReturn(false)}>
                <Text style={{ color:C.primary, fontWeight:'600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, borderRadius:12, paddingVertical:12, alignItems:'center', backgroundColor:C.primary }} onPress={confirmReturn}>
                <Text style={{ color:C.white, fontWeight:'600' }}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { position:'absolute', width:22, height:22, borderColor:'#1D9E75', borderStyle:'solid', borderRadius:3 },
});
