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

# Toys resmi için alternatif URL
TOYS_IMAGE_URL = "https://images.pexels.com/photos/3662667/pexels-photo-3662667.jpeg"

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

def update_toys_image():
    """Toys kategorisinin resmini güncelle"""
    print("Toys kategorisi resmi güncelleme işlemi başlatılıyor...")
    
    # Toys kategorisini bul
    try:
        toys_category = Category.objects.get(name__iexact="Toys")
        print(f"Toys kategorisi bulundu (ID: {toys_category.id}).")
    except Category.DoesNotExist:
        print("Toys kategorisi bulunamadı!")
        return
    except Category.MultipleObjectsReturned:
        print("Birden fazla Toys kategorisi bulundu, ilki kullanılacak.")
        toys_category = Category.objects.filter(name__iexact="Toys").first()
    
    # Resmi indir
    image_content = download_image(TOYS_IMAGE_URL)
    
    if not image_content:
        print(f"Toys kategorisi için resim indirilemedi.")
        return
            
    # Geçici dosya oluştur
    image_file = ContentFile(image_content)
    
    # Dosya adını ayarla
    filename = f"category_{toys_category.id}_toys.jpg"
    
    # Kategori modeline resmi kaydet
    toys_category.image.save(filename, image_file, save=True)
    
    print(f"Toys kategorisinin resmi başarıyla güncellendi.")

if __name__ == "__main__":
    update_toys_image()
    print("İşlem tamamlandı.") 