// Main JavaScript file for WordMaster

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            
            // Animate hamburger to X
            const spans = this.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('active'));
        });
    }
    
    // Close notifications
    const closeButtons = document.querySelectorAll('.close-notification');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notification = this.parentElement;
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        });
    });
    
    // Animate elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 50) {
                element.classList.add('animated');
            }
        });
    };
    
    // Run on load
    animateOnScroll();
    
    // Run on scroll
    window.addEventListener('scroll', animateOnScroll);
});

// Flash messages auto-dismiss
const messages = document.querySelectorAll('.alert');
if (messages.length > 0) {
    messages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.style.display = 'none';
            }, 500);
        }, 5000);
    });
}

// Initialize any charts if they exist on the page
initializeCharts();

function initializeCharts() {
    const progressChart = document.getElementById('progressChart');
    
    if (progressChart) {
        new Chart(progressChart, {
            type: 'line',
            data: {
                labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
                datasets: [{
                    label: 'Öğrenilen Kelimeler',
                    data: [5, 8, 12, 7, 10, 15, 9],
                    borderColor: '#4a6fa5',
                    backgroundColor: 'rgba(74, 111, 165, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Kelime Sayısı'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Günler'
                        }
                    }
                }
            }
        });
    }

    const categoryChart = document.getElementById('categoryChart');
    
    if (categoryChart) {
        new Chart(categoryChart, {
            type: 'doughnut',
            data: {
                labels: ['İş', 'Seyahat', 'Teknoloji', 'Günlük Konuşma', 'Akademik'],
                datasets: [{
                    data: [25, 20, 30, 15, 10],
                    backgroundColor: [
                        '#4a6fa5',
                        '#166088',
                        '#4caf50',
                        '#ff9800',
                        '#e91e63'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Kategori Dağılımı'
                    }
                }
            }
        });
    }
}

// Flash card functionality
function initFlashCards() {
    const flashcards = document.querySelectorAll('.flashcard');
    
    flashcards.forEach(card => {
        card.addEventListener('click', function() {
            this.classList.toggle('flipped');
        });
    });
}

// Quiz functionality
function handleQuizSubmission() {
    const quizForm = document.getElementById('quizForm');
    
    if (quizForm) {
        quizForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect answers
            const answers = [];
            const questions = quizForm.querySelectorAll('.quiz-question');
            
            questions.forEach(question => {
                const questionId = question.dataset.questionId;
                const selectedOption = question.querySelector('input[name="question_' + questionId + '"]:checked');
                
                if (selectedOption) {
                    answers.push({
                        questionId: questionId,
                        answer: selectedOption.value
                    });
                }
            });
            
            // Send answers to backend (to be implemented)
            console.log('Quiz answers:', answers);
            
            // Show results (placeholder)
            showQuizResults(answers);
        });
    }
}

function showQuizResults(answers) {
    // This is a placeholder function that would be replaced with actual API call
    // For now, just show a success message
    const quizContainer = document.querySelector('.quiz-container');
    
    if (quizContainer) {
        quizContainer.innerHTML = `
            <div class="quiz-results">
                <h2>Quiz Tamamlandı!</h2>
                <p>Cevaplarınız kaydedildi. Sonuçlarınız hesaplanıyor...</p>
                <div class="score-container">
                    <div class="score">7/10</div>
                    <p>Doğru Cevap</p>
                </div>
                <a href="/dashboard" class="btn btn-primary">Panele Dön</a>
            </div>
        `;
    }
}

// Word search functionality
function initWordSearch() {
    const searchForm = document.getElementById('wordSearchForm');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const searchTerm = document.getElementById('searchInput').value;
            
            // This would be replaced with an actual API call
            console.log('Searching for:', searchTerm);
            
            // Placeholder for search results
            fetchSearchResults(searchTerm);
        });
    }
}

function fetchSearchResults(term) {
    // This is a placeholder function that would be replaced with actual API call
    // For demonstration, just show some dummy results
    const resultsContainer = document.getElementById('searchResults');
    
    if (resultsContainer) {
        // Simulate loading
        resultsContainer.innerHTML = '<div class="loading">Aranıyor...</div>';
        
        setTimeout(() => {
            resultsContainer.innerHTML = `
                <div class="search-results">
                    <h3>Arama Sonuçları: "${term}"</h3>
                    <div class="word-card">
                        <h4>accomplish</h4>
                        <p>başarmak, gerçekleştirmek</p>
                        <span class="part-of-speech">fiil</span>
                    </div>
                    <div class="word-card">
                        <h4>achievement</h4>
                        <p>başarı, kazanım</p>
                        <span class="part-of-speech">isim</span>
                    </div>
                    <div class="word-card">
                        <h4>success</h4>
                        <p>başarı, zafer</p>
                        <span class="part-of-speech">isim</span>
                    </div>
                </div>
            `;
        }, 1000);
    }
}

// Initialize all interactive elements
document.addEventListener('DOMContentLoaded', function() {
    initFlashCards();
    handleQuizSubmission();
    initWordSearch();
});