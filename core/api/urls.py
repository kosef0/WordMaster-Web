from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.api.views import (
    LoginView, RegisterView, CategoryViewSet, WordViewSet, UserProfileViewSet,
    UserProgressViewSet, LearningPathViewSet, LearningStepViewSet,
    UserCategoryProgressViewSet, GameScoreViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'words', WordViewSet, basename='word')
router.register(r'profile', UserProfileViewSet, basename='profile')
router.register(r'progress', UserProgressViewSet, basename='progress')
router.register(r'learning-paths', LearningPathViewSet, basename='learning-path')
router.register(r'learning-steps', LearningStepViewSet, basename='learning-step')
router.register(r'category-progress', UserCategoryProgressViewSet, basename='category-progress')
router.register(r'game-scores', GameScoreViewSet, basename='game-scores')

urlpatterns = [
    path('login/', LoginView.as_view(), name='api-login'),
    path('register/', RegisterView.as_view(), name='api-register'),
    path('', include(router.urls)),
] 