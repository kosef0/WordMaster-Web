from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Word
import random

def home_view(request):
    return render(request, 'home.html')

@login_required
def add_word(request):
    if request.method == 'POST':
        word = request.POST.get('word')
        translation = request.POST.get('translation')
        example = request.POST.get('example', '')
        
        # Create new word
        Word.objects.create(
            user=request.user,
            word=word,
            translation=translation,
            example=example,
            status='learning'  # Default status
        )
        
        messages.success(request, 'Kelime başarıyla eklendi!')
        return redirect('word_list')
    
    return redirect('word_list')

@login_required
def word_list(request):
    words = Word.objects.filter(user=request.user).order_by('-created_at')
    
    # Count statistics
    words_count = words.count()
    mastered_count = words.filter(status='mastered').count()
    learning_count = words.filter(status='learning').count()
    
    # Calculate streak (placeholder - you'll need to implement actual streak logic)
    streak_days = 0
    
    context = {
        'words': words,
        'words_count': words_count,
        'mastered_count': mastered_count,
        'learning_count': learning_count,
        'streak_days': streak_days
    }
    
    return render(request, 'words/word_list.html', context)

@login_required
def word_detail(request, word_id):
    word = get_object_or_404(Word, id=word_id, user=request.user)
    return render(request, 'words/word_detail.html', {'word': word})

@login_required
def edit_word(request, word_id):
    word = get_object_or_404(Word, id=word_id, user=request.user)
    
    if request.method == 'POST':
        word.word = request.POST.get('word')
        word.translation = request.POST.get('translation')
        word.example = request.POST.get('example', '')
        word.save()
        
        messages.success(request, 'Kelime başarıyla güncellendi!')
        return redirect('word_list')
    
    return render(request, 'words/edit_word.html', {'word': word})

@login_required
def delete_word(request, word_id):
    word = get_object_or_404(Word, id=word_id, user=request.user)
    
    if request.method == 'POST':
        word.delete()
        messages.success(request, 'Kelime başarıyla silindi!')
        return redirect('word_list')
    
    return render(request, 'words/delete_word.html', {'word': word})

@login_required
def mark_word_mastered(request, word_id):
    word = get_object_or_404(Word, id=word_id, user=request.user)
    
    if request.method == 'POST':
        word.status = 'mastered'
        word.save()
        messages.success(request, 'Kelime öğrenildi olarak işaretlendi!')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'status': 'success'})
        
        return redirect('word_list')
    
    return redirect('word_list')

@login_required
def flashcards(request):
    # Get all learning words for the user
    learning_words = Word.objects.filter(user=request.user, status='learning')
    
    # If no learning words, include some mastered words for review
    if learning_words.count() < 5:
        mastered_words = Word.objects.filter(user=request.user, status='mastered')
        words_for_review = list(mastered_words)[:10]
        all_words = list(learning_words) + words_for_review
    else:
        all_words = list(learning_words)
    
    # Shuffle the words
    random.shuffle(all_words)
    
    context = {
        'words': all_words[:10]  # Limit to 10 words per session
    }
    
    return render(request, 'words/flashcards.html', context)

@login_required
def quiz(request):
    # Get all words for the user
    all_words = Word.objects.filter(user=request.user)
    
    # If user has less than 4 words, redirect with a message
    if all_words.count() < 4:
        messages.warning(request, 'Quiz için en az 4 kelime eklemelisiniz!')
        return redirect('word_list')
    
    # Select 10 random words for the quiz
    quiz_words = list(all_words)
    random.shuffle(quiz_words)
    quiz_words = quiz_words[:10]
    
    # For each quiz word, select 3 random incorrect options
    for word in quiz_words:
        # Get all other words
        other_words = [w for w in all_words if w.id != word.id]
        # Shuffle and select 3
        random.shuffle(other_words)
        word.options = [word.translation] + [w.translation for w in other_words[:3]]
        # Shuffle options
        random.shuffle(word.options)
    
    context = {
        'quiz_words': quiz_words
    }
    
    return render(request, 'words/quiz.html', context)

@login_required
def quiz_results(request):
    if request.method != 'POST':
        return redirect('quiz')
    
    # Get the answers from the form
    answers = {}
    score = 0
    total = 0
    
    for key, value in request.POST.items():
        if key.startswith('word_'):
            word_id = key.split('_')[1]
            answers[word_id] = value
            
            # Get the word and check if the answer is correct
            try:
                word = Word.objects.get(id=word_id, user=request.user)
                if value == word.translation:
                    score += 1
                total += 1
            except Word.DoesNotExist:
                pass
    
    # Calculate percentage
    percentage = (score / total) * 100 if total > 0 else 0
    
    context = {
        'score': score,
        'total': total,
        'percentage': percentage
    }
    
    return render(request, 'words/quiz_results.html', context)

@login_required
def stats(request):
    # Get all words for the user
    all_words = Word.objects.filter(user=request.user)
    
    # Count statistics
    words_count = all_words.count()
    mastered_count = all_words.filter(status='mastered').count()
    learning_count = all_words.filter(status='learning').count()
    
    # Calculate mastery percentage
    mastery_percentage = (mastered_count / words_count) * 100 if words_count > 0 else 0
    
    # Get recently added words
    recent_words = all_words.order_by('-created_at')[:5]
    
    context = {
        'words_count': words_count,
        'mastered_count': mastered_count,
        'learning_count': learning_count,
        'mastery_percentage': mastery_percentage,
        'recent_words': recent_words
    }
    
    return render(request, 'words/stats.html', context)