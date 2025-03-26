from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404, render
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from ..models import Word, UserWord, Category
from ..serializers import WordSerializer, UserWordSerializer, CategorySerializer

@api_view(['GET'])
def get_vocabulary_list(request):
    """
    Get a list of vocabulary words based on user's level and interests
    """
    words = Word.objects.all()[:20]  # Limit to 20 for now
    serializer = WordSerializer(words, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_word_details(request, word_id):
    """
    Get detailed information about a specific word
    """
    word = get_object_or_404(Word, id=word_id)
    serializer = WordSerializer(word)
    return Response(serializer.data)

@api_view(['POST'])
def mark_word_learned(request, word_id):
    """
    Mark a word as learned for the current user
    """
    word = get_object_or_404(Word, id=word_id)
    user_word, created = UserWord.objects.get_or_create(
        user=request.user,
        word=word,
        defaults={'is_learned': True}
    )
    
    if not created:
        user_word.is_learned = True
        user_word.save()
    
    return Response({'status': 'success'})

@api_view(['GET'])
def get_categories(request):
    """
    Get all vocabulary categories
    """
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)

@login_required
def vocabulary_page(request):
    """
    Render the vocabulary page with paginated words
    """
    words = Word.objects.all().order_by('english')
    categories = Category.objects.all()
    
    # Mark words that the user has learned
    user_words = UserWord.objects.filter(user=request.user, is_learned=True).values_list('word_id', flat=True)
    
    for word in words:
        word.is_learned = word.id in user_words
    
    # Paginate the words
    paginator = Paginator(words, 20)  # Show 20 words per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'words': page_obj,
        'categories': categories
    }
    
    return render(request, 'vocabulary.html', context)