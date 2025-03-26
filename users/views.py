from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm

def register_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Hesabınız başarıyla oluşturuldu!')
            return redirect('dashboard')
        else:
            messages.error(request, 'Kayıt sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edin.')
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'users/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            messages.success(request, 'Başarıyla giriş yaptınız!')
            return redirect('dashboard')
        else:
            messages.error(request, 'Geçersiz kullanıcı adı veya şifre.')
    
    return render(request, 'users/login.html')

def logout_view(request):
    logout(request)
    messages.info(request, 'Başarıyla çıkış yaptınız.')
    return redirect('home')

@login_required
def profile_view(request):
    return render(request, 'users/profile.html')

@login_required
def dashboard_view(request):
    return render(request, 'users/dashboard.html')