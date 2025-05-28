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
from core.models import Category, Word
from django.db.models import Count

# Kaç kategori var?
categories = Category.objects.all()
print(f"Toplam {categories.count()} kategori var:")

# Her kategori için kelime sayısını göster
for category in categories:
    word_count = Word.objects.filter(category=category).count()
    print(f"  - {category.name}: {word_count} kelime")

# Toplam kelime sayısı
total_words = Word.objects.count()
print(f"\nToplam {total_words} kelime var.")

# Her dil seviyesine göre kelime sayısı
difficulty_counts = Word.objects.values('difficulty_level').annotate(count=Count('id')).order_by('difficulty_level')
difficulty_mapping = {1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2'}

print("\nZorluk seviyesine göre kelime dağılımı:")
for level in difficulty_counts:
    level_name = difficulty_mapping.get(level['difficulty_level'], 'Bilinmiyor')
    print(f"  - {level_name}: {level['count']} kelime")

# Bir kaç kelime örneği göster
print("\nBirkaç kelime örneği:")
for category in categories:
    words = Word.objects.filter(category=category)[:3]
    if words:
        print(f"\n{category.name} kategorisinden örnekler:")
        for word in words:
            print(f"  - {word.english} - {word.turkish}") 