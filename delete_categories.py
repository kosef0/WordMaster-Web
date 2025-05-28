#!/usr/bin/env python
import os
import sys
import django
import logging

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

# Model sınıflarını içe aktar
from core.models import Category, Word, UserCategoryProgress, LearningStep, UserStepProgress, UserProgress
from django.db import transaction

# Logging ayarları
logging.basicConfig(
    filename='delete_categories.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def delete_category_by_name(name):
    """İsme göre kategori sil"""
    try:
        # Belirtilen isimdeki tüm kategorileri bul
        categories = Category.objects.filter(name__icontains=name)
        
        if not categories.exists():
            print(f"'{name}' adında kategori bulunamadı.")
            return
        
        print(f"'{name}' adında {categories.count()} kategori bulundu:")
        
        for category in categories:
            word_count = Word.objects.filter(category=category).count()
            print(f"  - ID: {category.id}, Adı: '{category.name}', İçerik: {word_count} kelime")
        
        # Onay al
        confirm = input(f"\nYukarıdaki tüm '{name}' kategorilerini silmek istiyor musunuz? (E/H): ")
        
        if confirm.lower() != 'e':
            print("İşlem iptal edildi.")
            return
        
        # Kategorileri sil
        for category in categories:
            with transaction.atomic():
                # Önce kelimeleri ve ilerleme kayıtlarını sil
                words = Word.objects.filter(category=category)
                for word in words:
                    # Kelimenin ilerleme kayıtlarını sil
                    UserProgress.objects.filter(word=word).delete()
                    # Kelimeyi sil
                    word.delete()
                
                # Kategori ilerleme kayıtlarını sil
                UserCategoryProgress.objects.filter(category=category).delete()
                
                # Kategoriyi sil
                category_id = category.id
                category_name = category.name
                category.delete()
                print(f"Kategori silindi: '{category_name}' (ID: {category_id})")
        
        print(f"\n'{name}' adındaki kategoriler başarıyla silindi.")
        
    except Exception as e:
        print(f"Hata: {str(e)}")

if __name__ == "__main__":
    print("KATEGORİ SİLME ARACI")
    print("===================")
    
    if len(sys.argv) > 1:
        # Komut satırından gelen kategori isimlerini kullan
        for category_name in sys.argv[1:]:
            delete_category_by_name(category_name)
    else:
        # Etkileşimli olarak çalış
        while True:
            print("\nSilmek istediğiniz kategori ismini girin (Çıkış için 'q'):")
            category_name = input("> ")
            
            if category_name.lower() == 'q':
                print("Program sonlandırılıyor...")
                break
            
            delete_category_by_name(category_name)
    
    # Kalan kategori sayısını göster
    print(f"\nKalan kategori sayısı: {Category.objects.count()}")
    print(f"Kalan kelime sayısı: {Word.objects.count()}") 