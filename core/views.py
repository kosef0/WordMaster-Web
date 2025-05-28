from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Count, Sum, Avg
import random
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
import logging
from django.http import HttpResponse, JsonResponse, Http404
import tempfile
import os
from gtts import gTTS
import json
from django.conf import settings
from django.urls import path
import requests
import time
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

from .models import (
    Category, Word, UserProgress, Quiz, QuizQuestion, 
    UserAchievement, UserProfile, LearningPath, LearningPathCategory,
    LearningStep, UserStepProgress, UserCategoryProgress, GameScore,
    ChatMessage, ChatPracticeProgress
)

# Google API anahtarını çevre değişkeninden al
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# API için endpoint ve model adı
MODEL_NAME = 'gemini-1.5-flash-latest'  # Varsayılan model
ALTERNATIVE_MODELS = [
    'gemini-1.5-flash-latest',
    'gemini-1.0-pro-vision-latest',
    'gemini-1.5-pro-latest',
]

# İstek limitleri için değişkenler
last_request_time = 0
REQUEST_THROTTLE_MS = 3000  # 3 saniye

def home(request):
    """Ana sayfa görünümü"""
    try:
        # İletişim formu post edilmişse
        if request.method == 'POST' and 'contact_form' in request.POST:
            name = request.POST.get('name', '')
            email = request.POST.get('email', '')
            subject = request.POST.get('subject', '')
            message = request.POST.get('message', '')
            
            # Burada mesaj gönderme fonksiyonu eklenebilir
            
            messages.success(request, 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.')
            return redirect('home')
    
        # SQLite veritabanından kategorileri al
        categories = Category.objects.all().order_by('name')
        
        # Toplam kelime sayısını hesapla
        total_words = Word.objects.count()
        
        # Eğer kullanıcı giriş yapmışsa, ilerleme bilgilerini göster
        user_progress = None
        learned_words_count = 0
        
        if request.user.is_authenticated:
            # Öğrenilen kelime sayısını hesapla (proficiency_level >= 3 olanlar)
            learned_words_count = UserProgress.objects.filter(
                user=request.user, 
                proficiency_level__gte=3
            ).count()
            
            # Son 7 günlük ilerleme
            last_week_progress = UserProgress.objects.filter(
                user=request.user,
                last_reviewed__gte=timezone.now() - timedelta(days=7)
            ).values('last_reviewed__date').annotate(
                count=Count('id')
            ).order_by('last_reviewed__date')
            
            user_progress = {
                'learned': learned_words_count,
                'total': total_words,
                'percentage': int((learned_words_count / total_words * 100) if total_words > 0 else 0),
                'last_week': list(last_week_progress)
            }
            
            # Kullanıcı profili yoksa oluştur
            if not hasattr(request.user, 'profile'):
                UserProfile.objects.create(user=request.user)
        
        context = {
            'categories': categories,
            'total_words': total_words,
            'learned_words_count': learned_words_count,
            'user_progress': user_progress
        }
        return render(request, 'core/home.html', context)
        
    except Exception as e:
        logger.error(f"Ana sayfa görüntülenirken hata: {str(e)}")
        return redirect('login')



def register(request):
    """Kullanıcı kayıt görünümü"""
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            UserProfile.objects.create(user=user)
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, 'Hesabınız başarıyla oluşturuldu!')
            return redirect('home')
    else:
        form = UserCreationForm()
    
    return render(request, 'core/register.html', {'form': form})

def user_login(request):
    """Kullanıcı giriş görünümü"""
    if request.user.is_authenticated:
        return redirect('home')
        
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request=request, username=username, password=password)
            if user is not None:
                login(request, user)
                
                # Kullanıcı streak günlerini güncelle
                if hasattr(user, 'profile'):
                    profile = user.profile
                    last_activity = profile.last_activity
                    now = timezone.now()
                    
                    # Eğer son aktivite bugün değilse ve dünden ise streak'i arttır
                    if last_activity.date() != now.date():
                        if last_activity.date() == (now - timedelta(days=1)).date():
                            profile.streak_days += 1
                        else:
                            # Eğer bir günden fazla boşluk varsa streak'i sıfırla
                            profile.streak_days = 1
                        profile.save()
                
                return redirect('home')
    else:
        form = AuthenticationForm()
    
    return render(request, 'core/login.html', {'form': form})

@login_required
def user_logout(request):
    """Kullanıcı çıkış görünümü"""
    logout(request)
    return redirect('home')

def category_list(request):
    """Kategori listesi görünümü"""
    try:
        # SQLite veritabanından kategorileri al
        categories = Category.objects.all().order_by('name')
        
        # Kategorilere göre ilerleme durumunu hesapla
        category_progress = []
        
        if request.user.is_authenticated:
            # Her kategori için ilerleme hesapla
            for category in categories:
                # Kategorideki kelimeleri al
                words = Word.objects.filter(category=category)
                total_words = words.count()
                
                # Öğrenilen kelime sayısını hesapla (proficiency_level >= 3 olanlar)
                learned_words = UserProgress.objects.filter(
                    user=request.user,
                    word__category=category,
                    proficiency_level__gte=3
                ).count()
                
                # Yüzde hesapla
                percentage = int((learned_words / total_words * 100) if total_words > 0 else 0)
                
                # Kategori ilerlemesi
                category_progress.append({
                    'category': category,
                    'learned': learned_words,
                    'total': total_words,
                    'percentage': percentage
                })
        
        return render(request, 'core/category_list.html', {
            'categories': categories,
            'category_progress': category_progress
        })
    except Exception as e:
        logger.error(f"Kategori listesi görüntülenirken hata: {str(e)}")
        categories = Category.objects.all().order_by('name')
        return render(request, 'core/category_list.html', {'categories': categories})

def category_detail(request, category_id):
    """Kategori detay görünümü"""
    try:
        # Kategori ID'sini kontrol et ve kategoriyi bul
        category = get_object_or_404(Category, id=category_id)
            
        # Filtreleme parametrelerini al
        proficiency = request.GET.get('proficiency', '')
        search = request.GET.get('search', '')
        sort = request.GET.get('sort', 'english')
        
        # Temel sorgu
        words_query = Word.objects.filter(category=category)
        
        # Sorgu sonucunu logla
        logger.info(f"Kategori: {category.name} için {words_query.count()} kelime bulundu")
        
        # Arama filtresi
        if search:
            words_query = words_query.filter(
                Q(english__icontains=search) | 
                Q(turkish__icontains=search)
            )
        
        # Sıralama
        words_query = words_query.order_by(sort)
        
        # Kullanıcı ilerleme bilgisini getir ve kelimelere ekle
        if request.user.is_authenticated:
            # Kategori için toplam ilerleme hesapla
            total_words = words_query.count()
            learned_words = UserProgress.objects.filter(
                user=request.user,
                word__category=category,
                proficiency_level__gte=3
            ).count()
            
            percentage = int((learned_words / total_words * 100) if total_words > 0 else 0)
            
            progress = {
                'learned': learned_words,
                'total': total_words,
                'percentage': percentage
            }
            
            # Her kelime için kullanıcının ilerleme bilgisini getir
            user_progress = UserProgress.objects.filter(user=request.user)
            
            # Proficiency filtresini uygula
            if proficiency:
                # Önce kullanıcının ilerleme kaydı olan kelimeleri filtrele
                progress_word_ids = user_progress.filter(
                    proficiency_level=int(proficiency)
                ).values_list('word_id', flat=True)
                
                # Sonra bu kelime ID'lerine göre filtrele
                words_query = words_query.filter(id__in=progress_word_ids)
            
            # Kelimelere ilerleme bilgisini ekle
            words_with_progress = []
            for word in words_query:
                word_progress = user_progress.filter(word=word).first()
                word.user_progress = word_progress
                words_with_progress.append(word)
        else:
            words_with_progress = list(words_query)
            progress = None
        
        # Sayfalama
        paginator = Paginator(words_with_progress, 12)  # Her sayfada 12 kelime
        page_number = request.GET.get('page', 1)
        
        try:
            words = paginator.page(page_number)
        except PageNotAnInteger:
            words = paginator.page(1)
        except EmptyPage:
            words = paginator.page(paginator.num_pages)
        
        context = {
            'category': category,
            'words': words,
            'progress': progress,
            'proficiency': proficiency,
            'search': search,
            'sort': sort
        }
        
        return render(request, 'core/category_detail.html', context)
    except Exception as e:
        logger.error(f"Kategori detayı görüntülenirken hata: {str(e)}")
        raise Http404("Kategori görüntülenirken bir hata oluştu")
    
def original_category_detail(request, category_id):
    """Orijinal Django ORM tabanlı kategori detay görünümü"""
    try:
        # Sayısal ID kontrol et
        if isinstance(category_id, str) and not category_id.isdigit():
            # MongoDB ID için Django'da eşleşen kategoriyi bul
            if len(category_id) == 24:  # MongoDB ObjectId formatı
                # Mongo ID'ye sahip kategorileri ara
                django_category = Category.objects.filter(mongo_id=category_id).first()
                if django_category:
                    category = django_category
                else:
                    # Eşleşen kategori yoksa 404 hatası ver
                    raise Http404("Kategori bulunamadı")
            else:
                raise Http404("Geçersiz kategori ID")
        else:
            # Sayısal ID ile kategoriyi bul
            category = get_object_or_404(Category, id=category_id)
    
            # Filtreleme parametrelerini al
            proficiency = request.GET.get('proficiency', '')
            search = request.GET.get('search', '')
            sort = request.GET.get('sort', 'english')
    
            # Temel sorgu
            words_query = Word.objects.filter(category=category)
                
            # Sorgu sonucunu logla
            logger.info(f"Kategori: {category.name} için {words_query.count()} kelime bulundu")
    
            # Arama filtresi
            if search:
                words_query = words_query.filter(
                    Q(english__icontains=search) | 
                    Q(turkish__icontains=search)
                )
    
            # Sıralama
            words_query = words_query.order_by(sort)
    
            # Kullanıcı ilerleme bilgisini getir ve kelimelere ekle
            if request.user.is_authenticated:
                # Kategori için toplam ilerleme hesapla
                total_words = words_query.count()
                learned_words = UserProgress.objects.filter(
                    user=request.user,
                    word__category=category,
                    proficiency_level__gte=3
                ).count()
                
                percentage = int((learned_words / total_words * 100) if total_words > 0 else 0)
                
                progress = {
                    'learned': learned_words,
                    'total': total_words,
                    'percentage': percentage
                }
                
                # Her kelime için kullanıcının ilerleme bilgisini getir
                user_progress = UserProgress.objects.filter(user=request.user)
                
                # Proficiency filtresini uygula
                if proficiency:
                    # Önce kullanıcının ilerleme kaydı olan kelimeleri filtrele
                    progress_word_ids = user_progress.filter(
                        proficiency_level=int(proficiency)
                    ).values_list('word_id', flat=True)
                    
                    # Sonra bu kelime ID'lerine göre filtrele
                    words_query = words_query.filter(id__in=progress_word_ids)
                
                # Kelimelere ilerleme bilgisini ekle
                words_with_progress = []
                for word in words_query:
                    word_progress = user_progress.filter(word=word).first()
                    word.user_progress = word_progress
                    words_with_progress.append(word)
            else:
                words_with_progress = list(words_query)
                progress = None
    
            # Sayfalama
            paginator = Paginator(words_with_progress, 12)  # Her sayfada 12 kelime
            page_number = request.GET.get('page', 1)
    
            try:
                words = paginator.page(page_number)
            except PageNotAnInteger:
                words = paginator.page(1)
            except EmptyPage:
                words = paginator.page(paginator.num_pages)
    
            context = {
                'category': category,
                'words': words,
                'progress': progress,
                'proficiency': proficiency,
                'search': search,
                'sort': sort
            }
    
            return render(request, 'core/category_detail.html', context)
    except Http404:
        raise  # Http404 hatasını yeniden fırlat
    except Exception as e:
        logger.error(f"original_category_detail hatası: {str(e)}")
        raise Http404("Kategori görüntülenirken bir hata oluştu")

@login_required
def word_detail(request, word_id):
    """Kelime detay görünümü"""
    try:
        # SQLite veritabanından kelimeyi al
        word = get_object_or_404(Word, id=word_id)
    
        # Kullanıcının bu kelime için ilerlemesini getir veya oluştur
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            word=word,
            defaults={'proficiency_level': 0}
        )
    
        # İlgili kelimeler (aynı kategoriden)
        related_words = Word.objects.filter(
            category=word.category
        ).exclude(id=word.id).order_by('?')[:5]
    
        context = {
            'word': word,
            'progress': progress,
            'related_words': related_words
        }
        return render(request, 'core/word_detail.html', context)
    except Exception as e:
        logger.error(f"Kelime detayı görüntülenirken hata: {str(e)}")
        raise Http404("Kelime bulunamadı")

@login_required
def update_progress(request, word_id):
    """Kelime ilerleme durumunu güncelle"""
    try:
        # SQLite veritabanından kelimeyi al
        word = get_object_or_404(Word, id=word_id)
    
        if request.method == 'POST':
            # Form gönderildiğinde ilerleme seviyesini güncelle
            new_level = int(request.POST.get('level', 0))
            
            if 0 <= new_level <= 5:
                # Kullanıcının kelime ilerleme kaydını güncelle
                progress, created = UserProgress.objects.get_or_create(
                    user=request.user,
                    word=word,
                    defaults={'proficiency_level': new_level}
                )
                
                if not created:
                    progress.proficiency_level = new_level
                    progress.times_reviewed += 1
                    if new_level >= 5:
                        progress.is_mastered = True
                    progress.save()
                
                # Kullanıcının deneyim puanlarını güncelle
                if hasattr(request.user, 'profile'):
                    profile = request.user.profile
                    profile.experience_points += 5  # Her kelime incelemesi için 5 puan
                    
                    # Seviye kontrolü
                    if profile.experience_points >= profile.level * 100:
                        profile.level += 1
                        # Seviye yükseltme başarısı ekle
                        UserAchievement.objects.create(
                            user=request.user,
                            title=f"Seviye {profile.level}'e Ulaştın!",
                            description=f"Tebrikler! Seviye {profile.level}'e yükseldin."
                        )
                    
                    profile.save()
                
                messages.success(request, f"{word.english} kelimesi için ilerleme durumunuz güncellendi.")
            else:
                messages.error(request, "Geçersiz ilerleme seviyesi.")
            
            # Kullanıcıyı geldiği sayfaya geri gönder
            next_url = request.POST.get('next', 'category_detail')
            if next_url == 'category_detail':
                return redirect('category_detail', category_id=word.category.id)
            else:
                return redirect(next_url)
        else:
            # GET isteği için modal içeriğini göster
            progress = UserProgress.objects.filter(user=request.user, word=word).first()
            
            context = {
                'word': word,
                'progress': progress,
            }
            
            return render(request, 'core/update_progress.html', context)
    except Exception as e:
        logger.error(f"İlerleme güncellenirken hata: {str(e)}")
        raise Http404("Kelime bulunamadı")

@login_required
def quiz_start(request, category_id=None, quiz_type='multiple_choice'):
    """Quiz başlat"""
    try:
        # SQLite veritabanından kategori ve kelimeleri al
        if category_id:
            category = get_object_or_404(Category, id=category_id)
            words = Word.objects.filter(category=category)
        else:
            # Tüm kategorilerden kelimeler
            category = None
            words = Word.objects.all()
        
        # Kelime sayısı kontrolü
        if words.count() < 4:  # En az 4 kelime olmalı (1 doğru, 3 yanlış seçenek için)
            messages.error(request, "Quiz oluşturmak için yeterli kelime yok.")
            return redirect('dashboard')
        
        # Kullanıcının çalışması gereken kelimeleri belirle
        if request.user.is_authenticated:
            # Kullanıcının daha önce gördüğü ama henüz tam öğrenmediği kelimeler
            progress_words = UserProgress.objects.filter(
                user=request.user,
                proficiency_level__lt=5,  # Henüz tam öğrenilmemiş
                word__in=words
            ).values_list('word_id', flat=True)
            
            # Öncelikle çalışılması gereken kelimeler
            quiz_words = Word.objects.filter(id__in=progress_words)
            
            # Yeterli kelime yoksa, hiç çalışılmamış kelimelerden de ekle
            if quiz_words.count() < 10:
                not_studied_words = words.exclude(id__in=UserProgress.objects.filter(
                    user=request.user
                ).values_list('word_id', flat=True))
                
                # Hala yeterli kelime yoksa, tüm kelimelerden rastgele seç
                if (quiz_words.count() + not_studied_words.count()) < 10:
                    available_words = list(quiz_words) + list(not_studied_words)
                    # Eksik kalan kısmı rastgele kelimelerle doldur
                    additional_words = list(words.exclude(id__in=[w.id for w in available_words]))
                    remaining = min(10 - len(available_words), len(additional_words))
                    if remaining > 0:
                        available_words += random.sample(additional_words, remaining)
                    quiz_words = available_words[:10]
                else:
                    # Öğrenilmemiş kelimelerden rastgele seç ve ekle
                    additional_count = min(10 - quiz_words.count(), not_studied_words.count())
                    additional_words = list(not_studied_words.order_by('?')[:additional_count])
                    quiz_words = list(quiz_words) + additional_words
        else:
            # Giriş yapmamış kullanıcılar için rastgele kelimeler
            quiz_words = list(words.order_by('?')[:10])
        
        # Quiz nesnesi oluştur
        quiz = Quiz.objects.create(
            user=request.user if request.user.is_authenticated else None,
            category=category,
            quiz_type=quiz_type,
            max_score=len(quiz_words)
        )
        
        # Quiz soruları oluştur
        for word in quiz_words:
            QuizQuestion.objects.create(
                quiz=quiz,
                word=word
            )
        
        return redirect('quiz_question', quiz_id=quiz.id, question_number=1)
    except Exception as e:
        logger.error(f"Quiz başlatılırken hata: {str(e)}")
        return redirect('home')

@login_required
def quiz_start_category(request, category_id):
    """Belirli bir kategori için quiz başlat"""
    try:
        # SQLite veritabanından kategoriyi al
        category = get_object_or_404(Category, id=category_id)
        
        # Kategorideki kelimeleri al
        words = Word.objects.filter(category=category)
        
        # Kelime sayısı kontrolü
        if words.count() < 4:  # En az 4 kelime olmalı (1 doğru, 3 yanlış seçenek için)
            messages.error(request, "Quiz oluşturmak için yeterli kelime yok. En az 4 kelime gerekiyor.")
            return redirect('dashboard')
        
        # Quiz oluştur
        quiz = Quiz.objects.create(
            user=request.user,
            category=category,
            quiz_type='multiple_choice',  # Quiz tipini belirt
            max_score=min(words.count(), 10)  # En fazla 10 soru
        )
        
        # Soruları oluştur - en fazla 10 kelime
        quiz_words = list(words.order_by('?')[:10])
        
        for word in quiz_words:
            QuizQuestion.objects.create(
                quiz=quiz,
                word=word
            )
        
        # Quiz sorusu eklenebildi mi kontrol et
        if quiz.questions.count() == 0:
            quiz.delete()
            messages.error(request, "Quiz soruları oluşturulamadı. Lütfen daha sonra tekrar deneyin.")
            return redirect('dashboard')
        
        # İlk soruya yönlendir
        return redirect('quiz_question', quiz_id=quiz.id, question_number=1)
        
    except Exception as e:
        logger.error(f"Quiz başlatılırken hata: {str(e)}")
        messages.error(request, f"Quiz başlatılırken bir hata oluştu: {str(e)}")
        return redirect('dashboard')

@login_required
def quiz_question(request, quiz_id, question_number):
    """Quiz sorusu görünümü"""
    quiz = get_object_or_404(Quiz, id=quiz_id)
    
    # Quiz kullanıcıya ait değilse ana sayfaya yönlendir
    if quiz.user != request.user:
        return redirect('home')
    
    # Quiz tamamlanmışsa sonuç sayfasına yönlendir
    if quiz.completed:
        return redirect('quiz_result', quiz_id=quiz.id)
    
    # Soru numarası int olduğundan emin ol
    try:
        question_number = int(question_number)
    except ValueError:
        question_number = 1
    
    # Soru numarası geçerli aralıkta değilse düzelt
    total_questions = quiz.questions.count()
    
    if total_questions == 0:
        messages.error(request, "Bu quiz için soru bulunmuyor.")
        return redirect('dashboard')
        
    if question_number < 1:
        question_number = 1
        return redirect('quiz_question', quiz_id=quiz.id, question_number=question_number)
    elif question_number > total_questions:
        question_number = total_questions
        return redirect('quiz_question', quiz_id=quiz.id, question_number=question_number)
    
    # Soru nesnesini getir (0 tabanlı indeks için -1)
    try:
        question = quiz.questions.all()[question_number - 1]
    except IndexError:
        messages.error(request, "Quiz sorusu bulunamadı. Lütfen daha sonra tekrar deneyin.")
        return redirect('dashboard')
    
    # Quiz tipine göre yanıt seçenekleri hazırla
    options = []
    if quiz.quiz_type == 'multiple_choice':
        # Doğru cevap
        correct_word = question.word
        options.append(correct_word)
        
        # Diğer yanlış seçenekler (aynı kategoriden)
        category_words = Word.objects.filter(category=correct_word.category).exclude(id=correct_word.id)
        
        # Kategori kelimeleri yeterli değilse, diğer kategorilerden ekle
        if category_words.count() < 3:
            other_words = Word.objects.exclude(category=correct_word.category).exclude(id=correct_word.id)
            wrong_options = list(category_words) + list(other_words.order_by('?')[:3-category_words.count()])
        else:
            wrong_options = list(category_words.order_by('?')[:3])
        
        options.extend(wrong_options)
        # Seçenekleri karıştır
        random.shuffle(options)
    
    context = {
        'quiz': quiz,
        'question': question,
        'question_number': question_number,
        'total_questions': total_questions,
        'options': options,
    }
    
    return render(request, 'core/quiz_question.html', context)

@login_required
def quiz_answer(request, quiz_id, question_number):
    """Quiz cevabını işle"""
    if request.method != 'POST':
        return redirect('home')
    
    quiz = get_object_or_404(Quiz, id=quiz_id)
    
    # Quiz kullanıcıya ait değilse ana sayfaya yönlendir
    if quiz.user != request.user:
        return redirect('home')
    
    # Soru nesnesini getir
    total_questions = quiz.questions.count()
    if 1 <= question_number <= total_questions:
        question = quiz.questions.all()[question_number - 1]
        
        # Kullanıcı cevabını al
        user_answer = request.POST.get('answer', '')
        question.user_answer = user_answer
        
        # Cevabı kontrol et
        is_correct = False
        if quiz.quiz_type == 'multiple_choice':
            # Çoktan seçmeli soru için cevap kontrolü
            selected_word_id = int(user_answer) if user_answer.isdigit() else 0
            is_correct = (selected_word_id == question.word.id)
        elif quiz.quiz_type == 'writing':
            # Yazma sorusu için cevap kontrolü
            is_correct = user_answer.lower().strip() == question.word.turkish.lower().strip()
        
        # Sonucu kaydet
        question.is_correct = is_correct
        question.save()
        
        if is_correct:
            quiz.score += 1
            quiz.save()
        
        # İlerleme kaydını güncelle
        progress, created = UserProgress.objects.get_or_create(
            user=request.user,
            word=question.word,
            defaults={'proficiency_level': 1 if is_correct else 0}
        )
        
        if not created:
            # Doğru cevap verildiyse ilerleme seviyesini artır (maksimum 5)
            if is_correct and progress.proficiency_level < 5:
                progress.proficiency_level += 1
            # Yanlış cevap verildiyse ilerleme seviyesini azalt (minimum 0)
            elif not is_correct and progress.proficiency_level > 0:
                progress.proficiency_level -= 1
            
            progress.times_reviewed += 1
            progress.is_mastered = (progress.proficiency_level >= 5)
            progress.save()
        
        # Son soruya geldiyse quiz'i tamamla
        if question_number == total_questions:
            quiz.completed = True
            quiz.save()
            
            # Kullanıcı profilini güncelle
            if hasattr(request.user, 'profile'):
                profile = request.user.profile
                # Quiz puanına göre deneyim puanı ekle
                profile.experience_points += quiz.score * 10
                
                # Seviye kontrolü
                if profile.experience_points >= profile.level * 100:
                    profile.level += 1
                    # Seviye yükseltme başarısı ekle
                    UserAchievement.objects.create(
                        user=request.user,
                        title=f"Seviye {profile.level}'e Ulaştın!",
                        description=f"Tebrikler! Seviye {profile.level}'e yükseldin."
                    )
                
                profile.save()
            
            return redirect('quiz_result', quiz_id=quiz.id)
        else:
            # Sonraki soruya geç
            return redirect('quiz_question', quiz_id=quiz.id, question_number=question_number+1)
    
    return redirect('home')

@login_required
def quiz_result(request, quiz_id):
    """Quiz sonuç görünümü"""
    quiz = get_object_or_404(Quiz, id=quiz_id)
    
    # Quiz kullanıcıya ait değilse ana sayfaya yönlendir
    if quiz.user != request.user:
        return redirect('home')
    
    # Quizin tüm soruları
    questions = quiz.questions.all()
    
    # Yanlış cevap sayısı
    wrong_count = quiz.max_score - quiz.score
    
    # Quiz başarı yüzdesi
    success_percentage = (quiz.score / quiz.max_score * 100) if quiz.max_score > 0 else 0
    
    context = {
        'quiz': quiz,
        'questions': questions,
        'wrong_count': wrong_count,
        'success_percentage': success_percentage
    }
    
    return render(request, 'core/quiz_result.html', context)

@login_required
def profile(request):
    """Kullanıcı profil görünümü"""
    # Kullanıcı profili yoksa oluştur
    if not hasattr(request.user, 'profile'):
        profile = UserProfile.objects.create(user=request.user)
    else:
        profile = request.user.profile
    
    # Öğrenilen kelime sayısı
    learned_words_count = UserProgress.objects.filter(
        user=request.user, 
        proficiency_level__gte=3
    ).count()
    
    # Tamamlanmış quiz sayısı
    completed_quizzes = Quiz.objects.filter(
        user=request.user,
        completed=True
    ).count()
    
    # Son quizler
    recent_quizzes = Quiz.objects.filter(
        user=request.user,
        completed=True
    ).order_by('-date_taken')[:5]
    
    # Başarılar
    achievements = UserAchievement.objects.filter(user=request.user).order_by('-date_earned')
    
    # Bir sonraki seviye için gereken deneyim puanı
    next_level_exp = profile.level * 100
    exp_percentage = (profile.experience_points / next_level_exp * 100) if next_level_exp > 0 else 0
    
    context = {
        'profile': profile,
        'learned_words_count': learned_words_count,
        'completed_quizzes': completed_quizzes,
        'recent_quizzes': recent_quizzes,
        'achievements': achievements,
        'exp_percentage': exp_percentage,
        'next_level_exp': next_level_exp
    }
    
    return render(request, 'core/profile.html', context)

@login_required
def edit_profile(request):
    """Kullanıcı profil düzenleme görünümü"""
    # Kullanıcı profili yoksa oluştur
    if not hasattr(request.user, 'profile'):
        profile = UserProfile.objects.create(user=request.user)
    else:
        profile = request.user.profile
    
    if request.method == 'POST':
        form_type = request.POST.get('form_type')
        
        # Profil bilgilerini güncelleme
        if form_type == 'profile':
            # Kullanıcı bilgilerini güncelle
            user = request.user
            user.email = request.POST.get('email', user.email)
            user.first_name = request.POST.get('first_name', user.first_name)
            user.last_name = request.POST.get('last_name', user.last_name)
            
            try:
                user.save()
                
                # Profil bilgilerini güncelle
                profile.bio = request.POST.get('bio', profile.bio)
                profile.save()
                
                messages.success(request, 'Profil bilgileriniz başarıyla güncellendi.', extra_tags='profile_success')
            except Exception as e:
                messages.error(request, f'Profil güncellenirken bir hata oluştu: {str(e)}', extra_tags='profile_error')
        
        # Şifre değiştirme
        elif form_type == 'password':
            current_password = request.POST.get('current_password')
            new_password1 = request.POST.get('new_password1')
            new_password2 = request.POST.get('new_password2')
            
            # Şifre doğrulama
            if not request.user.check_password(current_password):
                messages.error(request, 'Mevcut şifreniz yanlış.', extra_tags='password_error')
            elif new_password1 != new_password2:
                messages.error(request, 'Yeni şifreler eşleşmiyor.', extra_tags='password_error')
            elif len(new_password1) < 8:
                messages.error(request, 'Şifre en az 8 karakter uzunluğunda olmalıdır.', extra_tags='password_error')
            else:
                try:
                    request.user.set_password(new_password1)
                    request.user.save()
                    messages.success(request, 'Şifreniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.', extra_tags='password_success')
                    
                    # Kullanıcıyı login sayfasına yönlendir
                    return redirect('login')
                except Exception as e:
                    messages.error(request, f'Şifre değiştirilirken bir hata oluştu: {str(e)}', extra_tags='password_error')
        
        # Profil fotoğrafı güncelleme
        elif form_type == 'avatar':
            remove_avatar = request.POST.get('remove_avatar')
            
            if remove_avatar:
                # Mevcut fotoğrafı sil
                if profile.avatar:
                    profile.avatar.delete()
                    profile.avatar = None
                    profile.save()
                    messages.success(request, 'Profil fotoğrafınız kaldırıldı.', extra_tags='avatar_success')
            else:
                # Yeni fotoğraf yükleme
                if 'avatar' in request.FILES:
                    try:
                        # Dosya boyutu kontrolü (2MB)
                        avatar = request.FILES['avatar']
                        if avatar.size > 2 * 1024 * 1024:
                            messages.error(request, 'Profil fotoğrafı en fazla 2MB olabilir.', extra_tags='avatar_error')
                        else:
                            # Mevcut fotoğrafı sil
                            if profile.avatar:
                                profile.avatar.delete()
                                
                            # Yeni fotoğrafı yükle
                            profile.avatar = avatar
                            profile.save()
                            messages.success(request, 'Profil fotoğrafınız başarıyla güncellendi.', extra_tags='avatar_success')
                    except Exception as e:
                        messages.error(request, f'Profil fotoğrafı güncellenirken bir hata oluştu: {str(e)}', extra_tags='avatar_error')
    
    context = {
        'user': request.user,
        'profile': profile
    }
    
    return render(request, 'core/edit_profile.html', context)

@login_required
def dashboard(request):
    """Kullanıcı dashboard görünümü"""
    # Toplam kelime sayısı
    total_words = Word.objects.count()
    
    # Öğrenilen kelime sayısı (ilerleme seviyesi 3 ve üzeri)
    learned_words = UserProgress.objects.filter(
        user=request.user, 
        proficiency_level__gte=3
    ).count()
    
    # Tam öğrenilen kelimeler (ilerleme seviyesi 5)
    mastered_words = UserProgress.objects.filter(
        user=request.user, 
        is_mastered=True
    ).count()
    
    # Çalışılması gereken kelimeler (ilerleme seviyesi 0-2)
    to_review_words = UserProgress.objects.filter(
        user=request.user, 
        proficiency_level__lt=3
    ).count()
    
    # Hiç çalışılmamış kelimeler
    studied_word_ids = UserProgress.objects.filter(
        user=request.user
    ).values_list('word_id', flat=True)
    not_studied_words = Word.objects.exclude(id__in=studied_word_ids).count()
    
    # Kategori bazlı ilerleme
    categories = Category.objects.all()
    category_progress = []
    
    for category in categories:
        category_words = Word.objects.filter(category=category).count()
        learned_in_category = UserProgress.objects.filter(
            user=request.user,
            word__category=category,
            proficiency_level__gte=3
        ).count()
        
        percentage = int((learned_in_category / category_words * 100) if category_words > 0 else 0)
        
        category_progress.append({
            'category': category,
            'learned': learned_in_category,
            'total': category_words,
            'percentage': percentage
        })
    
    # Son 7 günlük aktivite
    last_week_days = [(timezone.now() - timedelta(days=i)).date() for i in range(7, -1, -1)]
    
    daily_activity = UserProgress.objects.filter(
        user=request.user,
        last_reviewed__date__gte=last_week_days[0]
    ).values('last_reviewed__date').annotate(
        count=Count('id')
    )
    
    # Her gün için aktivite sayısını hesapla
    activity_data = {}
    for day in daily_activity:
        activity_data[day['last_reviewed__date']] = day['count']
    
    activity_chart = []
    for day in last_week_days:
        activity_chart.append({
            'date': day.strftime('%d/%m'),
            'count': activity_data.get(day, 0)
        })
    
    context = {
        'total_words': total_words,
        'learned_words': learned_words,
        'mastered_words': mastered_words,
        'to_review_words': to_review_words,
        'not_studied_words': not_studied_words,
        'category_progress': category_progress,
        'activity_chart': activity_chart,
        'profile': request.user.profile if hasattr(request.user, 'profile') else None
    }
    
    return render(request, 'core/dashboard.html', context)

def pronunciation_api(request):
    """
    Kelime telaffuzu için API endpoint'i
    Google Text-to-Speech API kullanarak ses dosyası oluşturur
    """
    word = request.GET.get('word', '')
    if not word:
        return HttpResponse(status=400)
    
    try:
        # Geçici dosya oluştur
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_filename = temp_file.name
        
        # Google TTS ile ses dosyası oluştur
        tts = gTTS(text=word, lang='en', slow=False)
        tts.save(temp_filename)
        
        # Dosyayı oku ve yanıt olarak gönder
        with open(temp_filename, 'rb') as f:
            audio_data = f.read()
        
        # Geçici dosyayı sil
        os.unlink(temp_filename)
        
        # Ses dosyasını yanıt olarak gönder
        response = HttpResponse(audio_data, content_type='audio/mpeg')
        response['Content-Disposition'] = f'inline; filename="{word}.mp3"'
        return response
        
    except Exception as e:
        logger.error(f"Telaffuz oluşturulurken hata: {str(e)}")
        return HttpResponse(status=500)

@login_required
def learning_paths(request):
    """Tüm öğrenme yollarını göster"""
    learning_paths = LearningPath.objects.all().order_by('name')
    
    # Kullanıcının mevcut öğrenme yolu
    user_profile = request.user.profile
    current_path = user_profile.current_learning_path
    
    # Her öğrenme yolu için ilerleme durumunu hesapla
    paths_progress = []
    
    for path in learning_paths:
        # Öğrenme yolundaki kategorileri al
        path_categories = LearningPathCategory.objects.filter(learning_path=path).order_by('order')
        total_categories = path_categories.count()
        
        # Tamamlanan kategorileri say
        completed_categories = UserCategoryProgress.objects.filter(
            user=request.user,
            category__in=[pc.category for pc in path_categories],
            completed=True
        ).count()
        
        # İlerleme yüzdesi
        percentage = int((completed_categories / total_categories * 100) if total_categories > 0 else 0)
        
        paths_progress.append({
            'learning_path': path,
            'total_categories': total_categories,
            'completed_categories': completed_categories,
            'percentage': percentage,
            'is_current': current_path == path
        })
    
    context = {
        'paths_progress': paths_progress
    }
    
    return render(request, 'core/learning_paths.html', context)

@login_required
def learning_path(request, path_id):
    """Belirli bir öğrenme yolunu göster"""
    learning_path = get_object_or_404(LearningPath, id=path_id)
    
    # Kullanıcı profili
    user_profile = request.user.profile
    
    # Bu öğrenme yolunu kullanıcının mevcut yolu olarak ayarla
    if user_profile.current_learning_path != learning_path:
        user_profile.current_learning_path = learning_path
        user_profile.save()
    
    # Öğrenme yolundaki kategorileri al
    path_categories = LearningPathCategory.objects.filter(learning_path=learning_path).order_by('order')
    
    # Kategorilerin ilerleme durumunu hesapla
    categories_progress = []
    unlocked = True  # İlk kategori her zaman açık
    
    for pc in path_categories:
        category = pc.category
        
        # Kategori ilerlemesi
        try:
            category_progress = UserCategoryProgress.objects.get(user=request.user, category=category)
        except UserCategoryProgress.DoesNotExist:
            # İlk kategori için veya henüz ilerleme kaydı yoksa
            category_progress = UserCategoryProgress.objects.create(
                user=request.user,
                category=category,
                unlocked=unlocked,
                completed=False
            )
        
        # Kategori kelimelerini al
        words = Word.objects.filter(category=category)
        total_words = words.count()
        
        # Öğrenilen kelime sayısını hesapla
        learned_words = UserProgress.objects.filter(
            user=request.user,
            word__category=category,
            proficiency_level__gte=3
        ).count()
        
        # İlerleme yüzdesi
        percentage = int((learned_words / total_words * 100) if total_words > 0 else 0)
        
        categories_progress.append({
            'category': category,
            'unlocked': category_progress.unlocked,
            'completed': category_progress.completed,
            'learned': learned_words,
            'total': total_words,
            'percentage': percentage,
            'required_score': pc.required_score
        })
        
        # Bir sonraki kategorinin kilidinin açık olup olmadığını belirle
        unlocked = category_progress.completed
    
    # Genel ilerleme
    total_categories = path_categories.count()
    completed_categories = UserCategoryProgress.objects.filter(
        user=request.user,
        category__in=[pc.category for pc in path_categories],
        completed=True
    ).count()
    
    overall_progress = int((completed_categories / total_categories * 100) if total_categories > 0 else 0)
    
    context = {
        'learning_path': learning_path,
        'categories_progress': categories_progress,
        'overall_progress': overall_progress
    }
    
    return render(request, 'core/learning_path.html', context)

@login_required
def learning_category(request, category_id):
    """Belirli bir kategorinin öğrenme adımlarını göster"""
    category = get_object_or_404(Category, id=category_id)
    
    # Kullanıcının bu kategoriye erişim izni olup olmadığını kontrol et
    try:
        category_progress = UserCategoryProgress.objects.get(user=request.user, category=category)
        if not category_progress.unlocked:
            messages.error(request, "Bu kategorinin kilidini açmak için önceki kategorileri tamamlamanız gerekiyor.")
            return redirect('learning_paths')
    except UserCategoryProgress.DoesNotExist:
        messages.error(request, "Bu kategoriye erişim izniniz yok.")
        return redirect('learning_paths')
    
        # Kategorinin hangi öğrenme yoluna ait olduğunu bul
    try:
        path_category = LearningPathCategory.objects.get(category=category)
        learning_path = path_category.learning_path
    except LearningPathCategory.DoesNotExist:
        # Eğer kategori bir öğrenme yoluna ait değilse
        try:
            # Kullanıcının mevcut öğrenme yolunu kullan
            learning_path = request.user.profile.current_learning_path
            # Eğer mevcut öğrenme yolu da yoksa, ilk öğrenme yolunu al
            if not learning_path:
                learning_path = LearningPath.objects.first()
                if not learning_path:
                    # Yine de yoksa varsayılan bir öğrenme yolu oluştur
                    learning_path = LearningPath.objects.create(
                        name="Temel İngilizce",
                        description="Temel İngilizce öğrenme yolu"
                    )
        except Exception as e:
            # Son çare olarak ilk öğrenme yolunu al veya oluştur
            learning_path = LearningPath.objects.first()
            if not learning_path:
                learning_path = LearningPath.objects.create(
                    name="Temel İngilizce",
                    description="Temel İngilizce öğrenme yolu"
                )
    
    # Kategorinin öğrenme adımlarını al
    learning_steps = LearningStep.objects.filter(category=category).order_by('order')
    
    # Adımların ilerleme durumunu hesapla
    steps_progress = []
    unlocked = True  # İlk adım her zaman açık
    
    for step in learning_steps:
        # Adım ilerlemesi
        try:
            step_progress = UserStepProgress.objects.get(user=request.user, learning_step=step)
        except UserStepProgress.DoesNotExist:
            # Henüz ilerleme kaydı yoksa
            step_progress = UserStepProgress.objects.create(
                user=request.user,
                learning_step=step,
                completed=False,
                score=0,
                max_score=100
            )
        
        steps_progress.append({
            'learning_step': step,
            'unlocked': unlocked,
            'completed': step_progress.completed,
            'score': step_progress.score,
            'max_score': step_progress.max_score,
            'percentage': int((step_progress.score / step_progress.max_score * 100) if step_progress.max_score > 0 else 0)
        })
        
        # Bir sonraki adımın kilidinin açık olup olmadığını belirle
        unlocked = step_progress.completed
    
    # Kategori ilerleme durumu
    words = Word.objects.filter(category=category)
    total_words = words.count()
    
    learned_words = UserProgress.objects.filter(
        user=request.user,
        word__category=category,
        proficiency_level__gte=3
    ).count()
    
    percentage = int((learned_words / total_words * 100) if total_words > 0 else 0)
    
    context = {
        'category': category,
        'learning_path': learning_path,
        'steps_progress': steps_progress,
        'category_progress': {
            'learned': learned_words,
            'total': total_words,
            'percentage': percentage,
            'completed': category_progress.completed
        }
    }
    
    return render(request, 'core/learning_category.html', context)

@login_required
def learning_step(request, category_id, step_id):
    """Öğrenme adımını gösterir."""
    if not request.user.is_authenticated:
        return redirect('login')
    
    try:
        # Django ORM'den kategoriyi al
        category = get_object_or_404(Category, id=category_id)
        step = get_object_or_404(LearningStep, id=step_id, category=category)
        logger.info(f"Öğrenme adımı için kategori: {category.name} (ID: {category_id})")
        
        # Kategori kilit durumunu kontrol et
        prev_category = Category.objects.filter(difficulty_level__lt=category.difficulty_level).order_by('-difficulty_level').first()
        if prev_category:
            prev_progress = UserCategoryProgress.objects.filter(user=request.user, category=prev_category).first()
            if not prev_progress or not prev_progress.completed:
                messages.error(request, "Bu kategoriyi açmak için önceki kategoriyi tamamlamalısınız!")
                return redirect('learning_panel')
        
        # Adım tipine göre farklı şablonlar kullan
        template_map = {
            'matching': 'core/learning/matching.html',
            'writing': 'core/learning/writing.html',
            'multiple_choice': 'core/learning/multiple_choice.html',
            'final_quiz': 'core/learning/final_quiz.html',
            'treasure': 'core/learning/treasure.html'
        }
        
        template = template_map.get(step.step_type, 'core/learning/default.html')
        
        # SQLite veritabanından kategoriye ait kelimeleri al
        words = []
        
        # Django ORM'den kelimeleri al
        django_words = Word.objects.filter(category=category)
        
        # Eğer kelime sayısı sınırlıysa ve adım türü hazine değilse
        word_count = step.word_count if hasattr(step, 'word_count') and step.word_count > 0 else 10
        
        if django_words.exists():
            # Word Count değeri 0'dan büyükse, belirtilen sayıda rastgele kelime seç
            if word_count > 0 and step.step_type != 'final_quiz':
                import random
                # Yeterli sayıda kelime varsa rastgele seç, yoksa tümünü al
                if django_words.count() > word_count:
                    django_words = random.sample(list(django_words), word_count)
            
            # Django modellerini dict'e dönüştür
            for word in django_words:
                words.append({
                    "_id": str(word.id),
                    "english": word.english,
                    "turkish": word.turkish,
                    "definition": word.definition or "",
                    "example_sentence": word.example_sentence or ""
                })
            logger.info(f"Django ORM'den {len(words)} kelime alındı - Kategori: {category.name}")
        else:
            # Fallback: Kategori için en az 10 kelime sağla
            logger.warning(f"Kategori {category.name} için kelime bulunamadı. Manuel kelimeler eklenecek.")
            
            # Kategori adına göre birkaç örnek kelime sağla
            if "yiyecek" in category.name.lower() or "food" in category.name.lower():
                words = [
                    {"_id": f"manual_{i}", "english": f"{food[0]}", "turkish": f"{food[1]}", "definition": ""}
                    for i, food in enumerate([
                        ("apple", "elma"), ("bread", "ekmek"), ("water", "su"), 
                        ("milk", "süt"), ("coffee", "kahve"), ("tea", "çay"),
                        ("egg", "yumurta"), ("cheese", "peynir"), ("meat", "et"),
                        ("chicken", "tavuk"), ("fish", "balık"), ("rice", "pirinç")
                    ])
                ]
            elif "hayvan" in category.name.lower() or "animal" in category.name.lower():
                words = [
                    {"_id": f"manual_{i}", "english": f"{animal[0]}", "turkish": f"{animal[1]}", "definition": ""}
                    for i, animal in enumerate([
                        ("dog", "köpek"), ("cat", "kedi"), ("bird", "kuş"), 
                        ("fish", "balık"), ("rabbit", "tavşan"), ("horse", "at"),
                        ("cow", "inek"), ("pig", "domuz"), ("sheep", "koyun"), 
                        ("lion", "aslan"), ("tiger", "kaplan"), ("elephant", "fil")
                    ])
                ]
            else:
                # Genel kategori için genel kelimeler
                words = [
                    {"_id": f"manual_{i}", "english": f"{item[0]}", "turkish": f"{item[1]}", "definition": ""}
                    for i, item in enumerate([
                        ("hello", "merhaba"), ("goodbye", "hoşçakal"), ("yes", "evet"), 
                        ("no", "hayır"), ("thank you", "teşekkür ederim"), ("please", "lütfen"),
                        ("good", "iyi"), ("bad", "kötü"), ("big", "büyük"),
                        ("small", "küçük"), ("today", "bugün"), ("tomorrow", "yarın")
                    ])
                ]
            
            logger.info(f"Manuel {len(words)} kelime eklendi")
        
        # Hazine adımı için hariç tutuyoruz
        if step.step_type == 'treasure':
            # Hazine adımında kelimeye gerek yok
            words = []
        
        # Kelime formatını düzenle
        processed_words = []
        for word in words:
            word_data = {
                'id': str(word.get('_id', '')),
                'english': word.get('english', ''),
                'turkish': word.get('turkish', ''),
                'definition': word.get('definition', ''),
                'example_sentence': word.get('example_sentence', '')
            }
            
            # Çoktan seçmeli sorular için seçenekler ekle
            if step.step_type in ['multiple_choice', 'final_quiz']:
                # Yanlış seçenekler için diğer kelimelerden 3 tane seç
                options = [word_data['turkish']]
                
                # Diğer kelimelerden rastgele seç
                other_words = [w for w in words if w.get('english') != word_data['english']]
                
                if len(other_words) >= 3:
                    import random
                    
                    for other_word in random.sample(other_words, 3):
                        turkish = other_word.get('turkish', '')
                        
                        if turkish and turkish not in options:
                            options.append(turkish)
                
                # Yeterli seçenek yoksa, eksik kalan kısmı doldur
                while len(options) < 4:
                    fake_option = f"Seçenek {len(options)}"
                    if fake_option not in options:
                        options.append(fake_option)
                
                # Seçenekleri karıştır
                random.shuffle(options)
                word_data['options'] = options
            
            processed_words.append(word_data)
        
        # Kelime bilgilerini log ile yazdır
        logger.info(f"Öğrenme adımı için toplam kelime sayısı: {len(processed_words)} - Kategori: {category.name}")
        if processed_words:
            logger.info(f"İlk kelime örneği: {processed_words[0]['english']}-{processed_words[0]['turkish']}")
        
        # Adım tipine göre gerekli verileri hazırla
        context = {
            'category': category,
            'step': step,
            'words': processed_words
        }
        
        return render(request, template, context)
        
    except Exception as e:
        logger.error(f"Öğrenme adımı yüklenirken hata: {str(e)}")
        messages.error(request, f"Bir hata oluştu: {str(e)}")
        return redirect('learning_panel')

@login_required
def complete_learning_step(request, step_id):
    """Öğrenme adımını tamamla"""
    learning_step = get_object_or_404(LearningStep, id=step_id)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.body else request.POST
            score = int(data.get('score', 0))
            max_score = int(data.get('max_score', 100))
            
            # Adım ilerleme kaydını güncelle
            step_progress, created = UserStepProgress.objects.get_or_create(
                user=request.user,
                learning_step=learning_step,
                defaults={'completed': False, 'score': 0, 'max_score': max_score}
            )
            
            step_progress.completed = True
            step_progress.score = score
            step_progress.max_score = max_score
            step_progress.completed_at = timezone.now()
            step_progress.save()
            
            # Kategorideki tüm adımların tamamlanıp tamamlanmadığını kontrol et
            category = learning_step.category
            total_steps = LearningStep.objects.filter(category=category).count()
            completed_steps = UserStepProgress.objects.filter(
                user=request.user,
                learning_step__category=category,
                completed=True
            ).count()
            
            # Tüm adımlar tamamlandıysa kategoriyi tamamla
            if total_steps == completed_steps:
                category_progress, created = UserCategoryProgress.objects.get_or_create(
                    user=request.user,
                    category=category,
                    defaults={'unlocked': True}
                )
                
                category_progress.completed = True
                category_progress.completed_at = timezone.now()
                category_progress.save()
                
                # Bir sonraki kategorinin kilidini aç
                try:
                    # Kategorinin hangi öğrenme yoluna ait olduğunu bul
                    path_category = LearningPathCategory.objects.get(category=category)
                    learning_path = path_category.learning_path
                    
                    # Bir sonraki kategoriyi bul
                    next_path_category = LearningPathCategory.objects.filter(
                        learning_path=learning_path,
                        order__gt=path_category.order
                    ).order_by('order').first()
                    
                    if next_path_category:
                        next_category_progress, created = UserCategoryProgress.objects.get_or_create(
                            user=request.user,
                            category=next_path_category.category,
                            defaults={'completed': False}
                        )
                        
                        next_category_progress.unlocked = True
                        next_category_progress.save()
                        
                        messages.success(request, f"Tebrikler! {category.name} kategorisini tamamladınız. {next_path_category.category.name} kategorisinin kilidi açıldı.")
                    else:
                        messages.success(request, f"Tebrikler! {category.name} kategorisini ve bu öğrenme yolundaki tüm kategorileri tamamladınız.")
                        
                except LearningPathCategory.DoesNotExist:
                    messages.success(request, f"Tebrikler! {category.name} kategorisini tamamladınız.")
            
            # Deneyim puanı ekle
            user_profile = request.user.profile
            user_profile.experience_points += score
            
            # Seviye atlama kontrolü
            next_level_exp = user_profile.level * 100
            if user_profile.experience_points >= next_level_exp:
                user_profile.level += 1
                messages.success(request, f"Tebrikler! Seviye {user_profile.level}'e yükseldiniz.")
                
                # Başarı ekle
                UserAchievement.objects.create(
                    user=request.user,
                    title=f"Seviye {user_profile.level}",
                    description=f"Tebrikler! Seviye {user_profile.level}'e yükseldin."
                )
            
            user_profile.save()
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            else:
                return redirect('learning_step', step_id=step_id)
                
        except Exception as e:
            logger.error(f"Adım tamamlanırken hata: {str(e)}")
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': str(e)})
            else:
                messages.error(request, f"Bir hata oluştu: {str(e)}")
                return redirect('learning_step', step_id=step_id)
    
    return redirect('learning_step', step_id=step_id)

@login_required
def learning_panel(request):
    """Öğrenme panelini gösterir."""
    if not request.user.is_authenticated:
        return redirect('login')
    
    try:
        # Kategorileri sıralı al
        categories = Category.objects.all().order_by('order', 'difficulty_level', 'name')
        logger.info(f"Toplam {categories.count()} kategori bulundu")
        
        # Kullanıcının ilerleme kayıtlarını al
        user_progress = {p.category_id: p for p in UserCategoryProgress.objects.filter(user=request.user)}
        
        category_status = []
        unlock_next = True  # İlk kategori her zaman açık
        for idx, category in enumerate(categories):
            progress = user_progress.get(category.id)
            if not progress:
                progress = UserCategoryProgress.objects.create(user=request.user, category=category, completed=False, unlocked=False)
            # Sadece ilk kategori veya bir önceki kategori tamamlandıysa açık olsun
            if idx == 0 or (idx > 0 and categories[idx-1].id in user_progress and user_progress[categories[idx-1].id].completed):
                progress.unlocked = True
                progress.save()
                is_locked = False
            else:
                progress.unlocked = False
                progress.save()
                is_locked = True
            # Öğrenme adımlarını al veya oluştur
            steps = list(LearningStep.objects.filter(category=category).order_by('order'))
            if not steps:
                steps = create_default_learning_steps(category)
            # Adımların tamamlanma ve kilit durumlarını hazırla
            step_progress_list = []
            prev_step_completed = True
            for step in steps:
                step_progress, _ = UserStepProgress.objects.get_or_create(user=request.user, learning_step=step, defaults={'completed': False})
                step_data = {
                    'id': step.id,
                    'name': step.name,
                    'type': step.step_type,
                    'completed': step_progress.completed,
                    'locked': not prev_step_completed
                }
                step_progress_list.append(step_data)
                prev_step_completed = step_progress.completed
            category_item = {
                'category': category,
                'is_locked': is_locked,
                'steps': step_progress_list,
                'progress': progress
            }
            category_status.append(category_item)
        return render(request, 'core/learning_panel.html', {
            'category_status': category_status
        })
    except Exception as e:
        logger.error(f"Öğrenme paneli yüklenirken hata: {str(e)}")
        return render(request, 'core/learning_panel.html', {'category_status': []})

def create_default_learning_steps(category):
    """Kategori için varsayılan öğrenme adımlarını oluşturur."""
    
    # Adım 1: Eşleştirme
    matching_step = LearningStep.objects.create(
        category=category,
        name=f"{category.name} Kelimelerini Öğren",
        description="Bu adımda kelimeleri ve anlamlarını eşleştirerek öğreneceksiniz.",
        step_type="matching",
        order=0,
        word_count=10
    )
    
    # Adım 2: Yazma alıştırması
    writing_step = LearningStep.objects.create(
        category=category,
        name=f"{category.name} Yazma Alıştırması",
        description="Bu adımda Türkçe kelimelerin İngilizce karşılıklarını yazacaksınız.",
        step_type="writing",
        order=1,
        word_count=10
    )
    
    # Adım 3: Çoktan seçmeli quiz
    multiple_choice_step = LearningStep.objects.create(
        category=category,
        name=f"{category.name} Çoktan Seçmeli Quiz",
        description="Bu adımda öğrendiğiniz kelimelerin anlamlarını çoktan seçmeli sorularla pekiştirin.",
        step_type="multiple_choice",
        order=2,
        word_count=10
    )
    
    # Adım 4: Final Quiz
    final_quiz_step = LearningStep.objects.create(
        category=category,
        name=f"{category.name} Final Quiz",
        description="Bu adımda öğrendiğiniz tüm kelimelerin final sınavını yapacaksınız. 3 yanlış hakkınız var!",
        step_type="final_quiz",
        order=3,
        word_count=0,  # Tüm kelimeler
        max_mistakes=3  # Maksimum 3 yanlış hakkı
    )
    
    # Hazine sandığı (ödül)
    treasure_step = LearningStep.objects.create(
        category=category,
        name=f"{category.name} Hazinesi",
        description="Bu kategoriyi tamamlayarak bir hazine kazandınız!",
        step_type="treasure",
        order=4,
        word_count=0
    )
    
    return [matching_step, writing_step, multiple_choice_step, final_quiz_step, treasure_step]

@login_required
def check_step_completion(request, category_id, step_id):
    """Öğrenme adımının tamamlanma durumunu kontrol eder."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Giriş yapmalısınız'}, status=403)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Geçersiz istek'}, status=400)
    
    try:
        category = get_object_or_404(Category, id=category_id)
        step = get_object_or_404(LearningStep, id=step_id, category=category)
        
        # Kullanıcının cevaplarını al
        answers = request.POST.getlist('answers[]')
        correct_answers = request.POST.getlist('correct_answers[]')
        
        # Gelen verileri logla - hata ayıklama için
        logger.info(f"Alınan cevaplar: {answers}")
        logger.info(f"Alınan doğru cevaplar: {correct_answers}")
        
        # Bazı doğrulama kontrolleri
        if not answers or not correct_answers:
            return JsonResponse({
                'success': False,
                'message': 'Gönderilen veriler eksik veya hatalı.'
            })
        
        if len(answers) != len(correct_answers):
            return JsonResponse({
                'success': False,
                'message': 'Cevap sayısı ile doğru cevap sayısı eşleşmiyor.'
            })
        
        # Eşleştirme için özel mantık - adım türüne göre doğru cevapları kontrol et
        if step.step_type == 'matching':
            # Eşleştirmede tüm kelimeleri doğru kabul et - çünkü zaten JS tarafında eşleştirme kontrolü yapılıyor
            correct_count = len(answers)  # Tüm cevaplar doğru kabul edilir
            total_questions = len(answers)
        else:
            # Diğer adım türleri için normal karşılaştırma
            # Doğru cevap sayısını hesapla - karşılaştırmayı daha esnek hale getir
            correct_count = 0
            for a, c in zip(answers, correct_answers):
                user_answer = a.lower().strip() if a else ""
                correct_answer = c.lower().strip() if c else ""
                
                # Basit eşleştirme - tamamen aynı olmalı
                if user_answer == correct_answer:
                    correct_count += 1
            
            total_questions = len(correct_answers)
        
        # Başarı eşiği: en az %80
        success_threshold = 80  # %80
        
        # Final quiz için özel kontrol
        if step.step_type == 'final_quiz':
            mistakes = total_questions - correct_count
            if mistakes > step.max_mistakes:
                return JsonResponse({
                    'success': False,
                    'message': f'Çok fazla hata yaptınız! Maksimum {step.max_mistakes} hata hakkınız var.',
                    'correct_count': correct_count,
                    'total_questions': total_questions,
                    'mistakes': mistakes
                })
        
        # Başarı yüzdesini hesapla
        success_percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0
        
        logger.info(f"Başarı yüzdesi: {success_percentage}%, Doğru: {correct_count}, Toplam: {total_questions}")
        
        # Kullanıcı ilerlemesini güncelle
        # UserProgress yerine UserCategoryProgress kullanıyoruz
        progress, created = UserCategoryProgress.objects.get_or_create(
            user=request.user,
            category=category,
            defaults={'unlocked': True, 'score': 0, 'max_score': 100}
        )
        
        # İlerlemeyi güncelle
        step_progress = (step.order + 1) * 25  # Her adım %25
        if success_percentage >= success_threshold:  # Başarı şartı
            progress.score = max(progress.score, step_progress)
            progress.save()
            
            # Tüm adımlar tamamlandı mı kontrol et
            total_steps = LearningStep.objects.filter(category=category).count()
            if step_progress >= (total_steps * 25):
                progress.completed = True
                progress.save()
                
                # Sonraki kategoriyi aç
                next_category = Category.objects.filter(difficulty_level__gt=category.difficulty_level).order_by('difficulty_level').first()
                if next_category:
                    next_progress, _ = UserCategoryProgress.objects.get_or_create(
                        user=request.user,
                        category=next_category,
                        defaults={'completed': False}
                    )
                    next_progress.unlocked = True
                    next_progress.save()
                    messages.success(request, f"Tebrikler! {next_category.name} kategorisi açıldı!")
            
            # Adım tamamlanma durumunu kaydet
            step_progress, _ = UserStepProgress.objects.get_or_create(
                user=request.user,
                learning_step=step,
                defaults={'completed': False}
            )
            step_progress.completed = True
            step_progress.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Adım başarıyla tamamlandı!',
                'correct_count': correct_count,
                'total_questions': total_questions,
                'progress': progress.score
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Başarı yüzdeniz yetersiz. Tekrar deneyin!',
                'correct_count': correct_count,
                'total_questions': total_questions,
                'percentage': success_percentage,
                'threshold': success_threshold
            })
    
    except Exception as e:
        logger.error(f"Adım tamamlama kontrolünde hata: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': f'Bir hata oluştu: {str(e)}'
        })

@login_required
def quiz_categories(request):
    """Kategorilere göre quiz seçenekleri gösterimi"""
    try:
        # Tüm kategorileri getir
        categories = Category.objects.all().order_by('difficulty_level', 'name')
        
        # Kategori bazında quiz istatistikleri
        category_stats = {}
        
        if request.user.is_authenticated:
            # Kullanıcının önceki quizlerini al
            previous_quizzes = Quiz.objects.filter(
                user=request.user, 
                category__isnull=False
            ).order_by('-date_taken')
            
            # Kategori başına en son tamamlanan quiz bilgilerini topla
            for quiz in previous_quizzes:
                category_id = str(quiz.category.id)
                if category_id not in category_stats:
                    category_stats[category_id] = {
                        'last_quiz': quiz,
                        'score_percentage': round((quiz.score / quiz.max_score) * 100 if quiz.max_score else 0)
                    }
        
        context = {
            'categories': categories,
            'category_stats': category_stats,
            'page_title': 'Kategoriye Göre Quiz'
        }
        
        return render(request, 'core/quiz_categories.html', context)
        
    except Exception as e:
        logger.error(f"Quiz kategorileri görüntülenirken hata: {str(e)}")
        messages.error(request, f"Quiz kategorileri yüklenirken bir hata oluştu: {str(e)}")
        return redirect('home')

@login_required
def game_menu(request):
    """Oyun menüsünü görüntüler"""
    try:
        # Kullanıcının öğrendiği kelime sayısını al
        learned_words_count = UserProgress.objects.filter(
            user=request.user,
            proficiency_level__gte=3
        ).count()
        
        # Kullanıcının en yüksek skorlarını al
        best_scores = {
            'word_hunt': 0,
            'word_puzzle': 0,
            'speed_quiz': 0
        }
        
        user_scores = GameScore.objects.filter(user=request.user)
        for score in user_scores:
            best_scores[score.game_type] = score.best_score
        
        # Bu bilgileri context'e ekleyelim
        context = {
            'learned_words_count': learned_words_count,
            'best_scores': best_scores,
            'page_title': 'Oyunlar'
        }
        
        return render(request, 'core/game_menu.html', context)
        
    except Exception as e:
        logger.error(f"Oyun menüsü görüntülenirken hata: {str(e)}")
        messages.error(request, "Oyun menüsü yüklenirken bir hata oluştu.")
        return redirect('home')

@login_required
def word_guess_game(request):
    """Kelime Tahmin Oyunu (Adam Asmaca)"""
    try:
        # Orta seviye kelimelerden rastgele bir kelime seç
        words = Word.objects.all()
        
        if words.exists():
            # Kullanıcının öğrendiği kelimelere öncelik ver
            learned_words = UserProgress.objects.filter(
                user=request.user,
                proficiency_level__gte=2
            ).values_list('word_id', flat=True)
            
            if learned_words.exists():
                game_words = Word.objects.filter(id__in=learned_words)
                if game_words.count() < 10:  # Yeterli kelime yoksa
                    additional_words = words.order_by('?')[:10-game_words.count()]
                    game_words = list(game_words) + list(additional_words)
            else:
                game_words = words.order_by('?')[:10]
        else:
            game_words = []
            messages.warning(request, "Kelime veritabanında hiç kelime bulunamadı.")
        
        context = {
            'game_words': game_words,
            'page_title': 'Kelime Tahmin Oyunu'
        }
        
        return render(request, 'core/games/word_guess.html', context)
        
    except Exception as e:
        logger.error(f"Kelime Tahmin Oyunu yüklenirken hata: {str(e)}")
        messages.error(request, "Oyun yüklenirken bir hata oluştu.")
        return redirect('game_menu')

@login_required
def word_hunt_game(request):
    """Kelime Avı Oyunu"""
    try:
        # Tüm kelimelerden rastgele kelimeler seç
        words = Word.objects.all().order_by('?')[:20]
        
        # Kullanıcının en yüksek skorunu al
        best_score = 0
        user_score = GameScore.objects.filter(user=request.user, game_type='word_hunt').first()
        if user_score:
            best_score = user_score.best_score
        
        context = {
            'words': words,
            'best_score': best_score,
            'page_title': 'Kelime Avı'
        }
        
        return render(request, 'core/games/word_hunt.html', context)
        
    except Exception as e:
        logger.error(f"Kelime Avı Oyunu yüklenirken hata: {str(e)}")
        messages.error(request, "Oyun yüklenirken bir hata oluştu.")
        return redirect('game_menu')

@login_required
def word_puzzle_game(request):
    """Kelime Yapbozu Oyunu"""
    try:
        # Tüm kelimeleri al
        all_words = Word.objects.all()
        
        # Python ile filtreleme yaparak kısa kelimeleri seç (8 harf veya daha az)
        short_words = []
        for word in all_words:
            if len(word.english) <= 8:
                short_words.append(word)
        
        # Eğer yeterli kısa kelime varsa onlardan rastgele 10 tane seç, yoksa tüm kelimelerden al
        if len(short_words) >= 10:
            # Rastgele 10 kelime seç
            import random
            words = random.sample(short_words, 10)
        else:
            # Yeterli kısa kelime yoksa tüm kelimelerden rastgele seç
            words = list(all_words.order_by('?')[:10])
        
        # Kullanıcının en yüksek skorunu al
        best_score = 0
        user_score = GameScore.objects.filter(user=request.user, game_type='word_puzzle').first()
        if user_score:
            best_score = user_score.best_score
        
        context = {
            'words': words,
            'best_score': best_score,
            'page_title': 'Kelime Yapbozu'
        }
        
        return render(request, 'core/games/word_puzzle.html', context)
        
    except Exception as e:
        logger.error(f"Kelime Yapbozu Oyunu yüklenirken hata: {str(e)}")
        messages.error(request, "Oyun yüklenirken bir hata oluştu.")
        return redirect('game_menu')

@login_required
def speed_quiz_game(request):
    """Zamana Karşı Çoktan Seçmeli Test"""
    try:
        # Tüm kelimelerden rastgele kelimeler seç
        all_words = Word.objects.all()
        
        if all_words.exists():
            # Rastgele 10 kelime seç
            quiz_words = all_words.order_by('?')[:10]
            
            # Her kelime için 3 yanlış seçenek oluştur
            quiz_data = []
            
            for word in quiz_words:
                # Doğru cevap
                correct_option = word.turkish
                
                # Yanlış seçenekler (başka kelimelerden)
                wrong_options = list(all_words.exclude(id=word.id).values_list('turkish', flat=True).order_by('?')[:3])
                
                # Tüm seçenekleri birleştir ve karıştır
                options = [correct_option] + wrong_options
                random.shuffle(options)
                
                quiz_data.append({
                    'word': word,
                    'options': options,
                    'correct_option': correct_option
                })
        else:
            quiz_data = []
            messages.warning(request, "Kelime veritabanında hiç kelime bulunamadı.")
        
        # Kullanıcının en yüksek skorunu al
        best_score = 0
        user_score = GameScore.objects.filter(user=request.user, game_type='speed_quiz').first()
        if user_score:
            best_score = user_score.best_score
            
        context = {
            'quiz_data': quiz_data,
            'best_score': best_score,
            'page_title': 'Zamana Karşı Quiz'
        }
        
        return render(request, 'core/games/speed_quiz.html', context)
        
    except Exception as e:
        logger.error(f"Zamana Karşı Quiz Oyunu yüklenirken hata: {str(e)}")
        messages.error(request, "Oyun yüklenirken bir hata oluştu.")
        return redirect('game_menu')

@login_required
def update_game_score(request):
    """Oyun puanını günceller ve gerekirse en yüksek puanı kaydeder"""
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            game_type = data.get('game_type')
            score = data.get('score', 0)
            
            # Geçerli bir oyun türü olup olmadığını kontrol et
            valid_game_types = ['word_hunt', 'word_puzzle', 'speed_quiz']
            if game_type not in valid_game_types:
                return JsonResponse({'error': 'Geçersiz oyun türü'}, status=400)
            
            # Kullanıcının mevcut en yüksek skorunu kontrol et
            game_score, created = GameScore.objects.get_or_create(
                user=request.user,
                game_type=game_type,
                defaults={'best_score': score}
            )
            
            # Mevcut skor, en yüksek skordan büyükse güncelle
            if not created and score > game_score.best_score:
                game_score.best_score = score
                game_score.save()
                
                return JsonResponse({
                    'success': True,
                    'message': 'En yüksek puanınız güncellendi!',
                    'best_score': score
                })
            elif created:
                return JsonResponse({
                    'success': True,
                    'message': 'İlk puanınız kaydedildi!',
                    'best_score': score
                })
            else:
                return JsonResponse({
                    'success': True,
                    'message': 'Puanınız kaydedildi ama en yüksek puanınızı geçemediniz.',
                    'best_score': game_score.best_score
                })
        else:
            return JsonResponse({'error': 'Sadece POST metodu desteklenir'}, status=405)
    except Exception as e:
        logger.error(f"Oyun skoru güncellenirken hata: {str(e)}")
        return JsonResponse({'error': 'Bir hata oluştu'}, status=500)

@login_required
def chat_practice(request):
    """Yapay Zeka İngilizce Pratik sayfasını gösterir"""
    try:
        # Kullanıcının ilerleme bilgilerini al veya oluştur
        progress, created = ChatPracticeProgress.objects.get_or_create(
            user=request.user,
            defaults={
                'english_level': 'B1',
                'practice_mode': 'konuşma'
            }
        )
        
        # Seviye ve mod için görüntülenecek metinleri hazırla
        english_levels = ChatPracticeProgress.ENGLISH_LEVELS
        practice_mode_display = dict(ChatPracticeProgress.PRACTICE_MODES).get(progress.practice_mode, 'Konuşma Pratiği')
        
        context = {
            'progress': progress,
            'english_level': progress.english_level,
            'practice_mode': progress.practice_mode,
            'practice_mode_display': practice_mode_display,
            'english_levels': english_levels,
        }
        
        return render(request, 'core/chat_practice.html', context)
        
    except Exception as e:
        logger.error(f"Chat Practice sayfası yüklenirken hata: {str(e)}")
        messages.error(request, "Yapay Zeka Pratik sayfası yüklenirken bir hata oluştu.")
        return redirect('home')

@login_required
@csrf_exempt
def chat_practice_send_message(request):
    """Kullanıcı mesajını alır ve yapay zeka yanıtı döner"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Sadece POST metodu desteklenir'}, status=405)
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return JsonResponse({'error': 'Mesaj boş olamaz'}, status=400)
        
        # Kullanıcı mesajını veritabanına kaydet
        ChatMessage.objects.create(
            user=request.user,
            text=user_message,
            sender='user'
        )
        
        # Kullanıcının ilerleme bilgilerini al
        progress = ChatPracticeProgress.objects.get(user=request.user)
        
        # Son mesajları al (bağlam için)
        recent_messages = ChatMessage.objects.filter(user=request.user).order_by('-timestamp')[:6]
        conversation_history = []
        
        for msg in reversed(list(recent_messages)):
            conversation_history.append({
                'role': 'user' if msg.sender == 'user' else 'model',
                'content': msg.text
            })
        
        # Yapay zeka yanıtı al
        ai_response = get_ai_response(user_message, conversation_history, progress)
        
        # Yapay zeka yanıtını veritabanına kaydet
        ChatMessage.objects.create(
            user=request.user,
            text=ai_response,
            sender='ai'
        )
        
        # Doğru/Yanlış değerlendirmesini kontrol et
        is_correct = '[DOĞRU]' in ai_response or '[CORRECT]' in ai_response
        is_wrong = '[YANLIŞ]' in ai_response or '[INCORRECT]' in ai_response
        
        # İlerlemeyi güncelle
        if is_correct or is_wrong:
            progress.total_attempts += 1
            if is_correct:
                progress.correct_answers += 1
            progress.save()
        
        # Etiketleri kaldır
        ai_response = ai_response.replace('[DOĞRU]', '').replace('[YANLIŞ]', '')
        ai_response = ai_response.replace('[CORRECT]', '').replace('[INCORRECT]', '')
        
        return JsonResponse({
            'success': True,
            'response': ai_response,
            'progress': {
                'correct_answers': progress.correct_answers,
                'total_attempts': progress.total_attempts,
                'streak': progress.streak
            }
        })
        
    except Exception as e:
        logger.error(f"Chat Practice mesaj gönderilirken hata: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def chat_practice_settings(request):
    """Pratik ayarlarını günceller"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Sadece POST metodu desteklenir'}, status=405)
    
    try:
        practice_mode = request.POST.get('practice_mode')
        english_level = request.POST.get('english_level')
        
        # Geçerli değerler mi kontrol et
        valid_modes = dict(ChatPracticeProgress.PRACTICE_MODES).keys()
        valid_levels = dict(ChatPracticeProgress.ENGLISH_LEVELS).keys()
        
        if practice_mode not in valid_modes or english_level not in valid_levels:
            return JsonResponse({'error': 'Geçersiz mod veya seviye'}, status=400)
        
        # Kullanıcının ilerleme bilgilerini güncelle
        progress, created = ChatPracticeProgress.objects.get_or_create(
            user=request.user,
            defaults={
                'english_level': english_level,
                'practice_mode': practice_mode
            }
        )
        
        if not created:
            progress.english_level = english_level
            progress.practice_mode = practice_mode
            progress.save()
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        logger.error(f"Chat Practice ayarları güncellenirken hata: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def chat_practice_api(request):
    """ChatPractice API endpoint'i"""
    try:
        action = request.GET.get('action')
        
        if action == 'initial_message':
            # İlk karşılama mesajı
            progress = ChatPracticeProgress.objects.get(user=request.user)
            
            # Seviyeye göre farklı karşılama mesajları
            welcome_messages = {
                'A1': f"Merhaba {request.user.first_name or request.user.username}! Ben senin İngilizce öğrenme asistanınım. Basit İngilizce kelimeleri ve günlük konuşmaları pratik edelim. Hazır mısın? (Are you ready?)",
                'A2': f"Merhaba {request.user.first_name or request.user.username}! Ben senin kişisel İngilizce koçunum. Günlük konuşmalar yaparak İngilizceni geliştirmene yardım edeceğim. Bugün nasıl hissediyorsun? (How are you feeling today?)",
                'B1': f"Merhaba {request.user.first_name or request.user.username}! İngilizce konuşma ve kelime becerilerini geliştirmek için yanındayım. Seni daha akıcı konuşmaya teşvik edeceğim. Hangi konuda pratik yapmak istersin?",
                'B2': f"Merhaba {request.user.first_name or request.user.username}! İngilizce becerilerini ilerletmek için birlikte çalışacağız. Çeşitli konularda tartışarak kelime haznenizi ve akıcılığınızı geliştirebiliriz. Bugün hangi konuyu keşfetmek istersin?",
                'C1': f"Merhaba {request.user.first_name or request.user.username}! İleri seviye İngilizce pratiği için buradayım. Karmaşık konularda tartışarak dil becerilerini daha da geliştirebiliriz. Nüanslı ve derinlemesine konuşmalar yapmaya hazır mısın?",
                'C2': f"Merhaba {request.user.first_name or request.user.username}! Profesyonel seviyede İngilizce pratiği yapmak için hazırım. Akademik, edebi veya uzmanlık gerektiren konularda detaylı tartışmalar yapabiliriz. Dil zenginliğini keşfetmeye başlayalım."
            }
            
            # Moda göre farklı başlangıç mesajları
            mode_message = "konuşma" if progress.practice_mode == "konuşma" else "kelime"
            mode_specific = {
                'konuşma': "Şu anda konuşma modundasın. Seninle sohbet ederek İngilizce pratik yapacağız. Cevaplarını değerlendirip geri bildirim vereceğim.",
                'kelime': "Şu anda kelime modundasın. Sana İngilizce kelimeler soracağım ve anlamlarını bilip bilmediğini kontrol edeceğim. Doğru cevaplarında o kelimeyle ilgili daha fazla bilgi sunacağım."
            }
            
            welcome_message = welcome_messages.get(progress.english_level, welcome_messages['B1'])
            mode_info = mode_specific.get(progress.practice_mode, mode_specific['konuşma'])
            
            initial_message = f"{welcome_message}\n\n{mode_info}"
            
            # Mesajı veritabanına kaydet
            ChatMessage.objects.create(
                user=request.user,
                text=initial_message,
                sender='ai'
            )
            
            return JsonResponse({
                'success': True,
                'message': initial_message
            })
            
        elif action == 'hint':
            # İpucu iste
            # Son AI mesajını al
            last_ai_message = ChatMessage.objects.filter(
                user=request.user,
                sender='ai'
            ).order_by('-timestamp').first()
            
            if not last_ai_message:
                return JsonResponse({'error': 'İpucu istenecek bir soru bulunamadı'}, status=404)
            
            # İpucu oluştur
            hint = generate_hint(last_ai_message.text)
            
            return JsonResponse({
                'success': True,
                'hint': hint
            })
            
        else:
            return JsonResponse({'error': 'Geçersiz eylem'}, status=400)
            
    except Exception as e:
        logger.error(f"Chat Practice API hatası: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

def get_ai_response(user_message, conversation_history, progress):
    """Yapay zeka API'sinden yanıt al"""
    global last_request_time
    
    # API anahtarı kontrolü
    if not GEMINI_API_KEY:
        return "API anahtarı eksik. Lütfen sistem yöneticisiyle iletişime geçin."
    
    # İki istek arasında minimum süre kontrolü
    current_time = time.time() * 1000  # milisaniye cinsinden
    time_elapsed = current_time - last_request_time
    
    if time_elapsed < REQUEST_THROTTLE_MS:
        wait_time = REQUEST_THROTTLE_MS - time_elapsed
        time.sleep(wait_time / 1000)  # saniye cinsinden bekle
    
    # Son istek zamanını güncelle
    last_request_time = time.time() * 1000
    
    # Seviye açıklamaları
    level_descriptions = {
        'A1': 'başlangıç - temel kelimeler ve basit cümleler',
        'A2': 'temel - günlük konuşmalar ve basit ifadeler',
        'B1': 'orta - günlük konuşma ve genel konular',
        'B2': 'orta-üst - akıcı konuşma ve soyut konular',
        'C1': 'ileri - karmaşık konular ve akademik dil',
        'C2': 'profesyonel - anadil seviyesine yakın akıcılık'
    }
    
    # Kelime modu için örnek kelimeler (seviyeye göre)
    example_words = {
        'A1': ['cat', 'dog', 'house', 'book', 'friend', 'school', 'water', 'food'],
        'A2': ['weather', 'hobby', 'holiday', 'travel', 'restaurant', 'shopping', 'email'],
        'B1': ['environment', 'experience', 'technology', 'culture', 'education'],
        'B2': ['controversy', 'perspective', 'sustainability', 'innovation', 'consequence'],
        'C1': ['ambiguity', 'phenomenon', 'paradigm', 'discourse', 'ideology'],
        'C2': ['nuance', 'dichotomy', 'juxtaposition', 'quintessential', 'idiosyncrasy']
    }
    
    # Kullanıcı cevabını değerlendirmek için ek prompt
    evaluation_prompt = "kelime" if progress.practice_mode == 'kelime' else "konuşma"
    eval_prompts = {
        "kelime": "Kullanıcının cevabı doğru mu değerlendir. Kelimenin SADECE Türkçe anlamını sorduğunda, kullanıcı sadece Türkçe anlamını yazmışsa kabul et, cümle kurmasını ASLA isteme. Örneğin \"cat\" için \"kedi\" cevabı yeterlidir. Cevabın başında [DOĞRU] veya [YANLIŞ] etiketi kullan, ardından açıklama yap. Doğru cevaptan sonra MUTLAKA YENİ BİR KELİME sor, aynı kelime üzerinde durmaya devam etme.",
        "konuşma": "Kullanıcının İngilizce cevabını değerlendir. Değerlendirmeni İNGİLİZCE olarak yap. Cevabın başında [CORRECT] veya [INCORRECT] etiketi kullan, ardından varsa hataları düzelt. Sonra konuşmaya İNGİLİZCE olarak devam et ve yeni bir soru sor. Kullanıcı konuşmayı bitirmek isterse o zaman Türkçe konuş."
    }
    
    # Prompt oluştur
    prompt = f"""Sen profesyonel bir İngilizce öğretmeni ve dil arkadaşısın. Kullanıcı Türk ve İngilizce pratik yapmak istiyor.

Kullanıcının İngilizce seviyesi: {progress.english_level} ({level_descriptions.get(progress.english_level, 'orta seviye')}).
Uygulama modu: {progress.practice_mode}.

ÇOK ÖNEMLİ KURALLAR:

1. Eğer mod "kelime" ise:
   - İngilizce seviyeye uygun bir kelime seç. İşte {progress.english_level} seviyesi için örnek kelimeler: {', '.join(example_words.get(progress.english_level, example_words['B1'])[:5])}
   - Kullanıcıya kelimenin Türkçesini sor (örnek: "What is the meaning of 'cat' in Turkish?")
   - Kullanıcı sadece Türkçe anlamını yazdıysa (örn. "kedi") bu cevabı kabul et ve DOĞRU olarak değerlendir.
   - ASLA kullanıcıdan cümle kurmasını isteme, sadece kelimenin anlamını sor.
   - Doğruysa tebrik et ve HEMEN YENİ BİR KELİME sor. Aynı kelime üzerinde durmaya devam etme.
   - Yanlışsa doğru cevabı açıkla ve yeni bir kelime sor.
   - Her seferinde farklı kelimeler kullan, tekrar etme.
   - Çok kısa ve öz cevaplar ver.

2. Eğer mod "konuşma" ise:
   - Seviyeye uygun günlük bir konuşma sorusu sor (İNGİLİZCE olarak).
   - Kullanıcının verdiği İngilizce cevabı İNGİLİZCE olarak değerlendir. Değerlendirmen kısa olsun (maksimum 2 cümle).
   - Değerlendirmeden sonra konuşmaya İNGİLİZCE olarak devam et ve yeni bir soru sor.
   - KESİNLİKLE ŞART: Eğer kullanıcı sana bir soru sorarsa (örneğin "What about you?", "And you?", "What is your favorite color?", "peki ya sen?", "sen ne düşünüyorsun?", "senin favori rengin ne?"), MUTLAKA bu soruya İNGİLİZCE olarak cevap ver. Soruyu ASLA görmezden gelme.
   - Kullanıcı senin favori rengin, hayvanın, yemeğin, vb. sorduğunda kesinlikle bir cevap ver. Örneğin "My favorite color is blue." gibi.
   - Her seferinde farklı konular sor, tekrar etme.
   - Gerçek bir konuşma gibi akıcı bir diyalog kur, sadece soru soran bir robot gibi davranma.
   - Kullanıcı "konuşmayı bitir", "görüşürüz", "bye" gibi ifadeler kullanırsa, o zaman Türkçe konuşmaya geç ve vedalaş.

{eval_prompts[evaluation_prompt]}

Şimdi kullanıcının şu mesajına yanıt ver: "{user_message}"
Cevabın 50 kelimeden az olsun."""
    
    # API'ye istek gönder
    for attempt in range(3):  # 3 deneme hakkı
        try:
            # Her denemede kullanılacak model adını belirle
            model_to_use = ALTERNATIVE_MODELS[attempt % len(ALTERNATIVE_MODELS)]
            
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_to_use}:generateContent"
            response = requests.post(
                f"{api_url}?key={GEMINI_API_KEY}",
                json={
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": prompt
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.7,
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 1024,
                    }
                }
            )
            
            # Yanıt kontrolü
            if response.status_code == 200:
                data = response.json()
                if data.get('candidates') and data['candidates'][0].get('content'):
                    parts = data['candidates'][0]['content'].get('parts', [])
                    if parts and 'text' in parts[0]:
                        return parts[0]['text'].strip()
                
                # Geçerli yanıt alınamadıysa
                logger.error(f"API yanıtı geçersiz format: {response.text}")
                
            elif response.status_code == 404:
                # Model bulunamadı, bir sonraki denemeye geç
                logger.warning(f"Model bulunamadı: {model_to_use}, bir sonraki model deneniyor...")
                continue  # Tekrar dene
                
            elif response.status_code == 429:
                # Rate limit aşıldı, bekle ve tekrar dene
                wait_time = (2 ** attempt) * 2  # Exponential backoff
                logger.warning(f"API rate limit aşıldı. {wait_time} saniye bekleniyor...")
                time.sleep(wait_time)
                continue  # Tekrar dene
                
            else:
                logger.error(f"API hatası: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"API isteği başarısız: {str(e)}")
        
    # Tüm denemeler başarısız olursa
    return "Üzgünüm, şu anda yapay zeka servisine erişemiyorum. Lütfen daha sonra tekrar deneyin."

def generate_hint(last_message):
    """Son mesaja göre ipucu oluştur"""
    if not GEMINI_API_KEY:
        return "İpucu oluşturulamadı. API anahtarı eksik."
    
    prompt = f"""Son sorduğum soru şu: "{last_message}"
    
Bu soru için kullanıcıya yardımcı olacak kısa bir ipucu ver. İpucu 1-2 cümle olsun ve çok fazla bilgi vermesin, sadece yönlendirici olsun. Cevabı direkt söyleme.

İpucu şöyle başlamalı: "İpucu: "
"""
    
    try:
        # Kullanılacak model
        model_to_use = ALTERNATIVE_MODELS[0]  # İlk modeli kullan
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_to_use}:generateContent"
        response = requests.post(
            f"{api_url}?key={GEMINI_API_KEY}",
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 256,
                }
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('candidates') and data['candidates'][0].get('content'):
                parts = data['candidates'][0]['content'].get('parts', [])
                if parts and 'text' in parts[0]:
                    return parts[0]['text'].strip()
    
    except Exception as e:
        logger.error(f"İpucu oluşturulurken hata: {str(e)}")
    
    return "İpucu: Soruyu dikkatlice okuyup, anahtar kelimelere odaklanın."

def account_lockout(request):
    """
    Hesap kilitleme sayfasını göster
    """
    return render(request, 'core/lockout.html')

