import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { styles } from '../appStyles';
import { COSMETIC_CATEGORY_LABELS, type CosmeticCategory } from '../data/cosmetics';
import {
  equipCosmetic,
  groupCosmetics,
  loadEconomyState,
  subscribeEconomy,
  purchaseCosmetic,
  type EconomyInventoryItem,
  type EconomyState,
} from '../services/economy';
import { Section } from './sharedUi';

const CATEGORIES: CosmeticCategory[] = ['character', 'palette', 'frame', 'accessory'];

export function CosmeticShopScreen() {
  const db = useSQLiteContext();
  const [state, setState] = useState<EconomyState | null>(null);
  const [category, setCategory] = useState<CosmeticCategory>('character');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const next = await loadEconomyState(db);
    setState(next);
    setSelectedId((current) => current ?? next.items[0]?.id ?? null);
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const grouped = useMemo(() => groupCosmetics(state?.items ?? []), [state?.items]);
  const selected = state?.items.find((item) => item.id === selectedId) ?? grouped[category][0] ?? null;

  const act = async (item: EconomyInventoryItem) => {
    if (item.owned) {
      const equipped = await equipCosmetic(db, item.id);
      setMessage(equipped ? `${item.name} est maintenant équipé.` : 'Équipement impossible.');
    } else {
      const result = await purchaseCosmetic(db, item.id);
      setMessage(
        result === 'purchased'
          ? `${item.name} rejoint ton inventaire.`
          : result === 'insufficient'
            ? 'Il manque des pièces pour cet objet.'
            : result === 'owned'
              ? 'Cet objet est déjà dans ton inventaire.'
              : 'Objet introuvable.'
      );
    }
    await refresh();
  };

  if (!state) {
    return <ActivityIndicator style={styles.loadingState} size="large" color="#C83543" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.shopHero}>
        <View>
          <Text style={styles.shopKicker}>Personnalisation locale</Text>
          <Text style={styles.shopTitle}>Atelier</Text>
          <Text style={styles.shopSubtitle}>Les objets sont décoratifs et ne bloquent aucun apprentissage.</Text>
        </View>
        <View style={styles.shopWallet}>
          <Text style={styles.shopWalletValue}>{state.balance}</Text>
          <Text style={styles.shopWalletLabel}>pièces</Text>
        </View>
      </View>

      {selected && (
        <View style={[styles.shopPreview, { borderColor: selected.colors[0] }]}>
          <View style={[styles.shopPreviewSymbol, { backgroundColor: selected.colors[1] }]}>
            <Text style={[styles.shopPreviewSymbolText, { color: selected.colors[0] }]}>{selected.symbol}</Text>
          </View>
          <View style={styles.shopPreviewCopy}>
            <Text style={styles.shopPreviewLabel}>Aperçu</Text>
            <Text style={styles.shopPreviewTitle}>{selected.name}</Text>
            <Text style={styles.shopPreviewText}>{selected.description}</Text>
          </View>
          <View style={styles.shopSwatches}>
            {selected.colors.map((color) => <View key={color} style={[styles.shopSwatch, { backgroundColor: color }]} />)}
          </View>
        </View>
      )}

      <View style={styles.shopTabs}>
        {CATEGORIES.map((itemCategory) => (
          <Pressable
            key={itemCategory}
            accessibilityRole="tab"
            accessibilityState={{ selected: category === itemCategory }}
            onPress={() => {
              setCategory(itemCategory);
              setSelectedId(grouped[itemCategory][0]?.id ?? null);
              setMessage('');
            }}
            style={[styles.shopTab, category === itemCategory && styles.shopTabActive]}
          >
            <Text style={[styles.shopTabText, category === itemCategory && styles.shopTabTextActive]}>
              {COSMETIC_CATEGORY_LABELS[itemCategory]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Section title={COSMETIC_CATEGORY_LABELS[category]}>
        <View style={styles.shopGrid}>
          {grouped[category].map((item) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`${item.name}, ${item.owned ? 'possédé' : `${item.price} pièces`}`}
              accessibilityRole="button"
              onPress={() => {
                setSelectedId(item.id);
                setMessage('');
              }}
              style={[styles.shopItem, selectedId === item.id && styles.shopItemSelected]}
            >
              <View style={[styles.shopItemSymbol, { backgroundColor: item.colors[1] }]}>
                <Text style={[styles.shopItemSymbolText, { color: item.colors[0] }]}>{item.symbol}</Text>
              </View>
              <Text style={styles.shopItemTitle}>{item.name}</Text>
              <Text style={styles.shopItemPrice}>{item.equipped ? 'Équipé' : item.owned ? 'Dans l’inventaire' : `${item.price} pièces`}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {!!selected && (
        <Pressable
          accessibilityRole="button"
          disabled={selected.equipped}
          onPress={() => void act(selected)}
          style={[styles.primaryButton, selected.equipped && styles.globalBackButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {selected.equipped ? 'Déjà équipé' : selected.owned ? 'Équiper' : `Acheter · ${selected.price} pièces`}
          </Text>
        </Pressable>
      )}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.shopMessage}>{message}</Text>}
    </ScrollView>
  );
}

export function EquippedCosmeticMark() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<EconomyInventoryItem[]>([]);
  useEffect(() => {
    const load = async () => {
      const next = await loadEconomyState(db);
      setItems(next.items.filter((item) => item.equipped));
    };
    void load();
    return subscribeEconomy(() => void load());
  }, [db]);
  if (!items.length) return null;
  return (
    <View accessibilityLabel={`Cosmétiques équipés : ${items.map((item) => item.name).join(', ')}`} style={styles.equippedCosmeticMark}>
      {items.slice(0, 3).map((item) => (
        <View key={item.id} style={[styles.equippedCosmeticToken, { backgroundColor: item.colors[1], borderColor: item.colors[0] }]}>
          <Text style={[styles.equippedCosmeticText, { color: item.colors[0] }]}>{item.symbol}</Text>
        </View>
      ))}
    </View>
  );
}
