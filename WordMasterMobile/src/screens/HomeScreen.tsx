import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../store/wordSlice';
import { COLORS, SPACING, SIZES, SHADOWS, GRADIENTS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootState, AppDispatch } from '../store';
import { Category, User, Profile } from '../database/db';
import { getCategoryImageByName, getGameImageByType } from '../utils/categoryUtils';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight
} from 'react-native-reanimated';
import AnimatedCard from '../components/AnimatedCard';
import AnimatedButton from '../components/AnimatedButton';

// Tip tanımlamaları
type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  StackScreenProps<RootStackParamList>
>;

type QuickAccessItem = {
  id: string;
  title: string;
  icon: string;
  color: string;
  screen: keyof RootStackParamList;
  params?: any;
};

type GameItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gameType: string;
};

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { categories, loading, error } = useSelector((state: RootState) => state.words);
  const { user, profile } = useSelector((state: RootState) => state.auth);
  const [selectingCategoryForGame, setSelectingCategoryForGame] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  
  // Animasyon değerleri
  const progressWidth = useSharedValue(0);
  const streakScale = useSharedValue(1);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    // Önerilen kategorileri ayarla
    if (categories.length > 0) {
      // İlk 4 kategoriyi önerilen olarak göster
      setFeaturedCategories(categories.slice(0, 4));
    }
  }, [categories]);

  useEffect(() => {
    // Animasyonları başlat
    progressWidth.value = withTiming(0.4, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    
    // Streak animasyonu
    streakScale.value = withRepeat(
      withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // Animasyon stilleri
  const progressAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value * 100}%`,
    };
  });

  const streakAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: streakScale.value }],
    };
  });

  useEffect(() => {
    // Oyun için kategori seçme modunu kontrol et
    if (route.params?.selectCategoryForGame) {
      setSelectingCategoryForGame(true);
      setGameId(route.params.gameId || null);
      
      // Kullanıcıya bilgi ver
      Alert.alert(
        'Kategori Seçin',
        'Lütfen oyun için bir kelime kategorisi seçin.',
        [{ text: 'Tamam' }]
      );
    }
  }, [route.params]);

  const handleCategoryPress = (category: Category) => {
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

  // Oyun kartına tıklandığında
  const handleGamePress = (gameType: string) => {
    if (categories.length > 0) {
      // Direkt olarak oyun ekranına yönlendir
      navigation.navigate('WordGame', {
        gameType: gameType,
        categoryId: categories[0].id // Varsayılan olarak ilk kategoriyi kullan
      });
    } else {
      Alert.alert(
        'Hata',
        'Oyun için kategoriler yüklenemedi. Lütfen daha sonra tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    }
  };

  // Kategori kelimeleri öğrenme ekranına git
  const handleLearnPress = (category: Category) => {
    navigation.navigate('WordLearning', { category });
  };

  // Kategori kartları renderı
  const renderFeaturedCategoryItem = ({ item, index }: { item: Category, index: number }) => {
    return (
      <Animated.View
        entering={FadeInRight.delay(index * 100).duration(500)}
      >
        <AnimatedCard
          variant="gradient"
          gradientColors={[COLORS[`level${(index % 5) + 1}`], COLORS.background]}
          onPress={() => handleCategoryPress(item)}
          style={styles.featuredCategoryCard}
        >
          <Image 
            source={{ uri: getCategoryImageByName(item.name) }} 
            style={styles.featuredCategoryImage}
            resizeMode="cover"
          />
          <Text style={styles.featuredCategoryName}>{item.name}</Text>
          <Text style={styles.featuredCategoryDescription} numberOfLines={2}>
            {item.name} kategorisindeki kelimeler
          </Text>
          <AnimatedButton
            text="Kelimeleri Gör"
            onPress={() => handleLearnPress(item)}
            size="small"
            icon="book-outline"
            iconPosition="left"
            style={styles.seeWordsButton}
          />
        </AnimatedCard>
      </Animated.View>
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
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

  const popularGames: GameItem[] = [
    { 
      id: '1', 
      title: 'Kelime Avı', 
      description: 'Doğru kelimeleri hızlıca seçerek puanınızı artırın! Hızlı düşünme ve refleksinizi geliştirir.',
      icon: '🎯', 
      color: '#e63946', 
      gameType: 'wordHunt' 
    },
    { 
      id: '2', 
      title: 'Kelime Yapbozu', 
      description: 'Karışık harfleri doğru sıraya dizip anlamlı kelimeyi oluşturun. Problem çözme yeteneğinizi geliştirir.',
      icon: '🧩', 
      color: '#2a9d8f', 
      gameType: 'wordPuzzle' 
    },
    { 
      id: '3', 
      title: 'Zamana Karşı Quiz', 
      description: 'Sınırlı sürede hızlıca soruları cevaplayın. Zaman baskısı altında kelime haznenizi test edin!',
      icon: '⏱️', 
      color: '#f9c74f', 
      gameType: 'timeQuiz' 
    },
  ];

  const renderGameItem = ({ item, index }: { item: GameItem, index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 150).duration(500)}
    >
      <AnimatedCard
        variant={index % 2 === 0 ? 'bordered' : 'elevated'}
        borderColor={item.color}
        onPress={() => handleGamePress(item.gameType)}
        style={styles.gameCard}
      >
        <View style={styles.gameContent}>
          <View style={[styles.gameIconContainer, { backgroundColor: item.color }]}>
            <Text style={styles.gameIcon}>{item.icon}</Text>
          </View>
          <View style={styles.gameTextContent}>
            <Text style={styles.gameTitle}>{item.title}</Text>
            <Text style={styles.gameDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>
        <AnimatedButton
          text="Oyna"
          onPress={() => handleGamePress(item.gameType)}
          type="primary"
          size="small"
          style={[styles.playButton, { backgroundColor: item.color }]}
        />
      </AnimatedCard>
    </Animated.View>
  );

  const renderQuickAccessItem = ({ item }: { item: QuickAccessItem }) => (
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

  const quickAccessItems: QuickAccessItem[] = [
    { id: '1', title: 'Kelimelerim', icon: '📚', color: '#4cc9f0', screen: 'MyWords' },
    { id: '2', title: 'Quizler', icon: '❓', color: '#f77f00', screen: 'Quizzes' },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" />
      
      <Animated.ScrollView 
        style={styles.container}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
      >
        {/* Kategori Seçim Modu Bildirimi */}
        {selectingCategoryForGame && (
          <AnimatedCard
            variant="bordered"
            borderColor={COLORS.warning}
            style={styles.selectionModeContainer}
          >
            <View style={styles.selectionModeContent}>
              <Ionicons name="game-controller-outline" size={24} color={COLORS.warning} style={{ marginRight: SPACING.s }} />
              <Text style={styles.selectionModeText}>
                Oyun için kategori seçin
              </Text>
            </View>
            <AnimatedButton
              text="İptal"
              type="outline"
              icon="close-outline"
              size="small"
              onPress={() => {
                setSelectingCategoryForGame(false);
                setGameId(null);
              }}
            />
          </AnimatedCard>
        )}

        {/* Normal mod - kullanıcı bilgisi ve hoş geldin mesajı */}
        {!selectingCategoryForGame && (
          <View style={styles.welcomeSection}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeGradient}
            >
              <View style={styles.header}>
                <View style={styles.userInfoContainer}>
                  <Text style={styles.greeting}>Hoş Geldin,</Text>
                  <Text style={styles.username}>{user?.first_name || 'Kullanıcı'}!</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Profile')}
                  style={styles.profilePicContainer}
                >
                  <Image 
                    source={{ uri: profile?.profile_pic || 'https://via.placeholder.com/50' }} 
                    style={styles.profilePic}
                  />
                </TouchableOpacity>
              </View>
              
              <AnimatedCard
                variant="glass"
                style={styles.progressCard}
              >
                <View style={styles.streakInfo}>
                  <Animated.View style={[streakAnimStyle, styles.streakIconContainer]}>
                    <Text style={styles.streakIcon}>🔥</Text>
                  </Animated.View>
                  <View style={styles.streakTextContainer}>
                    <Text style={styles.streakCount}>7 gün</Text>
                    <Text style={styles.streakText}>üst üste çalışıyorsun!</Text>
                  </View>
                </View>
                
                <View style={styles.progressInfo}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Genel İlerleme</Text>
                    <Text style={styles.progressCount}>0 / 2173 kelime öğrenildi</Text>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <Animated.View 
                      style={[styles.progressBar, progressAnimStyle]} 
                    />
                  </View>
                </View>
                
                <View style={styles.actionButtons}>
                  <AnimatedButton
                    text="Öğrenme Paneli"
                    onPress={() => navigation.navigate('MyWords')}
                    icon="school-outline"
                    gradient={true}
                    style={styles.learningPanelButton}
                  />
                  
                  <AnimatedButton
                    text="Kategoriler"
                    onPress={() => navigation.navigate('Categories')}
                    type="outline"
                    icon="grid-outline"
                    style={styles.categoriesButton}
                  />
                </View>
              </AnimatedCard>
            </LinearGradient>
          </View>
        )}

        {/* Önerilen Kategoriler */}
        <Animated.View 
          entering={FadeInUp.duration(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Önerilen Kategoriler</Text>
          
          <FlatList
            data={featuredCategories}
            renderItem={renderFeaturedCategoryItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredCategoriesContainer}
          />
          
          <View style={styles.buttonContainer}>
            <AnimatedButton
              text="Tüm Kategorileri Gör"
              onPress={() => navigation.navigate('CategoryWords', { category: { id: 0, name: 'Tüm Kategoriler' } })}
              type="outline"
              icon="grid-outline"
              iconPosition="left"
              style={{ flex: 1, marginRight: SPACING.xs }}
            />
            
            <AnimatedButton
              text="İstatistiklerimi Gör"
              onPress={() => navigation.navigate('Statistics')}
              type="secondary"
              icon="stats-chart-outline"
              iconPosition="left"
              style={{ flex: 1, marginLeft: SPACING.xs }}
            />
          </View>
        </Animated.View>

        {/* Popüler Oyunlar */}
        <Animated.View 
          entering={FadeInUp.delay(200).duration(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Popüler Oyunlar</Text>
          
          <FlatList
            data={popularGames}
            renderItem={renderGameItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.gamesContainer}
          />
          
          <AnimatedButton
            text="Tüm Oyunları Keşfet"
            onPress={() => navigation.navigate('Games')}
            type="outline"
            icon="game-controller-outline"
            iconPosition="left"
            style={{ alignSelf: 'center', marginTop: SPACING.s }}
          />
        </Animated.View>

        {/* Hızlı Quiz */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Hızlı Quiz ile Kendini Test Et</Text>
          
          <AnimatedCard
            variant="gradient"
            gradientColors={[COLORS.secondary, COLORS.info]}
            style={styles.quizCard}
          >
            <View style={styles.quizCardContent}>
              <Ionicons name="help-circle-outline" size={40} color="#FFFFFF" style={styles.quizIcon} />
              <Text style={styles.quizDescription}>
                Öğrendiğin kelimeleri pekiştirmek için hemen bir quiz başlat.
              </Text>
            </View>
            
            <AnimatedButton
              text="Quiz Başlat"
              onPress={() => navigation.navigate('Quizzes')}
              type="primary"
              icon="play-outline"
              iconPosition="right"
              style={styles.quizButton}
            />
          </AnimatedCard>
        </Animated.View>

        {/* Başarı Rozetleri */}
        <Animated.View 
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Başarı Rozetlerin</Text>
          
          <AnimatedCard
            variant="elevated"
            style={styles.badgesContainer}
          >
            <View style={styles.badgesGrid}>
              <View style={styles.badge}>
                <View style={[styles.badgeIcon, styles.badgeActive]}>
                  <Text style={styles.badgeIconText}>⭐</Text>
                </View>
                <Text style={styles.badgeText}>İlk 10 Kelime</Text>
              </View>
              
              <View style={styles.badge}>
                <View style={[styles.badgeIcon, styles.badgeActive]}>
                  <Text style={styles.badgeIconText}>🔥</Text>
                </View>
                <Text style={styles.badgeText}>3 Gün Streak</Text>
              </View>
              
              <View style={styles.badge}>
                <View style={[styles.badgeIcon, styles.badgeActive]}>
                  <Text style={styles.badgeIconText}>🏅</Text>
                </View>
                <Text style={styles.badgeText}>İlk Quiz</Text>
              </View>
              
              <View style={styles.badge}>
                <View style={[styles.badgeIcon, styles.badgeInactive]}>
                  <Text style={styles.badgeIconText}>👑</Text>
                </View>
                <Text style={styles.badgeText}>50 Kelime</Text>
              </View>
              
              <View style={styles.badge}>
                <View style={[styles.badgeIcon, styles.badgeInactive]}>
                  <Text style={styles.badgeIconText}>🏆</Text>
                </View>
                <Text style={styles.badgeText}>10 Gün Streak</Text>
              </View>
            </View>
            
            <AnimatedButton
              text="Tüm Başarıları Gör"
              onPress={() => {}}
              type="text"
              icon="trophy-outline"
              iconPosition="right"
              style={{ alignSelf: 'center', marginTop: SPACING.m }}
            />
          </AnimatedCard>
        </Animated.View>

        {/* AI Pratik Kartı */}
        <TouchableOpacity
          style={[styles.featureCard, { backgroundColor: '#6A5ACD' }]}
          onPress={() => navigation.navigate('ChatPractice')}
        >
          <View style={styles.featureIconContainer}>
            <Ionicons name="chatbubbles" size={32} color="#fff" />
          </View>
          <Text style={styles.featureTitle}>AI ile Pratik</Text>
          <Text style={styles.featureDescription}>
            Yapay zeka ile İngilizce konuşma pratiği yapın
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.large,
  },
  welcomeGradient: {
    padding: SPACING.m,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xl + 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  userInfoContainer: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: SIZES.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  username: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profilePicContainer: {
    padding: 2,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  progressCard: {
    borderRadius: 20,
    padding: SPACING.m,
    ...SHADOWS.medium,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: SPACING.s,
    borderRadius: SIZES.base,
  },
  streakIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  streakIcon: {
    fontSize: 24,
  },
  streakTextContainer: {
    flexDirection: 'column',
  },
  streakCount: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.warning,
  },
  streakText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressInfo: {
    marginBottom: SPACING.m,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressCount: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.s,
    flexWrap: 'wrap',
  },
  learningPanelButton: {
    flex: 1,
    minWidth: 140,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  categoriesButton: {
    flex: 1,
    minWidth: 140,
    marginLeft: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  section: {
    padding: SPACING.m,
    marginBottom: SPACING.s,
    paddingHorizontal: SPACING.s,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  featuredCategoriesContainer: {
    paddingBottom: SPACING.s,
  },
  featuredCategoryCard: {
    width: 200,
    marginRight: SPACING.m,
    padding: 0,
    overflow: 'hidden',
  },
  featuredCategoryImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: SIZES.rounded,
    borderTopRightRadius: SIZES.rounded,
  },
  featuredCategoryName: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    margin: SPACING.s,
  },
  featuredCategoryDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.s,
    marginBottom: SPACING.s,
    height: 36,
    overflow: 'hidden',
  },
  seeWordsButton: {
    margin: SPACING.s,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.m,
    flexWrap: 'wrap',
  },
  gamesContainer: {
    paddingBottom: SPACING.s,
  },
  gameCard: {
    marginBottom: SPACING.m,
    borderRadius: SIZES.rounded,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gameContent: {
    flexDirection: 'row',
    marginBottom: SPACING.s,
    padding: SPACING.s,
  },
  gameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
    ...SHADOWS.small,
  },
  gameIcon: {
    fontSize: 28,
  },
  gameTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  gameTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  gameDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  playButton: {
    margin: SPACING.s,
    paddingHorizontal: SPACING.m,
    alignSelf: 'flex-end',
  },
  quizCard: {
    padding: SPACING.m,
  },
  quizCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  quizIcon: {
    marginRight: SPACING.m,
  },
  quizDescription: {
    flex: 1,
    fontSize: SIZES.medium,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  quizButton: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  badgesContainer: {
    padding: SPACING.m,
    borderRadius: SIZES.rounded,
    ...SHADOWS.small,
  },
  badgesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    paddingVertical: SPACING.xs,
  },
  badge: {
    alignItems: 'center',
    margin: SPACING.xs,
    width: '18%',
    minWidth: 60,
  },
  badgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    ...SHADOWS.small,
  },
  badgeActive: {
    backgroundColor: COLORS.primary,
  },
  badgeInactive: {
    backgroundColor: COLORS.backgroundDark,
  },
  badgeIconText: {
    fontSize: 20,
  },
  badgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectionModeContainer: {
    margin: SPACING.m,
    marginBottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionModeText: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  featureCard: {
    padding: SPACING.m,
    borderRadius: SIZES.rounded,
    margin: SPACING.m,
    ...SHADOWS.medium,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  featureTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
});

export default HomeScreen; 