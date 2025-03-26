from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from users.views import register_view, login_view, logout_view, profile_view, dashboard_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('words.urls')),  # This should include a pattern for the empty path
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('dashboard/', dashboard_view, name='dashboard'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)