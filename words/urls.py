from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_view, name='home'),  # This handles the root URL
    path('add-word/', views.add_word, name='add_word'),
    path('words/', views.word_list, name='word_list'),
    path('words/<int:word_id>/', views.word_detail, name='word_detail'),
    path('words/<int:word_id>/edit/', views.edit_word, name='edit_word'),
    path('words/<int:word_id>/delete/', views.delete_word, name='delete_word'),
    path('words/<int:word_id>/mark-mastered/', views.mark_word_mastered, name='mark_word_mastered'),
    path('flashcards/', views.flashcards, name='flashcards'),
    path('quiz/', views.quiz, name='quiz'),
    path('quiz/results/', views.quiz_results, name='quiz_results'),
    path('stats/', views.stats, name='stats'),
]