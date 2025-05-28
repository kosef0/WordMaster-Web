#!/usr/bin/env python
import os
import sys
import django

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from core.models import Category, Word

def delete_nationality_category():
    """Nationality (Milliyet) kategorisini ve ilişkili kelimeleri sil"""
    try:
        # Kategoriyi bul (hem İngilizce hem Türkçe adlarını kontrol et)
        categories = Category.objects.filter(name__in=['Nationality', 'Milliyet', 'nationality', 'milliyet'])
        
        if not categories.exists():
            print("Nationality/Milliyet kategorisi bulunamadı!")
            return
            
        total_deleted_words = 0
        
        for category in categories:
            # Kategori bilgilerini göster
            word_count = category.words.count()
            print(f"\nKategori: {category.name} (ID: {category.id})")
            print(f"Bu kategoride {word_count} kelime bulunuyor.")
            
            # Onay iste
            confirm = input(f"\nBu kategoriyi ve ilişkili {word_count} kelimeyi silmek istediğinizden emin misiniz? (e/h): ")
            
            if confirm.lower() != 'e':
                print("İşlem iptal edildi.")
                continue
                
            # Kategoriye ait kelimeleri sil
            words = category.words.all()
            for word in words:
                word.delete()
                total_deleted_words += 1
            
            # Kategoriyi sil
            category_name = category.name
            category.delete()
            print(f"{category_name} kategorisi ve {word_count} kelime başarıyla silindi.")
        
        print(f"\nToplam {len(categories)} kategori ve {total_deleted_words} kelime silindi.")
        
    except Exception as e:
        print(f"Hata oluştu: {str(e)}")

if __name__ == "__main__":
    print("NATIONALITY KATEGORİSİNİ SİLME ARACI")
    print("===================================")
    
    delete_nationality_category() 