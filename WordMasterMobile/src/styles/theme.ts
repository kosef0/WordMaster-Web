import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Ana renkler
  primary: '#1cb0f6',
  primaryDark: '#0091da',
  primaryLight: '#7fd5ff',
  secondary: '#ff9600',
  secondaryDark: '#e08600',
  danger: '#ff4b4b',
  success: '#58cc02',
  warning: '#ffc800',
  info: '#ce82ff',
  text: '#3c3c3c',
  textSecondary: '#777777',
  background: '#ffffff',
  card: '#ffffff',
  border: '#e5e5e5',
  disabled: '#afafaf',

  // Başarı, uyarı, hata durumları
  successDark: '#27AE60',    // Koyu yeşil
  warningDark: '#F1C40F',    // Koyu sarı
  dangerDark: '#E74C3C',     // Koyu kırmızı
  
  // Nötr renkler
  textLight: '#A0AEC0',      // Açık metin rengi
  backgroundDark: '#EDF2F7', // Koyu arka plan
  backgroundLight: '#FFFFFF', // Açık arka plan
  
  // Gradient renkler
  gradientStart: '#5568FE',  // Gradient başlangıç
  gradientEnd: '#34AADC',    // Gradient bitiş
  
  // Seviye renkleri
  level1: '#FF7F50',  // Başlangıç
  level2: '#FFCC00',  // Kolay
  level3: '#4CD964',  // Orta
  level4: '#34AADC',  // İleri
  level5: '#5568FE',  // Uzman
  
  // Oyun renkleri
  wordHunt: '#e63946',    // Kelime Avı 
  wordPuzzle: '#2a9d8f',  // Kelime Yapbozu
  timeQuiz: '#f9c74f',    // Zamana Karşı Quiz
  
  // Kategori renkleri
  category1: '#4cc9f0',
  category2: '#f72585',
  category3: '#4361ee',
  category4: '#7209b7',
  
  // Rozet renkleri
  badgeActive: '#1cb0f6',
  badgeInactive: '#e0e0e0',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 8,
  },
};

export const SIZES = {
  // Font boyutları
  xs: 10,
  s: 12,
  m: 14,
  l: 16,
  xl: 18,
  xxl: 24,
  xxxl: 30,
  xxxxl: 36,
  
  // Kenarlık yarıçapları
  base: 8,     // Temel
  rounded: 10, // Yuvarlatılmış
  circle: 50,  // Daire
  
  // Ekran boyutları
  width: 350,
  height: 200,
  // Eksik boyutları ekle
  small: 12,
  medium: 16,
  large: 20
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  round: 9999,
};

export const GRADIENTS = {
  primary: [COLORS.gradientStart, COLORS.gradientEnd],
  success: [COLORS.success, COLORS.successDark],
  warning: [COLORS.warning, COLORS.warningDark],
  danger: [COLORS.danger, COLORS.dangerDark],
};

// Animasyon süreleri
export const ANIMATION = {
  fast: 200,    // Hızlı
  medium: 400,  // Orta
  slow: 800,    // Yavaş
};

// Ortak Stil Bileşenleri
export const CARD_STYLES = {
  default: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.rounded,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    ...SHADOWS.small,
  },
  interactive: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.rounded,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    ...SHADOWS.small,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  highlight: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.rounded,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  minimal: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.rounded,
    padding: SPACING.m,
    marginVertical: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  }
};

export const BUTTON_STYLES = {
  default: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    fontSize: SIZES.m,
    color: COLORS.text,
  },
  active: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    fontSize: SIZES.m,
    color: COLORS.text,
  },
  rounded: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    fontSize: SIZES.m,
    color: COLORS.text,
  }
};

export const INPUT_STYLES = {
  default: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  active: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: SIZES.base,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    fontSize: SIZES.medium,
    color: COLORS.text,
  },
  rounded: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.circle,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.l,
    fontSize: SIZES.medium,
    color: COLORS.text,
  }
}; 