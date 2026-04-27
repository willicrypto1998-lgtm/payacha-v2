import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore } from './store';

import ScannerScreen from './screens/ScannerScreen';
import StockScreen from './screens/StockScreen';
import GuepexScreen from './screens/GuepexScreen';
import OrdersScreen from './screens/OrdersScreen';
import DashboardScreen from './screens/DashboardScreen';

const Tab = createBottomTabNavigator();
const C = { primary: '#085041', light: '#E1F5EE', white: '#fff', gray: '#9CA3AF' };

const ICONS = {
  Scanner: '📷', Stock: '📦',
  Guepex: '🚚', Commandes: '📋', Dashboard: '📊'
};

function TabIcon({ name, focused, badge }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={focused ? {
        backgroundColor: C.light, borderRadius: 14,
        width: 30, height: 30, alignItems: 'center', justifyContent: 'center'
      } : { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18 }}>{ICONS[name]}</Text>
      </View>
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -2, right: -4,
          backgroundColor: '#E24B4A', borderRadius: 8,
          minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const { getOut, getLow, orders, parcels } = useStore();
  const stockAlerts = getOut().length + getLow().length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeDeliveries = parcels.filter(p =>
    !['Livré', 'Retourné', 'Annulé'].includes(p.status)
  ).length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: C.primary,
              tabBarInactiveTintColor: C.gray,
              tabBarStyle: {
                paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                paddingTop: 6,
                height: Platform.OS === 'ios' ? 82 : 62,
                borderTopWidth: 0.5,
                borderTopColor: '#E5E7EB',
                backgroundColor: '#fff',
              },
              tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
            }}>
            <Tab.Screen name="Scanner" component={ScannerScreen}
              options={{ tabBarIcon: ({ focused }) => <TabIcon name="Scanner" focused={focused} /> }} />
            <Tab.Screen name="Stock" component={StockScreen}
              options={{ tabBarIcon: ({ focused }) => <TabIcon name="Stock" focused={focused} badge={stockAlerts} /> }} />
            <Tab.Screen name="Guepex" component={GuepexScreen}
              options={{ tabBarIcon: ({ focused }) => <TabIcon name="Guepex" focused={focused} badge={activeDeliveries} /> }} />
            <Tab.Screen name="Commandes" component={OrdersScreen}
              options={{ tabBarIcon: ({ focused }) => <TabIcon name="Commandes" focused={focused} badge={pendingOrders} /> }} />
            <Tab.Screen name="Dashboard" component={DashboardScreen}
              options={{ tabBarIcon: ({ focused }) => <TabIcon name="Dashboard" focused={focused} /> }} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
