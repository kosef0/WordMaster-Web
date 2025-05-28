from django.urls import path
from .views import (
    home, register, user_login, user_logout, category_list, category_detail, 
    word_detail, update_progress, quiz_start, quiz_question, quiz_answer, 
    quiz_result, profile, dashboard, pronunciation_api, learning_paths, 
    learning_path, learning_category, learning_step, complete_learning_step,
    learning_panel, check_step_completion, quiz_start_category, edit_profile,
    quiz_categories, game_menu, word_guess_game, word_hunt_game, word_puzzle_game, 
    speed_quiz_game, update_game_score, account_lockout,
    # ChatPractice için yeni view'lar
    chat_practice, chat_practice_send_message, chat_practice_settings, chat_practice_api
)

urlpatterns = [
    # Ana sayfa ve kullanıcı işlemleri
    path('', home, name='home'),
    path('register/', register, name='register'),
    path('login/', user_login, name='login'),
    path('logout/', user_logout, name='logout'),
    path('profile/', profile, name='profile'),
    path('profile/edit/', edit_profile, name='edit_profile'),
    path('dashboard/', dashboard, name='dashboard'),
    path('locked/', account_lockout, name='account_lockout'),
    
    # Kategori ve kelimelerle ilgili URL'ler
    path('categories/', category_list, name='category_list'),
    path('category/<str:category_id>/', category_detail, name='category_detail'),
    path('word/<str:word_id>/', word_detail, name='word_detail'),
    path('word/<str:word_id>/update-progress/', update_progress, name='update_progress'),
    
    # Quiz ile ilgili URL'ler
    path('quiz/', quiz_categories, name='quiz_categories'),
    path('quiz/start/', quiz_start, name='quiz_start'),
    path('quiz/start/<str:category_id>/', quiz_start_category, name='quiz_start_category'),
    path('quiz/<int:quiz_id>/question/<int:question_number>/', quiz_question, name='quiz_question'),
    path('quiz/<int:quiz_id>/answer/<int:question_number>/', quiz_answer, name='quiz_answer'),
    path('quiz/<int:quiz_id>/result/', quiz_result, name='quiz_result'),
    
    # Oyun menüsü ve oyunlar
    path('games/', game_menu, name='game_menu'),
    path('games/word-guess/', word_guess_game, name='word_guess_game'),
    path('games/word-hunt/', word_hunt_game, name='word_hunt_game'),
    path('games/word-puzzle/', word_puzzle_game, name='word_puzzle_game'),
    path('games/speed-quiz/', speed_quiz_game, name='speed_quiz_game'),
    path('games/update-score/', update_game_score, name='update_game_score'),
    
    # Telaffuz API
    path('api/pronunciation/', pronunciation_api, name='pronunciation_api'),
    
    # Öğrenme yolu ve adımları
    path('learning-paths/', learning_paths, name='learning_paths'),
    path('learning-path/<int:path_id>/', learning_path, name='learning_path'),
    path('learning-category/<str:category_id>/', learning_category, name='learning_category'),
    path('learning-panel/', learning_panel, name='learning_panel'),
    path('learning-step/<str:category_id>/<int:step_id>/', learning_step, name='learning_step'),
    path('learning-step/<int:step_id>/complete/', complete_learning_step, name='complete_learning_step'),
    path('check-completion/<str:category_id>/<int:step_id>/', check_step_completion, name='check_step_completion'),
    
    # ChatPractice için URL'ler
    path('chat-practice/', chat_practice, name='chat_practice'),
    path('chat-practice/send-message/', chat_practice_send_message, name='chat_practice_send_message'),
    path('chat-practice/settings/', chat_practice_settings, name='chat_practice_settings'),
    path('chat-practice/api/', chat_practice_api, name='chat_practice_api'),
] 