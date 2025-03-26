from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import vocabulary_views, quiz_views, progress_views

router = DefaultRouter()
# Register viewsets here later

urlpatterns = [
    path('', include(router.urls)),
    
    # Vocabulary endpoints
    path('vocabulary/', vocabulary_views.get_vocabulary_list, name='vocabulary-list'),
    path('vocabulary/<int:word_id>/', vocabulary_views.get_word_details, name='word-detail'),
    path('vocabulary/<int:word_id>/learn/', vocabulary_views.mark_word_learned, name='mark-word-learned'),
    path('categories/', vocabulary_views.get_categories, name='categories'),
    
    # Quiz endpoints
    path('quiz/create/', quiz_views.create_quiz, name='create-quiz'),
    path('quiz/<int:quiz_id>/', quiz_views.get_quiz, name='get-quiz'),
    path('quiz/<int:quiz_id>/submit/', quiz_views.submit_quiz, name='submit-quiz'),
    
    # Progress endpoints
    path('progress/', progress_views.get_user_progress, name='user-progress'),
    path('progress/stats/', progress_views.get_learning_stats, name='learning-stats'),
]