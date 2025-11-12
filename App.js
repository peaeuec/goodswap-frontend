import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// --- React Native Paper Imports ---
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
  Appbar,
  TextInput,
  Button,
  Text,
  Card,
  IconButton,
  Divider
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// ------------------------------------

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// --- IMPORTANT ---
// (Your firebaseConfig and NGROK_URL)
const firebaseConfig = {
  apiKey: "AIzaSyD9P4tkoPYckBT1FWBB9aA_b3xQS1MNTnw",
  authDomain: "goodswap-os.firebaseapp.com",
  projectId: "goodswap-os",
  storageBucket: "goodswap-os.firebasestorage.app",
  messagingSenderId: "611695200531",
  appId: "1:611695200531:web:eb3d973aa2e3810583b2e6",
  measurementId: "G-HBQGBD4NKT"
};
const YOUR_NGROK_URL = 'https://inflectional-ardelia-monochromatically.ngrok-free.dev';
// ---------------

// --- Initialize Firebase ---
const FIREBASE_APP = initializeApp(firebaseConfig);
const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const FIREBASE_DB = getFirestore(FIREBASE_APP);
// ---------------------------

// --- React Native Paper Theme ---
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
  },
};
// --------------------------------

function GoodSwapApp() {
  // --- State Variables ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [itemToReceive, setItemToReceive] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('items');
  const [myTrades, setMyTrades] = useState([]);
  // ------------------------------------

  // --- Auth & Data Functions ---
  const handleRegister = async () => {
    if (!email || !password || !nickname) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, nickname }), });
      const data = await response.json();
      if (response.ok) { Alert.alert('Success', 'You have registered successfully! Please log in.'); }
      else { Alert.alert('Error', data.message || 'Registration failed.'); }
    } catch (error) { console.error('Registration error:', error); Alert.alert('Error', 'An error occurred during registration.'); }
  };
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;
      const userDocRef = doc(FIREBASE_DB, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) { setUserProfile(userDocSnap.data()); }
      else { setUserProfile({ uid: user.uid, email: user.email, nickname: user.email }); }
      setIsLoggedIn(true);
    } catch (error) { console.error('Login error:', error); Alert.alert('Login Error', 'Invalid email or password.'); }
  };
  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      setIsLoggedIn(false); setUserProfile(null); setItems([]); setMyTrades([]); setCurrentScreen('items');
    } catch (error) { console.error('Logout error:', error); Alert.alert('Error', 'Failed to log out.'); }
  };
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/items`); const data = await response.json(); setItems(data);
    } catch (error) { console.error('Error fetching items:', error); } finally { setLoading(false); }
  };
  const handleAddItem = async () => {
    if (!userProfile) { Alert.alert('Error', 'You must be logged in.'); return; }
    if (!newItemName || !newItemDescription) { Alert.alert('Error', 'Please fill out fields.'); return; }
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName: newItemName, description: newItemDescription, ownerUid: userProfile.uid, ownerEmail: userProfile.email, ownerNickname: userProfile.nickname }), });
      if (response.ok) { Alert.alert('Success', 'Item added!'); setNewItemName(''); setNewItemDescription(''); await fetchItems(); }
      else { const data = await response.json(); Alert.alert('Error', data.message); }
    } catch (error) { console.error('Add item error:', error); Alert.alert('Error', 'An error occurred.'); }
  };
  const openTradeModal = (item) => {
    if (!userProfile) return;
    const myAvailableItems = items.filter(i => i.ownerUid === userProfile.uid && i.status === 'available');
    setMyItems(myAvailableItems); setItemToReceive(item); setModalVisible(true);
  };
  const handleProposeTrade = async (itemToGive) => {
    if (!userProfile || !itemToGive || !itemToReceive) { Alert.alert('Error', 'Something went wrong.'); return; }
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/exchanges`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemToGiveId: itemToGive.id, itemToReceiveId: itemToReceive.id, proposerUid: userProfile.uid, receiverUid: itemToReceive.ownerUid, }), });
      if (response.ok) { Alert.alert('Success!', 'Trade proposal sent.'); setModalVisible(false); await fetchItems(); }
      else { const data = await response.json(); Alert.alert('Error', data.message || 'Failed to propose trade.'); }
    } catch (error) { console.error('Propose trade error:', error); Alert.alert('Error', 'An error occurred.'); }
  };
  const fetchMyTrades = async () => {
    if (!userProfile) return; setLoading(true);
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/my-exchanges/${userProfile.uid}`); const data = await response.json(); setMyTrades(data);
    } catch (error) { console.error('Error fetching trades:', error); } finally { setLoading(false); }
  };
  const handleAcceptTrade = async (exchangeId) => {
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/exchanges/${exchangeId}/accept`, { method: 'POST' });
      if (response.ok) { Alert.alert('Success', 'Trade accepted!'); await fetchMyTrades(); if (currentScreen === 'items') { await fetchItems(); } }
      else { Alert.alert('Error', 'Failed to accept trade.'); }
    } catch (error) { Alert.alert('Error', 'An error occurred.'); }
  };
  const handleRejectTrade = async (exchangeId) => {
    try {
      const response = await fetch(`${YOUR_NGROK_URL}/api/exchanges/${exchangeId}/reject`, { method: 'POST' });
      if (response.ok) { Alert.alert('Success', 'Trade rejected.'); await fetchMyTrades(); if (currentScreen === 'items') { await fetchItems(); } }
      else { Alert.alert('Error', 'Failed to reject trade.'); }
    } catch (error) { Alert.alert('Error', 'An error occurred.'); }
  };
  // ----------------------------------------------------

  useEffect(() => {
    const unsubscribe = FIREBASE_AUTH.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(FIREBASE_DB, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) { setUserProfile(userDocSnap.data()); }
        else { setUserProfile({ uid: user.uid, email: user.email, nickname: user.email }); }
        setIsLoggedIn(true);
      } else { setIsLoggedIn(false); setUserProfile(null); }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      if (currentScreen === 'items') { fetchItems(); }
      else if (currentScreen === 'trades') { fetchMyTrades(); }
    }
  }, [isLoggedIn, currentScreen]);

  // --- Render Auth Screen ---
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.authTitle}>Welcome to GoodSwap</Text>
        <TextInput label="Nickname (for registration)" value={nickname} onChangeText={setNickname} style={styles.input} mode="outlined" left={<TextInput.Icon icon="account-outline" />} />
        <TextInput label="Email" value={email} onChangeText={setEmail} style={styles.input} mode="outlined" keyboardType="email-address" autoCapitalize="none" left={<TextInput.Icon icon="email-outline" />} />
        <TextInput label="Password (6+ characters)" value={password} onChangeText={setPassword} style={styles.input} mode="outlined" secureTextEntry left={<TextInput.Icon icon="lock-outline" />} />
        <Button mode="contained" onPress={handleRegister} style={styles.button}> Register </Button>
        <Button mode="outlined" onPress={handleLogin} style={styles.button}> Login </Button>
      </SafeAreaView>
    );
  }

  // --- Render Main Content ---
  const renderMainContent = () => {
    if (currentScreen === 'trades') {
      return (
        <FlatList
          data={myTrades}
          keyExtractor={item => item.id}
          ListEmptyComponent={ <View style={styles.loadingContainer}><Icon name="swap-horizontal-bold" size={48} color="#aaa" /><Text style={styles.loadingText}>No incoming trade proposals.</Text></View> }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title title="Trade Proposal" />
              <Card.Content>
                <Text style={styles.tradeInfoText}>
                  <Text style={{fontWeight: 'bold'}}>{item.proposerNickname || 'User'}</Text> offers you: <Text style={{fontWeight: 'bold'}}>{item.itemToGiveName}</Text>
                </Text>
                <Text style={styles.tradeInfoText}>
                  In exchange for your: <Text style={{fontWeight: 'bold'}}>{item.itemToReceiveName}</Text>
                </Text>
              </Card.Content>
              <Card.Actions style={styles.tradeResponseContainer}>
                 <Button onPress={() => handleAcceptTrade(item.id)} textColor="green">Accept</Button>
                 <Button onPress={() => handleRejectTrade(item.id)} textColor="red">Reject</Button>
              </Card.Actions>
            </Card>
          )}
        />
      );
    }
    
    // --- Render Items Screen ---
    return (
      <>
        <Card style={styles.addItemCard}>
          <Card.Content>
            <TextInput label="Item Name" value={newItemName} onChangeText={setNewItemName} mode="outlined" dense style={styles.input}/>
            <TextInput label="Item Description" value={newItemDescription} onChangeText={setNewItemDescription} mode="outlined" dense style={styles.input}/>
            <Button mode="contained" onPress={handleAddItem} style={styles.button} icon="plus-circle-outline">
                 Add My Item
            </Button>
          </Card.Content>
        </Card>
        <FlatList
          data={items}
          renderItem={({ item }) => {
            const isMyItem = item.ownerUid === userProfile.uid;
            return (
              <Card style={styles.card}>
                <Card.Content>
                   <View style={styles.itemHeader}>
                     <Text variant="titleLarge">{item.itemName}</Text>
                     <Text variant="bodySmall" style={[styles.itemStatusChip, item.status === 'available' ? styles.availableChip : styles.lockedChip]}>{item.status}</Text>
                   </View>
                   <Text variant="bodyMedium" style={styles.itemDescription}>{item.description}</Text>
                   
                   {/* --- THIS IS THE CORRECTED PART --- */}
                   <View style={styles.itemOwnerContainer}>
                     <Icon name="account-outline" size={14} color={theme.colors.primary} />
                     <Text variant="bodySmall" style={styles.itemOwnerText}>
                       Owner: {item.ownerNickname || item.ownerEmail || 'Unknown'}
                     </Text>
                   </View>
                   {/* ---------------------------------- */}

                 </Card.Content>
                {!isMyItem && item.status === 'available' && (
                  <Card.Actions>
                    <Button mode="contained" icon="swap-horizontal" onPress={() => openTradeModal(item)}>
                        Propose Trade
                    </Button>
                  </Card.Actions>
                )}
              </Card>
            );
          }}
          keyExtractor={item => item.id}
          style={styles.list}
          ListEmptyComponent={ <View style={styles.loadingContainer}><Icon name="package-variant-closed" size={48} color="#aaa" /><Text style={styles.loadingText}>No items found.</Text></View> }
        />
      </>
    );
  };

  // --- Render Main App Screen ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface}/>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title={userProfile ? `${userProfile.nickname}'s GoodSwap` : 'GoodSwap'} titleStyle={styles.title} />
        <Appbar.Action icon="logout" onPress={handleLogout} color="red" />
      </Appbar.Header>
      
      <View style={styles.screenToggleContainer}>
        <TouchableOpacity style={[styles.screenToggleButton, currentScreen === 'items' && styles.screenToggleButtonActive]} onPress={() => setCurrentScreen('items')}>
          <Text style={[styles.screenToggleText, currentScreen === 'items' && styles.screenToggleTextActive]}>All Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.screenToggleButton, currentScreen === 'trades' && styles.screenToggleButtonActive]} onPress={() => setCurrentScreen('trades')}>
          <Text style={[styles.screenToggleText, currentScreen === 'trades' && styles.screenToggleTextActive]}>My Trades</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}> <ActivityIndicator size="large" color={theme.colors.primary} /> </View>
      ) : ( renderMainContent() )}

      {/* --- Trade Proposal Modal --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your Item to Trade</Text>
                <IconButton icon="close" size={24} onPress={() => setModalVisible(false)} style={styles.modalCloseButton} />
            </View>
            <Text style={styles.modalSubTitle}> You want: {itemToReceive ? itemToReceive.itemName : ''} </Text>
            <Text style={styles.modalSubTitle}> (from: {itemToReceive ? (itemToReceive.ownerNickname || itemToReceive.ownerEmail || 'Unknown') : ''}) </Text>
            <Divider style={styles.divider}/>
            <FlatList
              data={myItems}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.loadingText}>You have no available items to trade.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleProposeTrade(item)}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemDescriptionModal}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Main App wrapper ---
export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <GoodSwapApp />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

// --- Stylesheet ---
// (Updated with new styles for the icon fix)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  input: { marginBottom: 12 },
  button: { marginVertical: 8, paddingVertical: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  authTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: theme.colors.primary },
  addItemCard: { margin: 16, marginBottom: 8 },
  list: { flex: 1 },
  card: { marginVertical: 8, marginHorizontal: 16, },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, },
  itemStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', alignSelf: 'flex-start' },
  availableChip: { backgroundColor: '#c8e6c9', color: '#2e7d32', },
  lockedChip: { backgroundColor: '#ffecb3', color: '#ff8f00', },
  itemName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  itemDescription: { fontSize: 14, color: '#555', marginTop: 4 },
  itemDescriptionModal: { fontSize: 13, color: '#777', marginTop: 2 },
  
  // --- CORRECTED STYLES FOR ICON ---
  itemOwnerContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemOwnerText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4, // Space between icon and text
  },
  // ---------------------------------

  itemStatus: { fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#888' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 0, maxHeight: '75%', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, overflow: 'hidden', },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalCloseButton: { margin: -8, },
  modalSubTitle: { fontSize: 16, color: '#555', paddingHorizontal: 24, marginBottom: 8 },
  divider: { marginVertical: 8, marginHorizontal: 24 },
  modalItem: { padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 10, marginHorizontal: 24 },
  screenToggleContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: theme.colors.surface, paddingVertical: 10, elevation: 2, },
  screenToggleButton: { padding: 10, borderRadius: 8 },
  screenToggleButtonActive: { backgroundColor: theme.colors.primaryContainer },
  screenToggleText: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
  screenToggleTextActive: { color: theme.colors.onPrimaryContainer },
  tradeResponseContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, },
  tradeInfoText: {
    fontSize: 15,
    marginBottom: 5,
  }
});