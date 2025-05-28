from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.contrib.admin import AdminSite
from django.urls import path
from django.template.response import TemplateResponse
from django.db.models import Count, Sum
from django.contrib.auth.models import User
from .models import (
    Category, Word, UserProgress, Quiz, QuizQuestion,
    UserAchievement, UserProfile, LearningPath, LearningPathCategory,
    LearningStep, UserStepProgress, UserCategoryProgress, GameScore
)

# Admin sitesini özelleştir
class WordMasterAdminSite(AdminSite):
    site_title = _('Word Master Yönetim')
    site_header = _('Word Master Yönetim Paneli')
    index_title = _('Yönetim Paneli')
    
    def get_app_list(self, request):
        """
        Uygulama listesini özelleştir
        """
        app_list = super().get_app_list(request)
        
        # Uygulamaları Türkçeleştir
        for app in app_list:
            if app['app_label'] == 'core':
                app['name'] = _('Kelime Yönetimi')
            elif app['app_label'] == 'auth':
                app['name'] = _('Kullanıcı Yönetimi')
                
            # Model isimlerini Türkçeleştir
            for model in app['models']:
                if model['object_name'] == 'Category':
                    model['name'] = _('Kategoriler')
                elif model['object_name'] == 'Word':
                    model['name'] = _('Kelimeler')
                elif model['object_name'] == 'UserProgress':
                    model['name'] = _('Kullanıcı İlerlemeleri')
                elif model['object_name'] == 'Quiz':
                    model['name'] = _('Quizler')
                elif model['object_name'] == 'QuizQuestion':
                    model['name'] = _('Quiz Soruları')
                elif model['object_name'] == 'UserAchievement':
                    model['name'] = _('Kullanıcı Başarıları')
                elif model['object_name'] == 'UserProfile':
                    model['name'] = _('Kullanıcı Profilleri')
                elif model['object_name'] == 'LearningPath':
                    model['name'] = _('Öğrenme Yolları')
                elif model['object_name'] == 'LearningPathCategory':
                    model['name'] = _('Öğrenme Yolu Kategorileri')
                elif model['object_name'] == 'LearningStep':
                    model['name'] = _('Öğrenme Adımları')
                elif model['object_name'] == 'UserStepProgress':
                    model['name'] = _('Kullanıcı Adım İlerlemeleri')
                elif model['object_name'] == 'UserCategoryProgress':
                    model['name'] = _('Kullanıcı Kategori İlerlemeleri')
                elif model['object_name'] == 'GameScore':
                    model['name'] = _('Oyun Skorları')
                elif model['object_name'] == 'User':
                    model['name'] = _('Kullanıcılar')
                elif model['object_name'] == 'Group':
                    model['name'] = _('Gruplar')
                
        return app_list
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('istatistikler/', self.admin_view(self.statistics_view), name='statistics'),
        ]
        return custom_urls + urls
    
    def statistics_view(self, request):
        """
        İstatistik sayfası görünümü
        """
        # Toplam istatistikler
        total_users = User.objects.count()
        total_words = Word.objects.count()
        total_categories = Category.objects.count()
        total_quizzes = Quiz.objects.count()
        
        # Kategori bazında kelime sayıları
        categories_with_word_count = Category.objects.annotate(
            word_count=Count('words')
        ).values('name', 'word_count').order_by('-word_count')[:10]
        
        # Kullanıcı aktivitesi - son 7 gün
        user_activity = UserProgress.objects.values('last_reviewed__date').annotate(
            count=Count('id')
        ).order_by('last_reviewed__date')[:7]
        
        context = {
            **self.each_context(request),
            'title': _('İstatistikler'),
            'total_users': total_users,
            'total_words': total_words,
            'total_categories': total_categories,
            'total_quizzes': total_quizzes,
            'categories_with_word_count': list(categories_with_word_count),
            'user_activity': list(user_activity),
        }
        return TemplateResponse(request, 'admin/statistics.html', context)
    
    def each_context(self, request):
        """
        Her admin sayfasına istatistik bilgileri ekle
        """
        context = super().each_context(request)
        context.update({
            'user_count': User.objects.count(),
            'word_count': Word.objects.count(),
            'category_count': Category.objects.count(),
            'quiz_count': Quiz.objects.count(),
        })
        return context

# Özel admin sitesi oluştur
admin_site = WordMasterAdminSite(name='wordmaster_admin')

# Admin modellerini kaydet
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty_level', 'order')
    list_filter = ('difficulty_level',)
    search_fields = ('name', 'description')
    ordering = ('order', 'name')
    
    fieldsets = (
        (_('Temel Bilgiler'), {
            'fields': ('name', 'description', 'image')
        }),
        (_('Gelişmiş Seçenekler'), {
            'classes': ('collapse',),
            'fields': ('difficulty_level', 'order', 'mongo_id'),
        }),
    )

@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ('english', 'turkish', 'category', 'difficulty_level')
    list_filter = ('category', 'difficulty_level')
    search_fields = ('english', 'turkish', 'definition')
    ordering = ('english',)
    
    fieldsets = (
        (_('Kelime Bilgileri'), {
            'fields': ('english', 'turkish', 'category')
        }),
        (_('Detaylar'), {
            'fields': ('definition', 'example_sentence', 'pronunciation', 'difficulty_level')
        }),
        (_('Medya'), {
            'fields': ('image', 'audio')
        }),
    )

@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name', 'description')
    
    fieldsets = (
        (_('Öğrenme Yolu Bilgileri'), {
            'fields': ('name', 'description', 'image')
        }),
    )

@admin.register(LearningPathCategory)
class LearningPathCategoryAdmin(admin.ModelAdmin):
    list_display = ('learning_path', 'category', 'order', 'required_score')
    list_filter = ('learning_path',)
    ordering = ('learning_path', 'order')

@admin.register(LearningStep)
class LearningStepAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'step_type', 'order', 'word_count')
    list_filter = ('category', 'step_type')
    ordering = ('category', 'order')
    
    fieldsets = (
        (_('Adım Bilgileri'), {
            'fields': ('category', 'name', 'description', 'step_type')
        }),
        (_('Yapılandırma'), {
            'fields': ('order', 'word_count', 'max_mistakes')
        }),
    )

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'word', 'proficiency_level', 'is_mastered', 'last_reviewed')
    list_filter = ('user', 'proficiency_level', 'is_mastered')
    search_fields = ('user__username', 'word__english')
    date_hierarchy = 'last_reviewed'

@admin.register(UserStepProgress)
class UserStepProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'learning_step_display', 'completed', 'score', 'max_score', 'completed_at')
    list_filter = ('user', 'completed')
    search_fields = ('user__username', 'learning_step__name')
    date_hierarchy = 'completed_at'
    
    def learning_step_display(self, obj):
        return f"{obj.learning_step.category.name} - {obj.learning_step.name}"
    learning_step_display.short_description = _("Öğrenme Adımı")

@admin.register(UserCategoryProgress)
class UserCategoryProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'unlocked', 'completed', 'score', 'completed_at')
    list_filter = ('user', 'unlocked', 'completed')
    search_fields = ('user__username', 'category__name')
    date_hierarchy = 'completed_at'

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('user', 'quiz_type', 'category', 'score', 'max_score', 'completed', 'date_taken')
    list_filter = ('user', 'quiz_type', 'category', 'completed')
    search_fields = ('user__username',)
    date_hierarchy = 'date_taken'

@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'word', 'is_correct')
    list_filter = ('quiz__user', 'is_correct')
    search_fields = ('quiz__user__username', 'word__english')

@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'date_earned')
    list_filter = ('user',)
    search_fields = ('user__username', 'title', 'description')
    date_hierarchy = 'date_earned'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'level', 'experience_points', 'streak_days', 'last_activity', 'current_learning_path')
    list_filter = ('level',)
    search_fields = ('user__username',)
    date_hierarchy = 'last_activity'
    
    fieldsets = (
        (_('Kullanıcı Bilgileri'), {
            'fields': ('user', 'avatar', 'bio')
        }),
        (_('İlerleme'), {
            'fields': ('level', 'experience_points', 'streak_days', 'current_learning_path')
        }),
    )

@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'game_type', 'best_score', 'date_achieved')
    list_filter = ('game_type', 'user')
    search_fields = ('user__username',)
    date_hierarchy = 'date_achieved'

# Tüm modelleri özel admin sitesine kaydet
admin_site.register(Category, CategoryAdmin)
admin_site.register(Word, WordAdmin)
admin_site.register(LearningPath, LearningPathAdmin)
admin_site.register(LearningPathCategory, LearningPathCategoryAdmin)
admin_site.register(LearningStep, LearningStepAdmin)
admin_site.register(UserProgress, UserProgressAdmin)
admin_site.register(UserStepProgress, UserStepProgressAdmin)
admin_site.register(UserCategoryProgress, UserCategoryProgressAdmin)
admin_site.register(Quiz, QuizAdmin)
admin_site.register(QuizQuestion, QuizQuestionAdmin)
admin_site.register(UserAchievement, UserAchievementAdmin)
admin_site.register(UserProfile, UserProfileAdmin)
admin_site.register(GameScore, GameScoreAdmin)

# Orijinal admin sitesini de güncelle
admin.site.site_title = _('Word Master Yönetim')
admin.site.site_header = _('Word Master Yönetim Paneli')
admin.site.index_title = _('Yönetim Paneli')
