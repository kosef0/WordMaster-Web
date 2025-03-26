/**
 * Modern Flashcards JavaScript
 * Enhances the flashcard experience with modern animations and interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const flashcards = document.querySelectorAll('.flashcard');
    const prevButton = document.getElementById('prevCard');
    const nextButton = document.getElementById('nextCard');
    const cardCounter = document.getElementById('cardCounter');
    const categoryFilter = document.getElementById('categoryFilter');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const searchInput = document.getElementById('searchInput');
    const markLearnedButton = document.getElementById('markLearned');
    const markReviewButton = document.getElementById('markReview');
    const resetCardsButton = document.getElementById('resetCards');
    const pageButtons = document.querySelectorAll('.page-btn');
    
    // State
    let currentCardIndex = 0;
    let visibleCards = [...flashcards];
    let cardsPerPage = 10;
    let currentPage = 1;
    
    // Initialize
    updateCardCounter();
    highlightActiveCard();
    
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
    
    function createRipple(event) {
        const button = event.currentTarget;
        
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');
        
        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }
        
        button.appendChild(circle);
    }
    
    // Flashcard click to flip with enhanced animation
    flashcards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't flip if clicking on action buttons
            if (e.target.closest('.flashcard-actions')) {
                return;
            }
            
            this.classList.toggle('flipped');
            
            // Add pulse animation when flipped
            const inner = this.querySelector('.flashcard-inner');
            inner.classList.add('pulse');
            setTimeout(() => {
                inner.classList.remove('pulse');
            }, 1000);
        });
        
        // Individual card action buttons
        const knownBtn = card.querySelector('.mark-known');
        const reviewBtn = card.querySelector('.mark-review');
        
        if (knownBtn) {
            knownBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                updateCardProgress(card, 100);
                showToast('Kelime öğrenildi olarak işaretlendi!');
            });
        }
        
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                updateCardProgress(card, 50);
                showToast('Kelime tekrar edilecek olarak işaretlendi!');
            });
        }
    });
    
    // Navigation buttons with enhanced effects
    prevButton.addEventListener('click', function() {
        if (currentCardIndex > 0) {
            navigateCards('prev');
        }
    });
    
    nextButton.addEventListener('click', function() {
        if (currentCardIndex < visibleCards.length - 1) {
            navigateCards('next');
        }
    });
    
    function navigateCards(direction) {
        // Remove active class and add exit animation
        visibleCards[currentCardIndex].classList.remove('active');
        
        if (direction === 'next') {
            visibleCards[currentCardIndex].classList.add('slideOutLeft');
            currentCardIndex++;
        } else {
            visibleCards[currentCardIndex].classList.add('slideOutRight');
            currentCardIndex--;
        }
        
        // After animation completes, remove animation class
        setTimeout(() => {
            flashcards.forEach(card => {
                card.classList.remove('slideOutLeft', 'slideOutRight', 'slideInLeft', 'slideInRight');
            });
            
            // Add entrance animation and active class to new card
            visibleCards[currentCardIndex].classList.add('active');
            visibleCards[currentCardIndex].classList.add(direction === 'next' ? 'slideInRight' : 'slideInLeft');
            
            updateCardCounter();
            highlightActiveCard();
        }, 300);
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        applyFilters();
    });
    
    // Filters
    categoryFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);
    
    function applyFilters() {
        const categoryValue = categoryFilter.value;
        const difficultyValue = difficultyFilter.value;
        const searchValue = searchInput.value.toLowerCase();
        
        visibleCards = [...flashcards].filter(card => {
            let showCard = true;
            
            // Category filter
            if (categoryValue && showCard) {
                const categories = card.dataset.category.trim().split(' ');
                if (!categories.includes(categoryValue)) {
                    showCard = false;
                }
            }
            
            // Difficulty filter
            if (difficultyValue && showCard) {
                if (card.dataset.difficulty !== difficultyValue) {
                    showCard = false;
                }
            }
            
            // Search filter
            if (searchValue && showCard) {
                const frontWord = card.querySelector('.flashcard-front .flashcard-word').textContent.toLowerCase();
                const backWord = card.querySelector('.flashcard-back .flashcard-word').textContent.toLowerCase();
                if (!frontWord.includes(searchValue) && !backWord.includes(searchValue)) {
                    showCard = false;
                }
            }
            
            // Update visibility
            card.style.display = showCard ? 'block' : 'none';
            return showCard;
        });
        
        // Reset to first card
        if (visibleCards.length > 0) {
            flashcards.forEach(card => card.classList.remove('active'));
            currentCardIndex = 0;
            visibleCards[0].classList.add('active');
            highlightActiveCard();
        }
        
        updateCardCounter();
        updatePagination();
    }
    
    function updateCardCounter() {
        if (visibleCards.length === 0) {
            cardCounter.textContent = '0 / 0';
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }
        
        cardCounter.textContent = `${currentCardIndex + 1} / ${visibleCards.length}`;
        prevButton.disabled = currentCardIndex === 0;
        nextButton.disabled = currentCardIndex === visibleCards.length - 1;
        
        // Add pulse animation to counter when it changes
        cardCounter.classList.add('pulse');
        setTimeout(() => {
            cardCounter.classList.remove('pulse');
        }, 500);
    }
    
    function highlightActiveCard() {
        // Remove highlight from all cards
        flashcards.forEach(card => {
            card.classList.remove('highlight');
        });
        
        // Add highlight to active card
        if (visibleCards.length > 0) {
            visibleCards[currentCardIndex].classList.add('highlight');
        }
    }
    
    // Mark buttons with enhanced feedback
    markLearnedButton.addEventListener('click', function() {
        if (visibleCards.length === 0) return;
        
        const currentCard = visibleCards[currentCardIndex];
        const wordId = currentCard.dataset.wordId;
        
        // Update progress bar
        updateCardProgress(currentCard, 100);
        
        // Show success feedback
        showToast('Kelime öğrenildi olarak işaretlendi!');
        
        // Move to next card if available
        if (currentCardIndex < visibleCards.length - 1) {
            setTimeout(() => {
                navigateCards('next');
            }, 500);
        }
    });
    
    markReviewButton.addEventListener('click', function() {
        if (visibleCards.length === 0) return;
        
        const currentCard = visibleCards[currentCardIndex];
        const wordId = currentCard.dataset.wordId;
        
        // Update progress bar
        updateCardProgress(currentCard, 50);
        
        // Show feedback
        showToast('Kelime tekrar edilecek olarak işaretlendi!');
        
        // Move to next card if available
        if (currentCardIndex < visibleCards.length - 1) {
            setTimeout(() => {
                navigateCards('next');
            }, 500);
        }
    });
    
    resetCardsButton.addEventListener('click', function() {
        // Reset all progress bars
        flashcards.forEach(card => {
            updateCardProgress(card, 0);
        });
        
        showToast('Tüm kartlar sıfırlandı!');
    });
    
    function updateCardProgress(card, progress) {
        const progressBar = card.querySelector('.flashcard-progress');
        if (progressBar) {
            // Animate progress change
            const currentWidth = parseInt(progressBar.style.width) || 0;
            const step = 5;
            const duration = 500; // ms
            const steps = Math.abs(progress - currentWidth) / step;
            const interval = duration / steps;
            
            let currentProgress = currentWidth;
            const timer = setInterval(() => {
                if ((progress > currentWidth && currentProgress >= progress) ||
                    (progress < currentWidth && currentProgress <= progress)) {
                    clearInterval(timer);
                    progressBar.style.width = `${progress}%`;
                    return;
                }
                
                currentProgress += progress > currentWidth ? step : -step;
                progressBar.style.width = `${currentProgress}%`;
            }, interval);
        }
    }
    
    // Pagination
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('more')) return;
            
            const page = parseInt(this.dataset.page);
            currentPage = page;
            
            // Update active page button
            pageButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show cards for this page
            const startIndex = (page - 1) * cardsPerPage;
            const endIndex = startIndex + cardsPerPage;
            
            flashcards.forEach((card, index) => {
                if (index >= startIndex && index < endIndex) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Reset current card index
            currentCardIndex = 0;
            visibleCards = [...flashcards].filter(card => card.style.display !== 'none');
            
            if (visibleCards.length > 0) {
                flashcards.forEach(card => card.classList.remove('active'));
                visibleCards[0].classList.add('active');
            }
            
            updateCardCounter();
            highlightActiveCard();
        });
    });
    
    function updatePagination() {
        const totalPages = Math.ceil(visibleCards.length / cardsPerPage);
        
        pageButtons.forEach(button => {
            if (button.classList.contains('more')) return;
            
            const page = parseInt(button.dataset.page);
            if (page <= totalPages) {
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        });
    }
    
    // Toast notification system
    function showToast(message, type = 'success') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => {
            toast.remove();
        });
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Left arrow key - previous card
        if (e.key === 'ArrowLeft' && !prevButton.disabled) {
            navigateCards('prev');
        }
        
        // Right arrow key - next card
        if (e.key === 'ArrowRight' && !nextButton.disabled) {
            navigateCards('next');
        }
        
        // Space key - flip card
        if (e.key === ' ' && visibleCards.length > 0) {
            visibleCards[currentCardIndex].classList.toggle('flipped');
            e.preventDefault(); // Prevent page scroll
        }
    });
});