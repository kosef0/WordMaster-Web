import React, { ReactNode } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SPACING, SIZES, GRADIENTS } from '../styles/theme';

interface AnimatedCardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  animated?: boolean;
  variant?: 'default' | 'bordered' | 'elevated' | 'gradient' | 'glass';
  borderColor?: string;
  gradientColors?: string[];
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  onPress,
  disabled = false,
  animated = true,
  variant = 'default',
  borderColor,
  gradientColors = GRADIENTS.primary
}) => {
  // Animasyon değerleri
  const scale = useSharedValue(1);
  const elevation = useSharedValue(variant === 'elevated' ? 4 : 2);
  
  // Dokunma efektleri
  const handlePressIn = () => {
    if (!animated || disabled) return;
    
    scale.value = withSpring(0.98, { damping: 12, stiffness: 200 });
    elevation.value = withTiming(variant === 'elevated' ? 8 : 4, { duration: 150, easing: Easing.ease });
  };
  
  const handlePressOut = () => {
    if (!animated || disabled) return;
    
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    elevation.value = withTiming(variant === 'elevated' ? 4 : 2, { duration: 200, easing: Easing.ease });
  };
  
  // Animasyon stili
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      elevation: elevation.value,
      shadowOpacity: withTiming(elevation.value * 0.05, { duration: 150 }),
    };
  });
  
  // Varyant stilini getir
  const getVariantStyle = () => {
    switch (variant) {
      case 'bordered':
        return {
          backgroundColor: COLORS.card,
          borderWidth: 2,
          borderColor: borderColor || COLORS.primary,
          ...SHADOWS.small
        };
      case 'elevated':
        return {
          backgroundColor: COLORS.card,
          ...SHADOWS.medium
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          ...SHADOWS.small
        };
      default:
        return {
          backgroundColor: COLORS.card,
          ...SHADOWS.small
        };
    }
  };
  
  // Gradient background
  const renderBackground = () => {
    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return null;
  };
  
  // Wrapper ve içerik renderı
  const renderContent = () => {
    return (
      <Animated.View 
        style={[
          styles.card,
          getVariantStyle(),
          animatedStyle,
          style
        ]}
      >
        {renderBackground()}
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    );
  };
  
  // Basılabilir kart mı yoksa statik kart mı?
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }
  
  return renderContent();
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.rounded,
    padding: SPACING.m,
    margin: SPACING.s,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  }
});

export default AnimatedCard; 