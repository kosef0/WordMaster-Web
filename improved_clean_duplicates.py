#!/usr/bin/env python
import os
import sys
import django
import logging
import unicodedata
import re
from collections import defaultdict
from difflib import SequenceMatcher

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
    """Metni normalleştir: küçük harf, unicode normalizasyon, tüm boşlukları kaldır"""
    if not text:
        return ""
    # Unicode normalizasyon
    text = unicodedata.normalize('NFKD', text)
    # Küçük harfe çevir
    text = text.lower()
    # Alfanumerik olmayan karakterleri kaldır
    text = re.sub(r'[^\w\s]', '', text)
    # Tüm boşlukları kaldır
    text = re.sub(r'\s+', '', text)
    return text

def are_similar_categories(cat1, cat2, threshold=0.85):
    """İki kategorinin benzer olup olmadığını kontrol et"""
    # İsim benzerliği
    name_similarity = SequenceMatcher(None, 
                                     normalize_text(cat1.name), 
                                     normalize_text(cat2.name)).ratio()
    
    # Açıklama varsa, açıklama benzerliğini de kontrol et
    if cat1.description and cat2.description:
        desc_similarity = SequenceMatcher(None, 
                                         normalize_text(cat1.description), 
                                         normalize_text(cat2.description)).ratio()
        # İsim ve açıklama benzerliğinin ortalaması
        similarity = (name_similarity + desc_similarity) / 2
    else:
        # Sadece isim benzerliğini kullan
        similarity = name_similarity
    
    return similarity >= threshold

def list_duplicate_categories():
    """Tekrarlanan kategorileri listele"""
    logger.info("Kategori analizi başlıyor...")
    
    # Tüm kategorileri al
    all_categories = Category.objects.all()
    logger.info(f"Toplam {all_categories.count()} kategori bulundu.")
    
    # Normalleştirilmiş isme göre kategorileri grupla
    categories_by_name = defaultdict(list)
    for category in all_categories:
        norm_name = normalize_text(category.name)
        categories_by_name[norm_name].append(category)
    
    # İsme göre tekrarlanan kategorileri göster
    print("\n=== İsme Göre Kesin Tekrarlar ===")
    duplicate_count = 0
    for norm_name, categories in categories_by_name.items():
        if len(categories) > 1:
            duplicate_count += len(categories) - 1
            print(f"\nKategori: '{categories[0].name}' ({len(categories)} adet)")
            for cat in categories:
                print(f"  - ID: {cat.id}, İçerik: {Word.objects.filter(category=cat).count()} kelime")
    
    print(f"\nToplam {duplicate_count} kesin tekrarlanan kategori bulundu.")
    
    # Benzerlik eşiği ile tekrarları ara
    print("\n=== Benzer Kategoriler (Eşik: 0.85) ===")
    similar_pairs = []
    categories = list(all_categories)
    for i in range(len(categories)):
        for j in range(i+1, len(categories)):
            if are_similar_categories(categories[i], categories[j]):
                similar_pairs.append((categories[i], categories[j]))
    
    for cat1, cat2 in similar_pairs:
        # Kesin tekrarları atlayalım (zaten üstte gösterildi)
        if normalize_text(cat1.name) == normalize_text(cat2.name):
            continue
        print(f"\nBenzer Kategori Bulundu:")
        print(f"  1. ID: {cat1.id}, İsim: '{cat1.name}', İçerik: {Word.objects.filter(category=cat1).count()} kelime")
        print(f"  2. ID: {cat2.id}, İsim: '{cat2.name}', İçerik: {Word.objects.filter(category=cat2).count()} kelime")
    
    print(f"\nToplam {len(similar_pairs)} benzer kategori çifti bulundu.")

def clean_duplicate_categories():
    """Tekrarlanan kategorileri temizle"""
    logger.info("Tekrarlanan kategorileri temizleme işlemi başlıyor...")
    
    # Tüm kategorileri al
    all_categories = Category.objects.all()
    logger.info(f"Toplam {all_categories.count()} kategori bulundu.")
    
    # Normalleştirilmiş isme göre kategorileri grupla
    categories_by_name = defaultdict(list)
    for category in all_categories:
        norm_name = normalize_text(category.name)
        categories_by_name[norm_name].append(category)
    
    # Tekrarlanan kategorileri tespit et ve sil
    total_removed = 0
    for norm_name, categories in categories_by_name.items():
        if len(categories) > 1:
            # Kelimeleri en çok olan kategoriyi koru
            categories.sort(key=lambda x: Word.objects.filter(category=x).count(), reverse=True)
            keep_category = categories[0]
            logger.info(f"Tekrarlanan '{keep_category.name}' kategorisi için ID={keep_category.id} korunacak.")
            
            for duplicate in categories[1:]:
                try:
                    # İlişkili kelimeleri koruyacağımız kategoriye taşı
                    Word.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # İlişkili kullanıcı kategori ilerlemelerini taşı
                    UserCategoryProgress.objects.filter(category=duplicate).update(category=keep_category)
                    
                    # Tekrarlanan kategoriyi sil
                    duplicate_id = duplicate.id
                    duplicate.delete()
                    logger.info(f"Tekrarlanan kategori silindi: '{duplicate.name}', ID={duplicate_id}")
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
            # Normalleştirilmiş kelimeler
            eng = normalize_text(word.english)
            tur = normalize_text(word.turkish)
            key = (eng, tur)
            words_by_pair[key].append(word)
        
        # Tekrarlanan kelimeleri tespit et ve sil
        category_removed = 0
        for (eng, tur), words in words_by_pair.items():
            if len(words) > 1:
                # İlk kelimeyi koru, diğerlerini sil
                keep_word = words[0]
                logger.info(f"Tekrarlanan '{keep_word.english}-{keep_word.turkish}' kelime çifti için ID={keep_word.id} korunacak.")
                
                for duplicate in words[1:]:
                    try:
                        # İlişkili kullanıcı ilerlemelerini taşı
                        UserProgress.objects.filter(word=duplicate).update(word=keep_word)
                        
                        # Tekrarlanan kelimeyi sil
                        duplicate_id = duplicate.id
                        duplicate.delete()
                        logger.info(f"Tekrarlanan kelime silindi: '{duplicate.english}-{duplicate.turkish}', ID={duplicate_id}")
                        total_removed += 1
                        category_removed += 1
                    except Exception as e:
                        logger.error(f"Kelime silinirken hata: {e}")
        
        logger.info(f"'{category.name}' kategorisinden {category_removed} tekrarlanan kelime temizlendi.")
    
    logger.info(f"Toplam {total_removed} tekrarlanan kelime temizlendi.")
    return total_removed

if __name__ == "__main__":
    print("Kategori Analizi ve Temizleme Aracı")
    print("===================================")
    
    # Önce tekrarlanan kategorileri listele
    list_duplicate_categories()
    
    # Kullanıcıdan onay al
    choice = input("\nTemizleme işlemine devam etmek istiyor musunuz? (E/H): ")
    if choice.lower() != 'e':
        print("İşlem iptal edildi.")
        sys.exit(0)
    
    print("\nTemizleme işlemi başlıyor...")
    
    # Tekrarlanan kategorileri temizle
    removed_categories = clean_duplicate_categories()
    
    # Tekrarlanan kelimeleri temizle
    removed_words = clean_duplicate_words()
    
    print("\nTemizleme işlemi tamamlandı!")
    print(f"Silinen kategori sayısı: {removed_categories}")
    print(f"Silinen kelime sayısı: {removed_words}")
    print(f"Güncel kategori sayısı: {Category.objects.count()}")
    print(f"Güncel kelime sayısı: {Word.objects.count()}") 