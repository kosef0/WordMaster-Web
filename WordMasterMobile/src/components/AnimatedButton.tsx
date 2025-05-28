import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  ActivityIndicator, 
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { COLORS, SPACING, SIZES, SHADOWS, GRADIENTS } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedButtonProps {
  text: string;
  onPress: () => void;
  type?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  text,
  onPress,
  type = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  gradient = false
}) => {
  // Animasyon değerleri
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animasyon stilleri
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Buton tipine göre renk ve stil belirleme
  const getButtonStyles = () => {
    switch (type) {
      case 'secondary':
        return {
          backgroundColor: COLORS.secondary,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: COLORS.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        };
      default:
        return {
          backgroundColor: COLORS.primary,
          borderWidth: 0,
        };
    }
  };

  // Buton boyutuna göre padding belirleme
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.m,
          borderRadius: SIZES.base,
        };
      case 'large':
        return {
          paddingVertical: SPACING.m,
          paddingHorizontal: SPACING.xl,
          borderRadius: SIZES.rounded,
        };
      default:
        return {
          paddingVertical: SPACING.s,
          paddingHorizontal: SPACING.l,
          borderRadius: SIZES.base,
        };
    }
  };

  // Metin rengini belirleme
  const getTextColor = () => {
    if (disabled) return COLORS.textLight;
    
    switch (type) {
      case 'outline':
      case 'text':
        return COLORS.primary;
      default:
        return '#FFFFFF';
    }
  };

  // Metin boyutunu belirleme
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return SIZES.small;
      case 'large':
        return SIZES.large;
      default:
        return SIZES.medium;
    }
  };

  // Basma efektleri
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 200 });
    opacity.value = withTiming(0.9, { duration: 150, easing: Easing.ease });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 150, easing: Easing.ease });
  };

  // Buton içeriği
  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={getTextColor()} />;
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon as any}
            size={getTextSize() + 2}
            color={getTextColor()}
            style={{ marginRight: SPACING.xs }}
          />
        )}
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getTextSize(),
            },
            textStyle,
          ]}
        >
          {text}
        </Text>
        {icon && iconPosition === 'right' && (
          <Ionicons
            name={icon as any}
            size={getTextSize() + 2}
            color={getTextColor()}
            style={{ marginLeft: SPACING.xs }}
          />
        )}
      </>
    );
  };

  // Gradyan arkaplan renderı
  const renderBackground = () => {
    if (gradient && type === 'primary') {
      return (
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return null;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          styles.button,
          getButtonStyles(),
          getSizeStyles(),
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {renderBackground()}
        <Animated.View style={styles.contentContainer}>
          {renderContent()}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
  },
});

export default AnimatedButton; 