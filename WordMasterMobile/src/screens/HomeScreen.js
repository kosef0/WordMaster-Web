import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';

const HomeScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { categories, loading, error } = useSelector(state => state.words);
  const { user, profile } = useSelector(state => state.auth);
  const [selectingCategoryForGame, setSelectingCategoryForGame] = useState(false);
  const [gameId, setGameId] = useState(null);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    // Oyun için kategori seçme modunu kontrol et
    if (route.params?.selectCategoryForGame) {
      setSelectingCategoryForGame(true);
      setGameId(route.params.gameId);
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        'Kategori Seçin',
        'Lütfen oyun için bir kelime kategorisi seçin.',
        [{ text: 'Tamam' }]
      );
    }
  }, [route.params]);

  const handleCategoryPress = (category) => {
    if (selectingCategoryForGame && gameId) {
      // Oyun için kategori seçildi, oyun ekranına yönlendir
      navigation.navigate('WordGame', { 
        gameType: gameId,
        categoryId: category.id 
      });
      
      // Seçim modunu sıfırla
      setSelectingCategoryForGame(false);
      setGameId(null);
    } else {
      // Normal kategori seçimi
      navigation.navigate('CategoryWords', { category });
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryCard,
        selectingCategoryForGame && styles.categoryCardSelecting
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/100' }} 
        style={styles.categoryImage}
      />
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      {selectingCategoryForGame && (
        <View style={styles.selectBadge}>
          <Text style={styles.selectBadgeText}>Seç</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderQuickAccessItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.quickAccessItem}
      onPress={() => navigation.navigate(item.screen, item.params)}
    >
      <View style={[styles.quickAccessIcon, { backgroundColor: item.color }]}>
        <Text style={styles.quickAccessIconText}>{item.icon}</Text>
      </View>
      <Text style={styles.quickAccessText}>{item.title}</Text>
    </TouchableOpacity>
  );

  const quickAccessItems = [
    { id: '1', title: 'Kelimelerim', icon: '📚', color: '#4cc9f0', screen: 'MyWords' },
    { id: '2', title: 'Quizler', icon: '❓', color: '#f77f00', screen: 'Statistics' },
    { id: '3', title: 'Oyunlar', icon: '🎮', color: '#7209b7', screen: 'Games' },
    { id: '4', title: 'İstatistikler', icon: '📊', color: '#38b000', screen: 'Statistics' },
  ];

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Kategori Seçim Modu Bildirimi */}
      {selectingCategoryForGame && (
        <View style={styles.selectionModeContainer}>
          <Text style={styles.selectionModeText}>
            Oyun için kategori seçin
          </Text>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setSelectingCategoryForGame(false);
              setGameId(null);
            }}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Normal mod - kullanıcı bilgisi ve hızlı erişim */}
      {!selectingCategoryForGame && (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Merhaba, {user?.first_name || 'Kullanıcı'}</Text>
              <Text style={styles.subtitle}>Bugün ne öğrenmek istersin?</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image 
                source={{ uri: profile?.profile_pic || 'https://via.placeholder.com/50' }} 
                style={styles.profilePic}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <FlatList
            data={quickAccessItems}
            renderItem={renderQuickAccessItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessList}
          />

          <Text style={styles.sectionTitle}>İlerleme Durumu</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View>
                <Text style={styles.progressLabel}>Seviye</Text>
                <Text style={styles.progressValue}>{profile?.level || 1}</Text>
              </View>
              <View>
                <Text style={styles.progressLabel}>Puan</Text>
                <Text style={styles.progressValue}>{profile?.points || 0}</Text>
              </View>
              <View>
                <Text style={styles.progressLabel}>Öğrenilen</Text>
                <Text style={styles.progressValue}>0</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Kategoriler */}
      <Text style={styles.sectionTitle}>
        {selectingCategoryForGame ? 'Kategori Seçin' : 'Kelime Kategorileri'}
      </Text>
      {error ? (
        <Text style={styles.errorText}>Kategoriler yüklenirken bir hata oluştu.</Text>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.categoriesList}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
    marginTop: SPACING.m,
  },
  greeting: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: SPACING.m,
  },
  quickAccessList: {
    paddingBottom: SPACING.m,
  },
  quickAccessItem: {
    alignItems: 'center',
    marginRight: SPACING.l,
    width: 80,
  },
  quickAccessIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    ...SHADOWS.medium,
  },
  quickAccessIconText: {
    fontSize: SIZES.large,
  },
  quickAccessText: {
    fontSize: SIZES.small,
    color: COLORS.text,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    ...SHADOWS.small,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  progressValue: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  categoriesList: {
    paddingBottom: SPACING.xl,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.m,
    margin: SPACING.xs,
    ...SHADOWS.small,
  },
  categoryCardSelecting: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  categoryImage: {
    width: '100%',
    height: 100,
    borderRadius: SIZES.base,
    marginBottom: SPACING.s,
  },
  categoryName: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categoryDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: SPACING.m,
  },
  selectionModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    marginBottom: SPACING.m,
  },
  selectionModeText: {
    color: '#fff',
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.m,
    borderRadius: SIZES.base,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: SIZES.small,
    fontWeight: 'bold',
  },
  selectBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
  },
  selectBadgeText: {
    color: '#fff',
    fontSize: SIZES.small,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 