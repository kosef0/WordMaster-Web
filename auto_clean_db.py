#!/usr/bin/env python
import os
import sys
import django
import logging
import unicodedata
import re
from collections import defaultdict
from unidecode import unidecode

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

def normalize_text(text):
    """Metni normalleştir"""
    if not text:
        return ""
    # Unicode normalizasyon ve aksanları kaldır
    text = unidecode(unicodedata.normalize('NFKD', text))
    # Küçük harfe çevir
    text = text.lower()
    # Alfanumerik olmayan karakterleri kaldır
    text = re.sub(r'[^\w\s]', '', text)
    # Tüm boşlukları kaldır
    text = re.sub(r'\s+', '', text)
    return text

def auto_clean_categories():
    """Tekrarlanan kategorileri otomatik temizle"""
    print("KATEGORİ TEMİZLEME")
    print("=================")
    
    # Tüm kategorileri al
    all_categories = Category.objects.all()
    print(f"Toplam {all_categories.count()} kategori bulundu.")
    
    # Normalleştirilmiş isimlere göre kategorileri grupla
    categories_by_norm_name = defaultdict(list)
    for category in all_categories:
        norm_name = normalize_text(category.name)
        categories_by_norm_name[norm_name].append(category)
    
    # Tekrarlanan kategorileri temizle
    total_removed = 0
    for norm_name, categories in categories_by_norm_name.items():
        if len(categories) > 1:
            # Kelimeleri en çok olan kategoriyi koru
            categories.sort(key=lambda cat: Word.objects.filter(category=cat).count(), reverse=True)
            keep_category = categories[0]
            print(f"\nTekrarlayan kategori: '{keep_category.name}', {len(categories)} adet bulundu")
            print(f"  ID: {keep_category.id}, Kelime: {Word.objects.filter(category=keep_category).count()} adet (korunacak)")
            
            for duplicate in categories[1:]:
                try:
                    word_count = Word.objects.filter(category=duplicate).count()
                    print(f"  ID: {duplicate.id}, Kelime: {word_count} adet (silinecek)")
                    
                    # İlişkili kelimeleri taşı
                    Word.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # İlişkili kullanıcı ilerlemelerini taşı
                    UserCategoryProgress.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # Kategoriyi sil
                    duplicate.delete()
                    total_removed += 1
                except Exception as e:
                    logger.error(f"Kategori silinirken hata: {str(e)}")
    
    print(f"\nToplam {total_removed} tekrarlanan kategori temizlendi.")
    return total_removed

def auto_clean_words():
    """Tekrarlanan kelimeleri otomatik temizle"""
    print("\nKELİME TEMİZLEME")
    print("===============")
    
    # Kategorileri al
    categories = Category.objects.all()
    print(f"Toplam {categories.count()} kategori kontrol ediliyor...")
    
    total_removed = 0
    for category in categories:
        # Normalleştirilmiş kelime çiftlerine göre grupla
        words_by_pair = defaultdict(list)
        for word in Word.objects.filter(category=category):
            key = (normalize_text(word.english), normalize_text(word.turkish))
            words_by_pair[key].append(word)
        
        # Tekrarlanan kelimeleri temizle
        category_removed = 0
        for (eng_norm, tur_norm), duplicate_words in words_by_pair.items():
            if len(duplicate_words) > 1:
                # İlk kelimeyi koru (en eski kayıt)
                duplicate_words.sort(key=lambda w: w.id)
                keep_word = duplicate_words[0]
                
                for duplicate in duplicate_words[1:]:
                    try:
                        # İlişkili ilerlemeleri taşı
                        UserProgress.objects.filter(word=duplicate).update(word=keep_word)
                        
                        # Kelimeyi sil
                        duplicate.delete()
                        category_removed += 1
                    except Exception as e:
                        logger.error(f"Kelime silinirken hata: {str(e)}")
        
        if category_removed > 0:
            print(f"Kategori '{category.name}': {category_removed} tekrarlanan kelime silindi.")
        total_removed += category_removed
    
    print(f"\nToplam {total_removed} tekrarlanan kelime temizlendi.")
    return total_removed

def show_statistics():
    """Güncel istatistikleri göster"""
    print("\nVERİTABANI İSTATİSTİKLERİ")
    print("========================")
    
    # Kategori sayısı
    category_count = Category.objects.count()
    print(f"Kategori sayısı: {category_count}")
    
    # Kelime sayısı
    word_count = Word.objects.count()
    print(f"Kelime sayısı: {word_count}")
    
    # Kategori başına ortalama kelime sayısı
    if category_count > 0:
        avg_words_per_category = word_count / category_count
        print(f"Kategori başına ortalama kelime: {avg_words_per_category:.1f}")
    
    # Kelimesi olmayan kategoriler
    empty_categories = []
    for category in Category.objects.all():
        if Word.objects.filter(category=category).count() == 0:
            empty_categories.append(category)
    
    if empty_categories:
        print(f"\nBoş kategoriler ({len(empty_categories)}):")
        for cat in empty_categories[:10]:  # İlk 10 taneyi göster
            print(f"  - {cat.name} (ID: {cat.id})")
        if len(empty_categories) > 10:
            print(f"  ... ve {len(empty_categories) - 10} kategori daha.")

def clean_empty_categories():
    """Boş kategorileri temizle (içinde kelime olmayan)"""
    print("\nBOŞ KATEGORİLERİ TEMİZLEME")
    print("=========================")
    
    # Boş kategorileri bul
    empty_categories = []
    for category in Category.objects.all():
        if Word.objects.filter(category=category).count() == 0:
            empty_categories.append(category)
    
    empty_count = len(empty_categories)
    
    if empty_count == 0:
        print("Boş kategori bulunamadı.")
        return 0
    
    print(f"Toplam {empty_count} boş kategori bulundu:")
    for cat in empty_categories[:10]:  # İlk 10 tanesini göster
        print(f"  - ID: {cat.id}, İsim: '{cat.name}'")
    
    if len(empty_categories) > 10:
        print(f"  ve {len(empty_categories) - 10} kategori daha...")
    
    # Boş kategorileri sil
    try:
        deleted = 0
        for category in empty_categories:
            category.delete()
            deleted += 1
        
        print(f"Toplam {deleted} boş kategori silindi.")
        return deleted
    except Exception as e:
        logger.error(f"Boş kategoriler silinirken hata: {str(e)}")
        return 0

if __name__ == "__main__":
    print("OTOMATİK VERİTABANI TEMİZLEME")
    print("=============================")
    
    # Başlangıç istatistikleri
    print("Başlangıç durumu:")
    show_statistics()
    
    # Otomatik temizlik işlemleri
    print("\nTemizleme işlemi başlıyor...")
    removed_categories = auto_clean_categories()
    removed_words = auto_clean_words()
    removed_empty = clean_empty_categories()
    
    # Sonuç istatistikleri
    print("\nTemizleme işlemi tamamlandı.")
    print(f"Silinen tekrar kategori sayısı: {removed_categories}")
    print(f"Silinen tekrar kelime sayısı: {removed_words}")
    print(f"Silinen boş kategori sayısı: {removed_empty}")
    
    print("\nGüncel durum:")
    show_statistics()
    
    print("\nİşlem tamamlandı.") 