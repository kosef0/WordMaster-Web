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
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError

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

def fix_user_category_progress():
    """UserCategoryProgress tablosundaki çakışmaları düzelt"""
    print("KULLANICI KATEGORİ İLERLEMESİ DÜZELTME")
    print("=====================================")
    
    # Tüm kullanıcıları al
    users = User.objects.all()
    print(f"Toplam {users.count()} kullanıcı bulundu.")
    
    total_deleted = 0
    for user in users:
        print(f"\nKullanıcı: {user.username}")
        
        # Kategori bazlı ilerleme tablosunu kontrol et
        user_progress_entries = UserCategoryProgress.objects.filter(user=user)
        
        # Kategori ID'lerine göre grupla
        progress_by_category_id = defaultdict(list)
        for progress in user_progress_entries:
            progress_by_category_id[progress.category_id].append(progress)
        
        # Tekrarlanan kayıtları bul ve sil
        user_deleted = 0
        for category_id, progress_entries in progress_by_category_id.items():
            if len(progress_entries) > 1:
                # İlk kaydı koru, diğerlerini sil
                category_name = progress_entries[0].category.name if progress_entries[0].category else f"ID: {category_id}"
                print(f"  Kategori '{category_name}' için {len(progress_entries)} ilerleme kaydı bulundu")
                
                # En son güncellenmiş olanı koru
                progress_entries.sort(key=lambda p: p.last_updated if p.last_updated else p.id, reverse=True)
                keep_entry = progress_entries[0]
                
                for duplicate_entry in progress_entries[1:]:
                    try:
                        duplicate_entry.delete()
                        user_deleted += 1
                        print(f"  - Tekrarlanan ilerleme kaydı silindi: ID {duplicate_entry.id}")
                    except Exception as e:
                        logger.error(f"İlerleme kaydı silinemedi: {str(e)}")
        
        if user_deleted > 0:
            print(f"  Toplam {user_deleted} tekrarlanan ilerleme kaydı silindi.")
        else:
            print("  Tekrarlanan kayıt bulunamadı.")
        
        total_deleted += user_deleted
    
    print(f"\nToplam {total_deleted} tekrarlanan ilerleme kaydı silindi.")
    return total_deleted

def clean_duplicate_categories():
    """Tekrarlanan kategorileri temizle"""
    print("\nKATEGORİ TEMİZLEME")
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
                    print(f"  ID: {duplicate.id}, Kelime: {word_count} adet (işleniyor)")
                    
                    with transaction.atomic():
                        # İlişkili kelimeleri taşı
                        Word.objects.filter(category=duplicate).update(category=keep_category)
                        print(f"    - Kelimeler taşındı")
                        
                        # İlişkili ilerleme kayıtlarını temizle - silme
                        # Bu kısım normalde taşıma yapardı, ancak UNIQUE constraint hatası veriyor
                        # Bu nedenle çakışan kayıtları siliyoruz
                        progress_entries = UserCategoryProgress.objects.filter(category=duplicate)
                        
                        for progress in progress_entries:
                            # Hedefteki aynı kullanıcı için kayıt var mı?
                            if UserCategoryProgress.objects.filter(
                                user=progress.user, 
                                category=keep_category
                            ).exists():
                                # Kayıt varsa tekrarlayan kaydı sil
                                progress.delete()
                                print(f"    - Çakışan ilerleme kaydı silindi")
                            else:
                                # Kayıt yoksa taşı
                                progress.category = keep_category
                                progress.save()
                                print(f"    - İlerleme kaydı taşındı")
                        
                        # Kategoriyi sil
                        duplicate.delete()
                        print(f"    - Kategori silindi: ID={duplicate.id}")
                        total_removed += 1
                        
                except IntegrityError as e:
                    logger.error(f"Kategori taşıma sırasında bütünlük hatası: {str(e)}")
                except Exception as e:
                    logger.error(f"Kategori silinirken hata: {str(e)}")
    
    print(f"\nToplam {total_removed} tekrarlanan kategori temizlendi.")
    return total_removed

def clean_empty_categories():
    """Boş kategorileri temizle"""
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
    deleted = 0
    for category in empty_categories:
        try:
            # Önce bu kategoriye ait ilerleme kayıtlarını sil
            UserCategoryProgress.objects.filter(category=category).delete()
            # Sonra kategoriyi sil
            category.delete()
            deleted += 1
        except Exception as e:
            logger.error(f"Kategori silinirken hata: {str(e)}")
    
    print(f"Toplam {deleted} boş kategori silindi.")
    return deleted

if __name__ == "__main__":
    try:
        print("VERİTABANI TEMİZLEME İŞLEMİ")
        print("==========================")
        print("Başlangıç durumu:")
        print(f"- Kullanıcı sayısı: {User.objects.count()}")
        print(f"- Kategori sayısı: {Category.objects.count()}")
        print(f"- Kullanıcı kategori ilerleme kayıtları: {UserCategoryProgress.objects.count()}")
        print(f"- Toplam kelime sayısı: {Word.objects.count()}")
        
        # Adım 1: Kullanıcı kategori ilerleme tablosunu düzelt
        fix_user_category_progress()
        
        # Adım 2: Tekrarlanan kategorileri temizle
        clean_duplicate_categories()
        
        # Adım 3: Boş kategorileri temizle
        clean_empty_categories()
        
        print("\nİşlem tamamlandı.")
        print("Güncel durum:")
        print(f"- Kullanıcı sayısı: {User.objects.count()}")
        print(f"- Kategori sayısı: {Category.objects.count()}")
        print(f"- Kullanıcı kategori ilerleme kayıtları: {UserCategoryProgress.objects.count()}")
        print(f"- Toplam kelime sayısı: {Word.objects.count()}")
        
    except Exception as e:
        logger.error(f"İşlem sırasında hata: {str(e)}")
        print(f"HATA: {str(e)}") 