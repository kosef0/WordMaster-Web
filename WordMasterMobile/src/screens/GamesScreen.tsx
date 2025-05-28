import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState } from '../store';
import { Ionicons } from '@expo/vector-icons';

// Tip tanımlamaları
type RootStackParamList = {
  Home: undefined;
  Games: undefined;
  WordGame: { gameType: string };
  WordPuzzle: undefined;
  WordGuess: undefined;
  SpeedQuiz: undefined;
  WordHunt: undefined;
  ChatPractice: undefined;
};

type Game = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  difficulty: string;
  screen: keyof RootStackParamList;
};

type GamesScreenProps = StackScreenProps<RootStackParamList, 'Games'>;

const GamesScreen: React.FC<GamesScreenProps> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  // Web sitesindeki oyunları mobil için uyarladık
  const games: Game[] = [
    {
      id: 'wordpuzzle',
      title: 'Kelime Yapbozu',
      description: 'Karışık harfleri doğru sıraya dizip anlamlı kelimeyi oluşturun.',
      icon: <Ionicons name="apps-outline" size={32} color="white" />,
      color: '#38b000',
      difficulty: 'Orta',
      screen: 'WordPuzzle'
    },
    {
      id: 'wordguess',
      title: 'Kelime Tahmin Oyunu',
      description: 'Harf harf tahmin edilen klasik "adam asmaca" benzeri oyun.',
      icon: <Ionicons name="help-circle-outline" size={32} color="white" />,
      color: '#ff5400',
      difficulty: 'Orta',
      screen: 'WordGuess'
    },
    {
      id: 'speedquiz',
      title: 'Zamana Karşı Test',
      description: '30 saniyede 5 soru gibi sınırlı sürede çoktan seçmeli sorular.',
      icon: <Ionicons name="timer-outline" size={32} color="white" />,
      color: '#f77f00',
      difficulty: 'Zor',
      screen: 'SpeedQuiz'
    },
    {
      id: 'wordhunt',
      title: 'Kelime Avı',
      description: 'Ekranda hızlıca beliren doğru ve yanlış kelimeleri seçin.',
      icon: <Ionicons name="search-outline" size={32} color="white" />,
      color: '#9d4edd',
      difficulty: 'Zor',
      screen: 'WordHunt'
    }
  ];

  const handleGamePress = (game: Game) => {
    // Oyun ekranına yönlendir
    if (game.screen) {
      switch (game.screen) {
        case 'WordGame':
          navigation.navigate('WordGame', { gameType: game.id });
          break;
        case 'WordPuzzle':
          navigation.navigate('WordPuzzle');
          break;
        case 'WordGuess':
          navigation.navigate('WordGuess');
          break;
        case 'SpeedQuiz':
          navigation.navigate('SpeedQuiz');
          break;
        case 'WordHunt':
          navigation.navigate('WordHunt');
          break;
        case 'ChatPractice':
          navigation.navigate('ChatPractice');
          break;
        default:
          Alert.alert('Bilgi', 'Bu oyun yakında eklenecek!');
      }
    } else {
      Alert.alert('Bilgi', 'Bu oyun yakında eklenecek!');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kelime Oyunları</Text>
        <Text style={styles.subtitle}>
          Eğlenerek kelime öğrenmek için oyunlar
        </Text>
      </View>

      <View style={styles.gamesContainer}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[styles.gameCard, { backgroundColor: game.color }]}
            onPress={() => handleGamePress(game)}
          >
            <View style={styles.gameIconContainer}>
              {game.icon}
            </View>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{game.difficulty}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* AI Pratik Oyunu */}
        <TouchableOpacity
          style={styles.gameCard}
          onPress={() => navigation.navigate('ChatPractice')}
        >
          <View style={[styles.gameIconContainer, { backgroundColor: '#6A5ACD' }]}>
            <Ionicons name="chatbubbles" size={28} color="#fff" />
          </View>
          <View style={styles.gameTextContainer}>
            <Text style={styles.gameTitle}>AI ile Pratik</Text>
            <Text style={styles.gameDescription}>
              Yapay zeka ile İngilizce konuşma pratiği yapın
            </Text>
          </View>
          <View style={styles.gameArrow}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Oyunlarda elde ettiğiniz en yüksek skorlar kaydedilecek ve diğer kullanıcılarla karşılaştırılabilecektir.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.l,
    paddingTop: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  gamesContainer: {
    padding: SPACING.m,
  },
  gameCard: {
    width: '100%',
    borderRadius: SIZES.base,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
  },
  gameIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  gameTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  gameDescription: {
    fontSize: SIZES.small,
    color: '#fff',
    opacity: 0.8,
    marginBottom: SPACING.m,
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.s,
    borderRadius: SIZES.base,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    color: '#fff',
    fontSize: SIZES.xs,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.m,
    padding: SPACING.m,
    borderRadius: SIZES.base,
    ...SHADOWS.small,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  gameTextContainer: {
    flex: 1,
  },
  gameArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GamesScreen; 