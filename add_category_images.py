#!/usr/bin/env python
import os
import sys
import django
import requests
import random
from io import BytesIO
from django.core.files.base import ContentFile
from pathlib import Path

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from core.models import Category
from django.conf import settings

# Resimleri indirmek için temel URL
UNSPLASH_BASE_URL = "https://source.unsplash.com/featured/300x200/?{query}"

def download_image(query):
    """Unsplash'ten belirtilen sorgu için rastgele bir resim indir"""
    try:
        # URL'deki boşlukları değiştir
        formatted_query = query.replace(" ", "+")
        url = UNSPLASH_BASE_URL.format(query=formatted_query)
        
        # Resmi indir
        response = requests.get(url, stream=True)
        
        if response.status_code == 200:
            # Dosya adı oluştur
            file_name = f"{query.replace(' ', '_').lower()}.jpg"
            
            # Resim içeriğini ContentFile'a dönüştür
            image_content = ContentFile(response.content)
            
            return file_name, image_content
        else:
            print(f"Resim indirilemedi: {query}, HTTP Kodu: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"Hata: {str(e)}")
        return None, None

def ensure_media_dir():
    """Media dizininin varlığını kontrol et, yoksa oluştur"""
    media_dir = Path(settings.MEDIA_ROOT)
    category_images_dir = media_dir / 'category_images'
    
    if not media_dir.exists():
        media_dir.mkdir(parents=True, exist_ok=True)
        print(f"Media dizini oluşturuldu: {media_dir}")
    
    if not category_images_dir.exists():
        category_images_dir.mkdir(parents=True, exist_ok=True)
        print(f"Kategori resimleri dizini oluşturuldu: {category_images_dir}")

def add_images_to_categories():
    """Tüm kategorilere resim ekle"""
    ensure_media_dir()
    
    # Tüm kategorileri al
    categories = Category.objects.all()
    print(f"Toplam {categories.count()} kategori bulundu.")
    
    # Her kategori için resim ekle
    updated = 0
    skipped = 0
    
    for category in categories:
        # Eğer kategorinin zaten bir resmi varsa, atla
        if category.image and category.image.name:
            print(f"Kategori '{category.name}' zaten bir resme sahip, atlanıyor.")
            skipped += 1
            continue
        
        print(f"Kategori '{category.name}' için resim indiriliyor...")
        
        # Kategori adını sorgu olarak kullan
        file_name, image_content = download_image(category.name)
        
        if file_name and image_content:
            # Resmi kaydet
            category.image.save(file_name, image_content, save=True)
            print(f"Kategori '{category.name}' için resim eklendi: {file_name}")
            updated += 1
        else:
            # Resim indirilemezse, daha genel bir sorgu dene
            generic_query = "learning vocabulary language"
            file_name, image_content = download_image(generic_query)
            
            if file_name and image_content:
                category.image.save(f"generic_{category.id}_{file_name}", image_content, save=True)
                print(f"Kategori '{category.name}' için genel resim eklendi.")
                updated += 1
            else:
                print(f"Kategori '{category.name}' için resim eklenemedi!")
    
    print(f"\nİşlem tamamlandı!")
    print(f"- {updated} kategoriye resim eklendi")
    print(f"- {skipped} kategori zaten resme sahip olduğu için atlandı")

if __name__ == "__main__":
    print("KATEGORİLERE RESİM EKLEME ARACI")
    print("==============================")
    
    try:
        add_images_to_categories()
    except KeyboardInterrupt:
        print("\nİşlem kullanıcı tarafından iptal edildi.")
    except Exception as e:
        print(f"İşlem sırasında hata oluştu: {str(e)}") 