import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import { COLORS, SPACING, SIZES, SHADOWS, GRADIENTS } from '../styles/theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootState, AppDispatch } from '../store';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../components/AnimatedButton';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo123');
  const [secure, setSecure] = useState(true);
  const [activeInput, setActiveInput] = useState<'username' | 'password' | null>(null);
  
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Animasyon değerleri
  const logoScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  // Sayfa yüklendiğinde animasyonları başlat
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    
    // Logo animasyonu
    logoScale.value = withSpring(1, { 
      damping: 15, 
      stiffness: 100 
    });
    
    // Form animasyonu
    setTimeout(() => {
      formOpacity.value = withTiming(1, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      formTranslateY.value = withTiming(0, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
    }, 300);
  }, []);

  // Animasyon stilleri
  const logoAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }]
    };
  });

  const formAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }]
    };
  });

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    try {
      await dispatch(login({ username, password })).unwrap();
    } catch (error) {
      // Hata zaten store'da ele alınıyor
    }
  };

  const getInputStyle = (inputType: 'username' | 'password') => {
    if (activeInput === inputType) {
      return [styles.input, styles.inputActive];
    }
    return styles.input;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Arkaplan Gradyanı */}
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Bölümü */}
          <Animated.View style={[styles.logoContainer, logoAnimStyle]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>WM</Text>
            </View>
            <Animated.Text 
              entering={FadeInDown.delay(300).duration(800)} 
              style={styles.appName}
            >
              WordMaster
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(500).duration(800)} 
              style={styles.tagline}
            >
              Kelime öğrenmenin en eğlenceli yolu!
            </Animated.Text>
          </Animated.View>

          {/* Giriş Formu */}
          <Animated.View style={[styles.formCard, formAnimStyle]}>
            <Text style={styles.formTitle}>Giriş Yap</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={activeInput === 'username' ? COLORS.primary : COLORS.textSecondary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={getInputStyle('username')}
                placeholder="Kullanıcı Adı"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                onFocus={() => setActiveInput('username')}
                onBlur={() => setActiveInput(null)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={activeInput === 'password' ? COLORS.primary : COLORS.textSecondary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={getInputStyle('password')}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
                onFocus={() => setActiveInput('password')}
                onBlur={() => setActiveInput(null)}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setSecure(!secure)}
              >
                <Ionicons 
                  name={secure ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={COLORS.textSecondary} 
                />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPassword}>Şifreni mi unuttun?</Text>
            </View>

            <AnimatedButton
              text="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
              size="large"
              icon="log-in-outline"
              iconPosition="right"
              gradient={true}
              style={styles.loginButton}
            />

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Hesabın yok mu?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.demoContainer}>
              <Text style={styles.demoText}>Demo giriş: demo / demo123</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 0.6,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formCard: {
    width: width * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.l,
    ...SHADOWS.large,
  },
  formTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    paddingHorizontal: SPACING.m,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  inputActive: {
    borderColor: COLORS.primary,
  },
  eyeIcon: {
    padding: SPACING.m,
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: SPACING.m,
    textAlign: 'center',
    fontSize: SIZES.small,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.m,
  },
  forgotPassword: {
    color: COLORS.primary,
    fontSize: SIZES.small,
  },
  loginButton: {
    marginTop: SPACING.s,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.l,
  },
  registerText: {
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  demoContainer: {
    alignItems: 'center',
    marginTop: SPACING.l,
  },
  demoText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
  },
});

export default LoginScreen; 