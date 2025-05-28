import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Text, View } from 'react-native';
import { COLORS } from '../styles/theme';

// Ekranlar
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoryWordsScreen from '../screens/CategoryWordsScreen';
import MyWordsScreen from '../screens/MyWordsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import QuizScreen from '../screens/QuizScreen';
import GamesScreen from '../screens/GamesScreen';
import WordGameScreen from '../screens/WordGameScreen';

// Diğer ekranlar (henüz oluşturulmadı)
const QuizzesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Quiz Ekranı</Text>
  </View>
);

const StatisticsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>İstatistikler Ekranı</Text>
  </View>
);

const WordDetailScreen = ({ route }) => {
  const { word } = route.params;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>{word.english}</Text>
      <Text style={{ fontSize: 18, color: COLORS.primary }}>{word.turkish}</Text>
      {word.example_sentence && (
        <Text style={{ marginTop: 20, fontStyle: 'italic' }}>
          <Text style={{ fontWeight: 'bold' }}>Örnek: </Text>
          {word.example_sentence}
        </Text>
      )}
    </View>
  );
};

const RegisterScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Kayıt Ekranı</Text>
  </View>
);

// Stack Navigator
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Ana Tab Navigator
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        backgroundColor: COLORS.card,
        borderTopColor: COLORS.border,
      },
      headerStyle: {
        backgroundColor: COLORS.primary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen} 
      options={{ 
        title: 'Ana Sayfa',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
      }}
    />
    <Tab.Screen 
      name="MyWords" 
      component={MyWordsScreen} 
      options={{ 
        title: 'Kelimelerim',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
      }}
    />
    <Tab.Screen 
      name="Quizzes" 
      component={QuizzesScreen} 
      options={{ 
        title: 'Quizler',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❓</Text>,
      }}
    />
    <Tab.Screen 
      name="Games" 
      component={GamesScreen} 
      options={{ 
        title: 'Oyunlar',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎮</Text>,
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ 
        title: 'Profil',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
      }}
    />
  </Tab.Navigator>
);

// Ana Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useSelector(state => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ title: 'Kayıt Ol' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="CategoryWords" 
              component={CategoryWordsScreen} 
              options={({ route }) => ({ title: route.params.category.name })}
            />
            <Stack.Screen 
              name="WordDetail" 
              component={WordDetailScreen} 
              options={{ title: 'Kelime Detayı' }}
            />
            <Stack.Screen 
              name="Quiz" 
              component={QuizScreen} 
              options={{ title: 'Quiz' }}
            />
            <Stack.Screen 
              name="WordGame" 
              component={WordGameScreen} 
              options={({ route }) => {
                const gameTypes = {
                  wordShuffle: 'Kelime Karıştırma',
                  wordMatch: 'Kelime Eşleştirme',
                  speedQuiz: 'Hızlı Quiz',
                  hangman: 'Adam Asmaca'
                };
                return { 
                  title: gameTypes[route.params?.gameType] || 'Kelime Oyunu'
                };
              }}
            />
            <Stack.Screen 
              name="Statistics" 
              component={StatisticsScreen} 
              options={{ title: 'İstatistikler' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 