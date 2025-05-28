// Kategori resimleri için yardımcı fonksiyonlar
// Bu fonksiyon, kategorinin adına göre varsayılan bir resim URL'si döndürür
// Sonradan gerçek API verisiyle değiştirilecek

export const getCategoryImageByName = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  
  // Kategori adına göre benzer bir resim döndür
  if (name.includes('konaklama') || name.includes('accommodation')) {
    return 'https://via.placeholder.com/300x200/4cc9f0/ffffff?text=Konaklama';
  } else if (name.includes('macera') || name.includes('adventure')) {
    return 'https://via.placeholder.com/300x200/f72585/ffffff?text=Macera';
  } else if (name.includes('aile') || name.includes('family')) {
    return 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Aile';
  } else if (name.includes('alışveriş') || name.includes('shopping')) {
    return 'https://via.placeholder.com/300x200/7209b7/ffffff?text=Alışveriş';
  } else if (name.includes('seyahat') || name.includes('travel')) {
    return 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=Seyahat';
  } else if (name.includes('iş') || name.includes('business')) {
    return 'https://via.placeholder.com/300x200/4895ef/ffffff?text=İş';
  } else if (name.includes('yemek') || name.includes('food')) {
    return 'https://via.placeholder.com/300x200/f77f00/ffffff?text=Yemek';
  } else if (name.includes('teknoloji') || name.includes('tech')) {
    return 'https://via.placeholder.com/300x200/f72585/ffffff?text=Teknoloji';
  } else if (name.includes('spor') || name.includes('sport')) {
    return 'https://via.placeholder.com/300x200/4cc9f0/ffffff?text=Spor';
  } else if (name.includes('eğitim') || name.includes('education')) {
    return 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=Eğitim';
  }
  
  // Varsayılan resim
  return 'https://via.placeholder.com/300x200/4cc9f0/ffffff?text=Kategori';
};

// Popüler oyunların resimlerini döndüren fonksiyon
export const getGameImageByType = (gameType: string): string => {
  switch (gameType) {
    case 'wordHunt':
      return 'https://via.placeholder.com/300x200/e63946/ffffff?text=Kelime+Avı';
    case 'wordPuzzle':
      return 'https://via.placeholder.com/300x200/2a9d8f/ffffff?text=Kelime+Yapbozu';
    case 'timeQuiz':
      return 'https://via.placeholder.com/300x200/f9c74f/ffffff?text=Zamana+Karşı+Quiz';
    default:
      return 'https://via.placeholder.com/300x200/4895ef/ffffff?text=Oyun';
  }
}; 