#!/usr/bin/env python
import os
import sys
import django

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from core.models import Category, Word, UserProgress, UserCategoryProgress

def delete_specific_categories():
    """'Hobbies' ve 'School' kategorilerini sil"""
    # Silinecek kategoriler
    categories_to_delete = ['Hobbies', 'School']
    
    print(f"Silinecek kategoriler: {', '.join(categories_to_delete)}")
    
    for category_name in categories_to_delete:
        # Kategori adını içeren tüm kategorileri bul
        categories = Category.objects.filter(name__icontains=category_name)
        
        if not categories.exists():
            print(f"'{category_name}' adında kategori bulunamadı.")
            continue
        
        print(f"\n'{category_name}' adında {categories.count()} kategori bulundu:")
        
        for category in categories:
            word_count = Word.objects.filter(category=category).count()
            print(f"  - ID: {category.id}, Adı: '{category.name}', İçerik: {word_count} kelime")
            
            # Kategori ile ilişkili kelimeleri bul
            words = Word.objects.filter(category=category)
            
            # Her kelimeye ait ilerleme kayıtlarını sil
            for word in words:
                UserProgress.objects.filter(word=word).delete()
                word.delete()
                
            # Kategori ilerleme kayıtlarını sil
            UserCategoryProgress.objects.filter(category=category).delete()
            
            # Kategoriyi sil
            category_id = category.id
            category.delete()
            print(f"  => '{category.name}' (ID: {category_id}) silindi.")

if __name__ == "__main__":
    print("HOBBIES VE SCHOOL KATEGORİLERİNİ SİLME")
    print("=====================================")
    
    delete_specific_categories()
    
    print("\nİşlem tamamlandı.")
    print(f"Güncel kategori sayısı: {Category.objects.count()}")
    print(f"Güncel kelime sayısı: {Word.objects.count()}") 