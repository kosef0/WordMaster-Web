from django.core.management.base import BaseCommand
from core.models import Category, Word

class Command(BaseCommand):
    help = 'SQLite veritabanını örnek verilerle doldurur'

    def handle(self, *args, **kwargs):
        # Kategorileri ekle
        self.stdout.write(self.style.SUCCESS('Kategoriler ekleniyor...'))
        
        category_data = [
            {
                "name": "İş İngilizcesi",
                "description": "İş hayatında sıkça kullanılan kelimeler ve terimler.",
                "image": "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=500"
            },
            {
                "name": "Günlük Konuşma",
                "description": "Günlük hayatta sıkça kullanılan kelimeler ve ifadeler.",
                "image": "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=500"
            },
            {
                "name": "Seyahat İngilizcesi",
                "description": "Seyahat ederken ihtiyaç duyabileceğiniz kelimeler ve ifadeler.",
                "image": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=500"
            },
            {
                "name": "Akademik İngilizce",
                "description": "Akademik çalışmalar ve sunumlar için gereken kelimeler.",
                "image": "https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?q=80&w=500"
            },
            {
                "name": "Teknoloji Terimleri",
                "description": "Bilgisayar ve internet dünyasında sıkça kullanılan terimler.",
                "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=500"
            }
        ]
        
        categories = {}
        for cat_data in category_data:
            category, created = Category.objects.get_or_create(
                name=cat_data["name"],
                defaults={
                    "description": cat_data["description"],
                    "image": cat_data["image"],
                    "difficulty_level": 1,
                    "order": 0
                }
            )
            categories[cat_data["name"]] = category
            if created:
                self.stdout.write(f"Kategori eklendi: {category.name}")
            else:
                self.stdout.write(f"Kategori güncellendi: {category.name}")
        
        # Kelimeleri ekle
        self.stdout.write(self.style.SUCCESS('Kelimeler ekleniyor...'))
        
        # İş İngilizcesi kategorisine kelimeler
        business_words = [
            {"english": "meeting", "turkish": "toplantı", "definition": "A gathering of people for discussion", "example_sentence": "We have a meeting at 2 PM."},
            {"english": "deadline", "turkish": "son teslim tarihi", "definition": "A time or date by which something must be completed", "example_sentence": "The deadline for this project is Friday."},
            {"english": "negotiate", "turkish": "müzakere etmek", "definition": "To discuss something to reach an agreement", "example_sentence": "We need to negotiate the terms of the contract."},
            {"english": "budget", "turkish": "bütçe", "definition": "An estimate of income and expenditure", "example_sentence": "The company has a limited budget this year."},
            {"english": "stakeholder", "turkish": "paydaş", "definition": "A person with an interest or concern in something", "example_sentence": "We need to inform all stakeholders about the changes."}
        ]
        
        self._add_words_to_category(business_words, categories["İş İngilizcesi"])
        
        # Günlük Konuşma kategorisine kelimeler
        daily_words = [
            {"english": "awesome", "turkish": "harika", "definition": "Extremely impressive or daunting", "example_sentence": "That movie was awesome!"},
            {"english": "actually", "turkish": "aslında", "definition": "In fact or reality", "example_sentence": "I actually prefer tea to coffee."},
            {"english": "basically", "turkish": "temel olarak", "definition": "In the most essential respects", "example_sentence": "Basically, we need to start again."},
            {"english": "literally", "turkish": "tam anlamıyla", "definition": "In a literal manner or sense", "example_sentence": "I was literally shocked when I heard the news."},
            {"english": "anyway", "turkish": "neyse", "definition": "Used to change the subject or resume a subject", "example_sentence": "Anyway, let's talk about something else."}
        ]
        
        self._add_words_to_category(daily_words, categories["Günlük Konuşma"])
        
        # Seyahat İngilizcesi kategorisine kelimeler
        travel_words = [
            {"english": "accommodation", "turkish": "konaklama", "definition": "A place to stay", "example_sentence": "We need to book accommodation for our trip."},
            {"english": "luggage", "turkish": "bagaj", "definition": "Suitcases or bags used for travel", "example_sentence": "My luggage was lost at the airport."},
            {"english": "itinerary", "turkish": "seyahat planı", "definition": "A planned route or journey", "example_sentence": "Our itinerary includes three cities in ten days."},
            {"english": "currency", "turkish": "para birimi", "definition": "A system of money in use in a country", "example_sentence": "Make sure you exchange your currency before the trip."},
            {"english": "reservation", "turkish": "rezervasyon", "definition": "An arrangement to have something held for someone", "example_sentence": "I made a reservation at that restaurant."}
        ]
        
        self._add_words_to_category(travel_words, categories["Seyahat İngilizcesi"])
        
        # Akademik İngilizce kategorisine kelimeler
        academic_words = [
            {"english": "hypothesis", "turkish": "hipotez", "definition": "A proposed explanation for a phenomenon", "example_sentence": "His hypothesis was supported by experimental data."},
            {"english": "empirical", "turkish": "ampirik", "definition": "Based on observation or experience", "example_sentence": "The study provides empirical evidence for the theory."},
            {"english": "methodology", "turkish": "metodoloji", "definition": "A system of methods used in a particular area of study", "example_sentence": "The paper describes the methodology used in the research."},
            {"english": "critique", "turkish": "eleştiri", "definition": "A detailed analysis and assessment", "example_sentence": "She wrote a critique of the author's last book."},
            {"english": "paradigm", "turkish": "paradigma", "definition": "A typical example or pattern of something", "example_sentence": "This discovery created a new paradigm in physics."}
        ]
        
        self._add_words_to_category(academic_words, categories["Akademik İngilizce"])
        
        # Teknoloji Terimleri kategorisine kelimeler
        tech_words = [
            {"english": "algorithm", "turkish": "algoritma", "definition": "A process or set of rules to be followed in calculations", "example_sentence": "The search engine uses a complex algorithm."},
            {"english": "bandwidth", "turkish": "bant genişliği", "definition": "The capacity for data transfer of a network", "example_sentence": "This application requires high bandwidth."},
            {"english": "encryption", "turkish": "şifreleme", "definition": "The process of converting information into a code", "example_sentence": "The data is protected by encryption."},
            {"english": "interface", "turkish": "arayüz", "definition": "A point where two systems meet and interact", "example_sentence": "The new interface is more user-friendly."},
            {"english": "cloud computing", "turkish": "bulut bilişim", "definition": "The practice of using remote servers for storing data", "example_sentence": "Many businesses are moving to cloud computing."}
        ]
        
        self._add_words_to_category(tech_words, categories["Teknoloji Terimleri"])
        
        self.stdout.write(self.style.SUCCESS('Veri doldurma işlemi tamamlandı!'))
    
    def _add_words_to_category(self, words_data, category):
        for word_data in words_data:
            word, created = Word.objects.get_or_create(
                english=word_data["english"],
                category=category,
                defaults={
                    "turkish": word_data["turkish"],
                    "definition": word_data.get("definition", ""),
                    "example_sentence": word_data.get("example_sentence", ""),
                    "image": "",  # Varsayılan boş bırakıldı
                    "difficulty_level": 1
                }
            )
            if created:
                self.stdout.write(f"Kelime eklendi: {word.english} - {word.turkish}")
            else:
                self.stdout.write(f"Kelime güncellendi: {word.english} - {word.turkish}") 