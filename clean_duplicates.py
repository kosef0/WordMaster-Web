#!/usr/bin/env python
import os
import sys
import django
import logging
from collections import defaultdict

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Model sınıflarını içe aktar
from core.models import Category, Word, UserProgress, UserCategoryProgress

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clean_duplicate_categories():
    """Tekrarlanan kategorileri temizle"""
    logger.info("Tekrarlanan kategorileri temizleme işlemi başlıyor...")
    
    # Tüm kategorileri al
    all_categories = Category.objects.all()
    logger.info(f"Toplam {all_categories.count()} kategori bulundu.")
    
    # İsme göre kategorileri grupla
    categories_by_name = defaultdict(list)
    for category in all_categories:
        categories_by_name[category.name.lower().strip()].append(category)
    
    # Tekrarlanan kategorileri tespit et ve sil
    total_removed = 0
    for name, categories in categories_by_name.items():
        if len(categories) > 1:
            # İlk kategoriyi koru, diğerlerini sil
            keep_category = categories[0]
            logger.info(f"Tekrarlanan '{name}' kategorisi için ID={keep_category.id} korunacak.")
            
            for duplicate in categories[1:]:
                try:
                    # İlişkili kelimeleri koruyacağımız kategoriye taşı
                    Word.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # İlişkili kullanıcı kategori ilerlemelerini taşı
                    UserCategoryProgress.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # Tekrarlanan kategoriyi sil
                    duplicate_id = duplicate.id
                    duplicate.delete()
                    logger.info(f"Tekrarlanan kategori silindi: '{name}', ID={duplicate_id}")
                    total_removed += 1
                except Exception as e:
                    logger.error(f"Kategori silinirken hata: {e}")
    
    logger.info(f"Toplam {total_removed} tekrarlanan kategori temizlendi.")
    return total_removed

def clean_duplicate_words():
    """Tekrarlanan kelimeleri temizle"""
    logger.info("Tekrarlanan kelimeleri temizleme işlemi başlıyor...")
    
    # Tüm kategorileri al
    categories = Category.objects.all()
    total_removed = 0
    
    # Her kategori için tekrarlanan kelimeleri kontrol et
    for category in categories:
        # Kategorideki tüm kelimeleri al
        category_words = Word.objects.filter(category=category)
        
        # İngilizce ve Türkçe kelime çiftlerine göre kelimeleri grupla
        words_by_pair = defaultdict(list)
        for word in category_words:
            # Hem ingilizce hem türkçe kelimeleri küçük harfe çevirip boşlukları temizle
            key = (word.english.lower().strip(), word.turkish.lower().strip())
            words_by_pair[key].append(word)
        
        # Tekrarlanan kelimeleri tespit et ve sil
        category_removed = 0
        for (eng, tur), words in words_by_pair.items():
            if len(words) > 1:
                # İlk kelimeyi koru, diğerlerini sil
                keep_word = words[0]
                logger.info(f"Tekrarlanan '{eng}-{tur}' kelime çifti için ID={keep_word.id} korunacak.")
                
                for duplicate in words[1:]:
                    try:
                        # İlişkili kullanıcı ilerlemelerini taşı
                        UserProgress.objects.filter(word=duplicate).update(word=keep_word)
                        
                        # Tekrarlanan kelimeyi sil
                        duplicate_id = duplicate.id
                        duplicate.delete()
                        logger.info(f"Tekrarlanan kelime silindi: '{eng}-{tur}', ID={duplicate_id}")
                        total_removed += 1
                        category_removed += 1
                    except Exception as e:
                        logger.error(f"Kelime silinirken hata: {e}")
        
        logger.info(f"'{category.name}' kategorisinden {category_removed} tekrarlanan kelime temizlendi.")
    
    logger.info(f"Toplam {total_removed} tekrarlanan kelime temizlendi.")
    return total_removed

if __name__ == "__main__":
    logger.info("Veritabanı temizleme işlemi başlıyor...")
    
    # Tekrarlanan kategorileri temizle
    removed_categories = clean_duplicate_categories()
    
    # Tekrarlanan kelimeleri temizle
    removed_words = clean_duplicate_words()
    
    logger.info("Veritabanı temizleme işlemi tamamlandı.")
    logger.info(f"Toplam {removed_categories} tekrarlanan kategori ve {removed_words} tekrarlanan kelime silindi.")
    
    # Son durum raporu
    logger.info(f"Güncel durum:")
    logger.info(f"- Toplam kategori sayısı: {Category.objects.count()}")
    logger.info(f"- Toplam kelime sayısı: {Word.objects.count()}")
    
    print("Temizleme işlemi tamamlandı!")
    print(f"Silinen kategori sayısı: {removed_categories}")
    print(f"Silinen kelime sayısı: {removed_words}")
    print(f"Güncel kategori sayısı: {Category.objects.count()}")
    print(f"Güncel kelime sayısı: {Word.objects.count()}") 