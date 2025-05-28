import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../styles/theme';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

type QuizResultScreenProps = StackScreenProps<RootStackParamList, 'QuizResult'>;

interface Word {
  id: number;
  english: string;
  turkish: string;
  difficulty: number;
}

const QuizResultScreen: React.FC<QuizResultScreenProps> = ({ navigation, route }) => {
  const { score, total, correctWords, wrongWords } = route.params;
  
  // Başarı oranını hesapla
  const successRate = Math.round((score / total) * 100);
  
  // Kelimeyi sesli oku
  const handleSpeak = (text: string) => {
    try {
      Speech.stop();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Speech.speak(text, { 
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9
      });
    } catch (error) {
      console.error('Telaffuz hatası:', error);
    }
  };
  
  // Ana ekrana dön
  const handleGoHome = () => {
    navigation.navigate('Home');
  };
  
  // Quizlere dön
  const handleGoToQuizzes = () => {
    navigation.navigate('QuizCategories');
  };
  
  // Kelime kartını render et
  const renderWordItem = ({ item }: { item: Word }) => (
    <View style={styles.wordItem}>
      <View style={styles.wordHeader}>
        <Text style={styles.wordEnglish}>{item.english}</Text>
        <TouchableOpacity 
          style={styles.speakButton}
          onPress={() => handleSpeak(item.english)}
        >
          <Ionicons name="volume-medium" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.wordTurkish}>{item.turkish}</Text>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoHome}>
          <Ionicons name="home" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quiz Sonucu</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Puanınız</Text>
          <Text style={styles.scoreValue}>{score} / {total}</Text>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${successRate}%`,
                  backgroundColor: 
                    successRate >= 70 ? COLORS.success : 
                    successRate >= 40 ? COLORS.warning : 
                    COLORS.danger
                }
              ]} 
            />
          </View>
          
          <Text style={styles.percentText}>%{successRate} Başarı</Text>
          
          <Text style={[
            styles.resultText,
            { 
              color: 
                successRate >= 70 ? COLORS.success : 
                successRate >= 40 ? COLORS.warning : 
                COLORS.danger
            }
          ]}>
            {
              successRate >= 70 ? 'Harika! Çok iyi bir sonuç!' : 
              successRate >= 40 ? 'İyi! Biraz daha çalışmalısın.' : 
              'Daha fazla çalışmaya ihtiyacın var.'
            }
          </Text>
        </View>
        
        {correctWords.length > 0 && (
          <View style={styles.wordsContainer}>
            <Text style={styles.sectionTitle}>Doğru Bildiğin Kelimeler</Text>
            <Text style={styles.sectionSubtitle}>
              Bu kelimelerin öğrenme durumu güncellendi
        </Text>
            <FlatList
              data={correctWords}
              renderItem={renderWordItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.wordsList}
            />
        </View>
      )}
      
      {wrongWords.length > 0 && (
          <View style={styles.wordsContainer}>
            <Text style={styles.sectionTitle}>Yanlış Bildiğin Kelimeler</Text>
            <Text style={styles.sectionSubtitle}>
              Bu kelimeleri tekrar çalışmalısın
            </Text>
            <FlatList
              data={wrongWords}
              renderItem={renderWordItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.wordsList}
            />
        </View>
      )}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={handleGoHome}
        >
          <Text style={styles.secondaryButtonText}>Ana Sayfa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={handleGoToQuizzes}
        >
          <Text style={styles.primaryButtonText}>Yeni Quiz</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.m,
    padding: SPACING.xs,
  },
  title: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  scoreContainer: {
    padding: SPACING.l,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.m,
    marginTop: SPACING.l,
    borderRadius: SIZES.base,
    ...SHADOWS.medium,
  },
  scoreLabel: {
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  scoreValue: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    marginBottom: SPACING.s,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  resultText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
  },
  wordsContainer: {
    marginTop: SPACING.l,
    paddingHorizontal: SPACING.m,
  },
  sectionTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.m,
  },
  wordsList: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.base,
    padding: SPACING.s,
    ...SHADOWS.small,
  },
  wordItem: {
    padding: SPACING.s,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  wordEnglish: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  speakButton: {
    padding: SPACING.xs,
  },
  wordTurkish: {
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: SIZES.base,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.s,
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.s,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
});

export default QuizResultScreen; 