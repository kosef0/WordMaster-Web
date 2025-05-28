#!/usr/bin/env python
import os
import sys
import django
import requests
import time
from pathlib import Path

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from core.models import Category
from django.conf import settings
from django.core.files.base import ContentFile

# Eksik resimler için alternatif URL'ler
MISSING_IMAGES = {
    "colors": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    "renkler": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    "okul": "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg",
    "toys": "https://images.pexels.com/photos/163696/pexels-photo-163696.jpeg",
    "milliyet": "https://images.pexels.com/photos/1174136/pexels-photo-1174136.jpeg",
    "greetings": "https://images.pexels.com/photos/5329056/pexels-photo-5329056.jpeg"
}

def download_image(image_url):
    """URL'den resim indir ve içerik olarak döndür"""
    try:
        print(f"İndiriliyor: {image_url}")
        
        # User-Agent ekleyerek 403 hatalarını önle
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        img_response = requests.get(image_url, headers=headers, stream=True)
        img_response.raise_for_status()
        
        return img_response.content
        
    except Exception as e:
        print(f"Hata: {e}")
        return None

def update_missing_images():
    """Eksik kalan kategori resimlerini güncelle"""
    print("Eksik kategori resimlerini güncelleme işlemi başlatılıyor...")
    
    # Media klasörünü kontrol et ve olmayan klasörleri oluştur
    category_images_dir = os.path.join(settings.MEDIA_ROOT, 'category_images')
    os.makedirs(category_images_dir, exist_ok=True)
    
    # Eksik resimleri güncelle
    updated = 0
    failed = 0
    
    for category_name, image_url in MISSING_IMAGES.items():
        print(f"\nAranıyor: '{category_name}'...")
        
        # Bu ismi içeren kategorileri bul (tam eşleşme veya içeriyor olarak)
        categories = Category.objects.filter(name__icontains=category_name)
        
        if not categories.exists():
            print(f"'{category_name}' adını içeren kategori bulunamadı.")
            continue
        
        for category in categories:
            print(f"{category.name} kategorisi güncelleniyor...")
            
            # Resmi indir
            image_content = download_image(image_url)
            
            if not image_content:
                print(f"{category.name} için resim indirilemedi.")
                failed += 1
                continue
                
            # Geçici dosya oluştur
            image_file = ContentFile(image_content)
            
            # Dosya adını ayarla
            filename = f"category_{category.id}_{category.name.lower().replace(' ', '_')}.jpg"
            
            # Kategori modeline resmi kaydet
            category.image.save(filename, image_file, save=True)
            
            print(f"{category.name} kategorisinin resmi güncellendi.")
            updated += 1
            
            # Kısa bir bekleme ekle (sunucu kısıtlamalarını önlemek için)
            time.sleep(0.5)
    
    print(f"\nİşlem tamamlandı:")
    print(f"{updated} kategori resmi güncellendi")
    print(f"{failed} kategori güncellenemedi")

if __name__ == "__main__":
    update_missing_images()
    print("İşlem tamamlandı.") 