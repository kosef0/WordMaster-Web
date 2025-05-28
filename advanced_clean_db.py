#!/usr/bin/env python
import os
import sys
import django
import logging
import unicodedata
import re
from collections import defaultdict
from difflib import SequenceMatcher
from unidecode import unidecode

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Model sınıflarını içe aktar
from core.models import Category, Word, UserProgress, UserCategoryProgress
from django.db.models import Count

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def normalize_text(text):
    """
    Metni normalleştir:
    - Unicode normalizasyon
    - Küçük harfe çevir
    - Aksanlı harfleri kaldır
    - Alfanumerik olmayan karakterleri kaldır
    - Tüm boşlukları kaldır
    """
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

def find_all_duplicates():
    """Tüm tekrarlanan kategorileri tespit et ve göster"""
    print("\n1. TÜM KATEGORİLERİ ANALİZ ET")
    print("==============================")
    
    all_categories = Category.objects.all()
    print(f"Toplam {all_categories.count()} kategori bulundu.")
    
    # Kategorileri normalleştirilmiş isimlere göre grupla
    categories_by_norm_name = defaultdict(list)
    for category in all_categories:
        norm_name = normalize_text(category.name)
        categories_by_norm_name[norm_name].append(category)
    
    # Tekrarlanan kategorileri göster
    exact_duplicates = []
    for norm_name, categories in categories_by_norm_name.items():
        if len(categories) > 1:
            exact_duplicates.append((norm_name, categories))
    
    if exact_duplicates:
        print(f"\n{len(exact_duplicates)} farklı kategori için toplamda {sum(len(cats)-1 for _, cats in exact_duplicates)} tekrar bulundu.")
        
        for norm_name, categories in sorted(exact_duplicates, key=lambda x: len(x[1]), reverse=True):
            word_counts = []
            for cat in categories:
                word_count = Word.objects.filter(category=cat).count()
                word_counts.append(word_count)
                
            print(f"\n-> '{categories[0].name}' kategorisi ({len(categories)} adet):")
            for i, cat in enumerate(categories):
                print(f"   {i+1}. ID: {cat.id}, İçerik: {word_counts[i]} kelime")
    else:
        print("\nBirebir tekrar eden kategori bulunamadı.")
    
    return exact_duplicates

def find_similar_categories(threshold=0.85):
    """Benzer kategorileri tespit et ve göster"""
    print("\n2. BENZER KATEGORİLERİ KONTROL ET")
    print("================================")
    
    all_categories = list(Category.objects.all())
    similar_pairs = []
    
    # Tüm kategori çiftlerini kontrol et
    for i in range(len(all_categories)):
        for j in range(i+1, len(all_categories)):
            cat1, cat2 = all_categories[i], all_categories[j]
            
            # Normalleştirilmiş isimler aynı ise atla (kesin tekrarda gösterildi)
            if normalize_text(cat1.name) == normalize_text(cat2.name):
                continue
            
            # İsim benzerliği
            name_sim = SequenceMatcher(None, normalize_text(cat1.name), normalize_text(cat2.name)).ratio()
            
            if name_sim >= threshold:
                similar_pairs.append((cat1, cat2, name_sim))
    
    # Benzerlik oranına göre sırala
    similar_pairs.sort(key=lambda x: x[2], reverse=True)
    
    if similar_pairs:
        print(f"{len(similar_pairs)} benzer kategori çifti bulundu:")
        
        for cat1, cat2, similarity in similar_pairs:
            word_count1 = Word.objects.filter(category=cat1).count()
            word_count2 = Word.objects.filter(category=cat2).count()
            
            print(f"\n-> Benzerlik: {similarity:.2f}")
            print(f"   1. ID: {cat1.id}, İsim: '{cat1.name}', İçerik: {word_count1} kelime")
            print(f"   2. ID: {cat2.id}, İsim: '{cat2.name}', İçerik: {word_count2} kelime")
    else:
        print("Belirlenen eşiğe göre benzer kategori bulunamadı.")
    
    return similar_pairs

def clean_exact_duplicates():
    """Kesin tekrarlanan kategorileri temizle"""
    print("\n3. KESİN TEKRARLARI TEMİZLE")
    print("==========================")
    
    # Kesin tekrarları bul
    exact_duplicates = find_all_duplicates()
    
    if not exact_duplicates:
        print("Temizlenecek tekrarlanan kategori yok.")
        return 0
    
    if input("\nKesin tekrarları temizlemek istiyor musunuz? (E/H): ").lower() != 'e':
        print("Temizleme işlemi atlandı.")
        return 0
    
    removed_count = 0
    for _, categories in exact_duplicates:
        # Kelime sayısına göre sırala - en çok kelime olan kategoriyi koru
        categories.sort(key=lambda cat: Word.objects.filter(category=cat).count(), reverse=True)
        keep_category = categories[0]
        
        print(f"\n'{keep_category.name}' kategorisi korunacak (ID: {keep_category.id}).")
        
        for duplicate in categories[1:]:
            try:
                word_count = Word.objects.filter(category=duplicate).count()
                print(f"Kategori birleştiriliyor: '{duplicate.name}' (ID: {duplicate.id}, {word_count} kelime)")
                
                # İlişkili kelimeleri taşı
                Word.objects.filter(category=duplicate).update(category=keep_category)
                
                # İlişkili kullanıcı ilerlemelerini taşı
                UserCategoryProgress.objects.filter(category=duplicate).update(category=keep_category)
                
                # Kategoriyi sil
                duplicate.delete()
                print(f"Kategori silindi: ID={duplicate.id}")
                removed_count += 1
            except Exception as e:
                logger.error(f"Kategori temizlenirken hata: {str(e)}")
    
    print(f"\nToplam {removed_count} tekrarlanan kategori temizlendi.")
    return removed_count

def interactively_merge_similar():
    """Benzer kategorileri etkileşimli olarak birleştir"""
    print("\n4. BENZER KATEGORİLERİ BİRLEŞTİR")
    print("==============================")
    
    similar_pairs = find_similar_categories(threshold=0.85)
    
    if not similar_pairs:
        print("Birleştirilecek benzer kategori çifti yok.")
        return 0
    
    if input("\nBenzer kategorileri birleştirmek istiyor musunuz? (E/H): ").lower() != 'e':
        print("Birleştirme işlemi atlandı.")
        return 0
    
    merged_count = 0
    for cat1, cat2, similarity in similar_pairs:
        word_count1 = Word.objects.filter(category=cat1).count()
        word_count2 = Word.objects.filter(category=cat2).count()
        
        print(f"\nBenzerlik: {similarity:.2f}")
        print(f"1. ID: {cat1.id}, İsim: '{cat1.name}', İçerik: {word_count1} kelime")
        print(f"2. ID: {cat2.id}, İsim: '{cat2.name}', İçerik: {word_count2} kelime")
        
        choice = input("Ne yapmak istiyorsunuz? (1: 1.yi koru, 2: 2.yi koru, S: Atla): ").strip().lower()
        
        if choice == "1":
            keep, delete = cat1, cat2
        elif choice == "2":
            keep, delete = cat2, cat1
        else:
            print("Bu çift atlandı.")
            continue
        
        try:
            print(f"'{delete.name}' kategorisindeki kelimeler '{keep.name}' kategorisine taşınıyor...")
            
            # İlişkili kelimeleri taşı
            Word.objects.filter(category=delete).update(category=keep)
            
            # İlişkili kullanıcı ilerlemelerini taşı
            UserCategoryProgress.objects.filter(category=delete).update(category=keep)
            
            # Kategoriyi sil
            delete.delete()
            print(f"Kategori silindi: '{delete.name}' (ID: {delete.id})")
            merged_count += 1
        except Exception as e:
            logger.error(f"Kategori birleştirilirken hata: {str(e)}")
    
    print(f"\nToplam {merged_count} kategori birleştirildi.")
    return merged_count

def clean_duplicate_words():
    """Tekrarlanan kelimeleri temizle"""
    print("\n5. TEKRARLANAN KELİMELERİ TEMİZLE")
    print("===============================")
    
    # Kategorileri al
    categories = Category.objects.all()
    print(f"Toplam {categories.count()} kategori kontrol edilecek.")
    
    if input("\nTüm kategorilerdeki tekrarlanan kelimeleri temizlemek istiyor musunuz? (E/H): ").lower() != 'e':
        print("Kelime temizleme işlemi atlandı.")
        return 0
    
    total_removed = 0
    for category in categories:
        # Kategorideki kelimeleri al
        words = Word.objects.filter(category=category)
        
        # Normalleştirilmiş kelime çiftlerine göre grupla
        words_by_pair = defaultdict(list)
        for word in words:
            key = (normalize_text(word.english), normalize_text(word.turkish))
            words_by_pair[key].append(word)
        
        # Tekrarları tespit et
        duplicates = [(key, word_list) for key, word_list in words_by_pair.items() if len(word_list) > 1]
        
        if duplicates:
            category_removed = 0
            print(f"\nKategori: '{category.name}' - {len(duplicates)} farklı tekrarlanan kelime çifti bulundu")
            
            for (eng_norm, tur_norm), duplicate_words in duplicates:
                # İlk kelimeyi koru (en eski kayıt)
                duplicate_words.sort(key=lambda w: w.id)
                keep_word = duplicate_words[0]
                
                print(f"  Tekrar: '{keep_word.english}-{keep_word.turkish}' korunuyor (ID: {keep_word.id})")
                
                for duplicate in duplicate_words[1:]:
                    try:
                        # İlişkili ilerlemeleri taşı
                        UserProgress.objects.filter(word=duplicate).update(word=keep_word)
                        
                        # Kelimeyi sil
                        duplicate.delete()
                        category_removed += 1
                    except Exception as e:
                        logger.error(f"Kelime temizlenirken hata: {str(e)}")
            
            print(f"  Toplam {category_removed} tekrarlanan kelime silindi.")
            total_removed += category_removed
    
    print(f"\nToplam {total_removed} tekrarlanan kelime temizlendi.")
    return total_removed

def analyze_categories():
    """Kategori analizi ve istatistikleri"""
    print("\nKATEGORİ ANALİZİ")
    print("===============")
    
    # Tüm kategoriler
    categories = Category.objects.all().order_by('name')
    total_categories = categories.count()
    
    # Kelime sayısına göre kategorileri analiz et
    categories_with_counts = []
    for category in categories:
        word_count = Word.objects.filter(category=category).count()
        categories_with_counts.append((category, word_count))
    
    # En çok ve en az kelime içeren kategoriler
    categories_with_counts.sort(key=lambda x: x[1], reverse=True)
    
    print(f"Toplam kategori sayısı: {total_categories}")
    
    # Boş kategorileri göster
    empty_categories = [cat for cat, count in categories_with_counts if count == 0]
    if empty_categories:
        print(f"\nBoş kategoriler ({len(empty_categories)}):")
        for cat in empty_categories:
            print(f"  - ID: {cat.id}, İsim: '{cat.name}'")
    
    # En çok kelime içeren kategoriler
    print("\nEn çok kelime içeren kategoriler:")
    for cat, count in categories_with_counts[:10]:
        print(f"  - '{cat.name}': {count} kelime")
    
    return categories_with_counts

def purge_empty_categories():
    """Boş kategorileri sil"""
    print("\n6. BOŞ KATEGORİLERİ TEMİZLE")
    print("=========================")
    
    # Boş kategorileri manuel olarak bul
    empty_categories = []
    for category in Category.objects.all():
        if Word.objects.filter(category=category).count() == 0:
            empty_categories.append(category)
    
    empty_count = len(empty_categories)
    
    if empty_count == 0:
        print("Temizlenecek boş kategori yok.")
        return 0
    
    print(f"Toplam {empty_count} boş kategori bulundu:")
    for cat in empty_categories:
        print(f"  - ID: {cat.id}, İsim: '{cat.name}'")
    
    if input("\nBoş kategorileri silmek istiyor musunuz? (E/H): ").lower() != 'e':
        print("Silme işlemi atlandı.")
        return 0
    
    try:
        # Boş kategorileri sil
        deleted = 0
        for cat in empty_categories:
            cat.delete()
            deleted += 1
        
        print(f"Toplam {deleted} boş kategori silindi.")
        return deleted
    except Exception as e:
        logger.error(f"Boş kategoriler silinirken hata: {str(e)}")
        return 0

def main():
    print("VERİTABANI TEMİZLEME ARACI")
    print("==========================")
    print("Kategori ve kelime tekrarlarını temizlemek için bu aracı kullanabilirsiniz.")
    
    menu_items = [
        ("Veritabanı Analizi", lambda: analyze_categories()),
        ("Tekrarlanan Kategorileri Listele", lambda: find_all_duplicates()),
        ("Benzer Kategorileri Listele", lambda: find_similar_categories()),
        ("Kesin Tekrarlanan Kategorileri Temizle", lambda: clean_exact_duplicates()),
        ("Benzer Kategorileri Birleştir", lambda: interactively_merge_similar()),
        ("Tekrarlanan Kelimeleri Temizle", lambda: clean_duplicate_words()),
        ("Boş Kategorileri Temizle", lambda: purge_empty_categories()),
        ("Çıkış", lambda: None)
    ]
    
    while True:
        print("\nİŞLEMLER")
        print("=========")
        for i, (name, _) in enumerate(menu_items, 1):
            print(f"{i}. {name}")
        
        choice = input("\nYapmak istediğiniz işlemi seçin (1-8): ").strip()
        
        try:
            choice_idx = int(choice) - 1
            if 0 <= choice_idx < len(menu_items):
                action_name, action_func = menu_items[choice_idx]
                
                if action_name == "Çıkış":
                    break
                
                print(f"\n{action_name.upper()} İŞLEMİ BAŞLIYOR")
                action_func()
                
                # İşlemden sonra güncel durumu göster
                current_categories = Category.objects.count()
                current_words = Word.objects.count()
                print(f"\nGüncel durum:")
                print(f"- Toplam kategori sayısı: {current_categories}")
                print(f"- Toplam kelime sayısı: {current_words}")
                input("\nDevam etmek için Enter tuşuna basın...")
            else:
                print("Geçersiz seçim. Lütfen 1-8 arası bir sayı girin.")
        except ValueError:
            print("Geçersiz seçim. Lütfen bir sayı girin.")
    
    print("\nProgram sonlandırılıyor...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProgram kullanıcı tarafından sonlandırıldı.")
    except Exception as e:
        logger.error(f"Beklenmeyen hata: {str(e)}")
        print(f"\nHata: {str(e)}") 