#!/usr/bin/env python
import os
import sys
import django
import random
import urllib.request
import tempfile
from django.core.files import File
from pathlib import Path

# Django ortamını ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wordmaster.settings')
django.setup()

from core.models import Category
from django.conf import settings

# Kategori adları ile resim URLlerini eşleştiren sözlük
CATEGORY_IMAGES = {
    # Temel kategoriler
    "animals": "https://images.pexels.com/photos/47547/squirrel-animal-cute-rodents-47547.jpeg",
    "hayvanlar": "https://images.pexels.com/photos/47547/squirrel-animal-cute-rodents-47547.jpeg",
    
    "food": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
    "yiyecek": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
    "yiyecekler": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
    
    "clothes": "https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg",
    "kıyafet": "https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg",
    "kıyafetler": "https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg",
    
    "body": "https://images.pexels.com/photos/3621168/pexels-photo-3621168.jpeg",
    "vücut": "https://images.pexels.com/photos/3621168/pexels-photo-3621168.jpeg",
    "yüz": "https://images.pexels.com/photos/3621168/pexels-photo-3621168.jpeg",
    
    "color": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    "colors": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    "renk": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    "renkler": "https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg",
    
    "family": "https://images.pexels.com/photos/3807798/pexels-photo-3807798.jpeg",
    "aile": "https://images.pexels.com/photos/3807798/pexels-photo-3807798.jpeg",
    
    "friends": "https://images.pexels.com/photos/708440/pexels-photo-708440.jpeg",
    "arkadaş": "https://images.pexels.com/photos/708440/pexels-photo-708440.jpeg",
    "arkadaşlar": "https://images.pexels.com/photos/708440/pexels-photo-708440.jpeg",
    
    "health": "https://images.pexels.com/photos/4047186/pexels-photo-4047186.jpeg",
    "sağlık": "https://images.pexels.com/photos/4047186/pexels-photo-4047186.jpeg",
    
    "drink": "https://images.pexels.com/photos/1282275/pexels-photo-1282275.jpeg",
    "drinks": "https://images.pexels.com/photos/1282275/pexels-photo-1282275.jpeg",
    "içecek": "https://images.pexels.com/photos/1282275/pexels-photo-1282275.jpeg",
    "içecekler": "https://images.pexels.com/photos/1282275/pexels-photo-1282275.jpeg",
    
    "home": "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
    "house": "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
    "ev": "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg",
    
    "number": "https://images.pexels.com/photos/5088188/pexels-photo-5088188.jpeg",
    "numbers": "https://images.pexels.com/photos/5088188/pexels-photo-5088188.jpeg",
    "sayı": "https://images.pexels.com/photos/5088188/pexels-photo-5088188.jpeg",
    "sayılar": "https://images.pexels.com/photos/5088188/pexels-photo-5088188.jpeg",
    
    "material": "https://images.pexels.com/photos/413195/pexels-photo-413195.jpeg",
    "materials": "https://images.pexels.com/photos/413195/pexels-photo-413195.jpeg",
    "malzeme": "https://images.pexels.com/photos/413195/pexels-photo-413195.jpeg",
    "malzemeler": "https://images.pexels.com/photos/413195/pexels-photo-413195.jpeg",
    
    "school": "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg",
    "okul": "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg",
    
    "sport": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg",
    "sports": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg",
    "spor": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg",
    "sporlar": "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg",
    
    "place": "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    "places": "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    "yer": "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    "yerler": "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    
    "event": "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg",
    "events": "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg",
    "olay": "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg",
    "olaylar": "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg",
    
    "direction": "https://images.pexels.com/photos/697662/pexels-photo-697662.jpeg",
    "directions": "https://images.pexels.com/photos/697662/pexels-photo-697662.jpeg",
    "yön": "https://images.pexels.com/photos/697662/pexels-photo-697662.jpeg",
    "yönler": "https://images.pexels.com/photos/697662/pexels-photo-697662.jpeg",
    
    "transport": "https://images.pexels.com/photos/385998/pexels-photo-385998.jpeg",
    "transportation": "https://images.pexels.com/photos/385998/pexels-photo-385998.jpeg",
    "ulaşım": "https://images.pexels.com/photos/385998/pexels-photo-385998.jpeg",
    
    "weather": "https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg",
    "hava": "https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg",
    "hava durumu": "https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg",
    
    "work": "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
    "iş": "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
    
    "toy": "https://images.pexels.com/photos/163696/toy-car-toy-box-mini-163696.jpeg",
    "toys": "https://images.pexels.com/photos/163696/toy-car-toy-box-mini-163696.jpeg",
    "oyuncak": "https://images.pexels.com/photos/163696/toy-car-toy-box-mini-163696.jpeg",
    "oyuncaklar": "https://images.pexels.com/photos/163696/toy-car-toy-box-mini-163696.jpeg",
    
    "hobby": "https://images.pexels.com/photos/1749900/pexels-photo-1749900.jpeg",
    "hobbies": "https://images.pexels.com/photos/1749900/pexels-photo-1749900.jpeg",
    "hobi": "https://images.pexels.com/photos/1749900/pexels-photo-1749900.jpeg",
    "hobiler": "https://images.pexels.com/photos/1749900/pexels-photo-1749900.jpeg",
    
    # Daha soyut kategoriler
    "suggestion": "https://images.pexels.com/photos/6375/quote-chalk.jpg",
    "suggestions": "https://images.pexels.com/photos/6375/quote-chalk.jpg",
    "öneri": "https://images.pexels.com/photos/6375/quote-chalk.jpg",
    "öneriler": "https://images.pexels.com/photos/6375/quote-chalk.jpg",
    
    "personal information": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    "kişisel bilgi": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    "kişisel bilgiler": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    
    "nationality": "https://images.pexels.com/photos/1174136/pexels-photo-1174136.jpeg",
    "milliyet": "https://images.pexels.com/photos/1174136/pexels-photo-1174136.jpeg",
    
    "occupation": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    "meslek": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    "meslekler": "https://images.pexels.com/photos/3760072/pexels-photo-3760072.jpeg",
    
    "routine": "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg",
    "routines": "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg",
    "rutin": "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg",
    "rutinler": "https://images.pexels.com/photos/6787202/pexels-photo-6787202.jpeg",
    
    "basic needs": "https://images.pexels.com/photos/1028637/pexels-photo-1028637.jpeg",
    "temel ihtiyaçlar": "https://images.pexels.com/photos/1028637/pexels-photo-1028637.jpeg",
    
    "time": "https://images.pexels.com/photos/745365/pexels-photo-745365.jpeg",
    "zaman": "https://images.pexels.com/photos/745365/pexels-photo-745365.jpeg",
    
    "greeting": "https://images.pexels.com/photos/5329056/pexels-photo-5329056.jpeg",
    "greetings": "https://images.pexels.com/photos/5329056/pexels-photo-5329056.jpeg",
    "selamlama": "https://images.pexels.com/photos/5329056/pexels-photo-5329056.jpeg",
    "selamlamalar": "https://images.pexels.com/photos/5329056/pexels-photo-5329056.jpeg",
    
    "question": "https://images.pexels.com/photos/5428833/pexels-photo-5428833.jpeg",
    "questions": "https://images.pexels.com/photos/5428833/pexels-photo-5428833.jpeg",
    "soru": "https://images.pexels.com/photos/5428833/pexels-photo-5428833.jpeg",
    "sorular": "https://images.pexels.com/photos/5428833/pexels-photo-5428833.jpeg",
}

# Varsayılan resim
DEFAULT_IMAGE_URL = "https://images.pexels.com/photos/267669/pexels-photo-267669.jpeg"

def download_image(url, category_name):
    """URL'den resim indir ve geçici dosya olarak kaydet"""
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        
        # Resmi indir
        urllib.request.urlretrieve(url, temp_file.name)
        
        return temp_file.name
    except Exception as e:
        print(f"Hata ({category_name}): {str(e)}")
        return None

def get_image_url_for_category(category_name):
    """Kategori adına göre uygun resim URL'sini bul"""
    normalized_name = category_name.lower()
    
    # Tam eşleşme kontrolü
    if normalized_name in CATEGORY_IMAGES:
        return CATEGORY_IMAGES[normalized_name]
    
    # Kısmi eşleşme kontrolü (category_name, diğer anahtar kelimelerin bir parçası mı)
    for key, url in CATEGORY_IMAGES.items():
        if key in normalized_name or normalized_name in key:
            return url
    
    # Eşleşme yoksa varsayılan resmi döndür
    return DEFAULT_IMAGE_URL

def add_images_to_categories():
    """Tüm kategorilere resim ekle"""
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
        
        # Kategori adına göre resim URL'sini bul
        url = get_image_url_for_category(category.name)
        
        # Resmi indir
        image_path = download_image(url, category.name)
        
        if image_path:
            # Resmi Django modeline ekle
            with open(image_path, 'rb') as f:
                filename = f"{category.name.lower().replace(' ', '_')}.jpg"
                category.image.save(filename, File(f), save=True)
            
            # Geçici dosyayı sil
            os.unlink(image_path)
            
            print(f"Kategori '{category.name}' için resim eklendi.")
            updated += 1
        else:
            print(f"Kategori '{category.name}' için resim eklenemedi!")
    
    print(f"\nİşlem tamamlandı!")
    print(f"- {updated} kategoriye resim eklendi")
    print(f"- {skipped} kategori zaten resme sahip olduğu için atlandı")
    print(f"- {categories.count() - updated - skipped} kategoriye resim eklenemedi")

if __name__ == "__main__":
    print("KATEGORİLERE RESİM EKLEME ARACI")
    print("==============================")
    
    try:
        add_images_to_categories()
    except KeyboardInterrupt:
        print("\nİşlem kullanıcı tarafından iptal edildi.")
    except Exception as e:
        print(f"İşlem sırasında hata oluştu: {str(e)}") 