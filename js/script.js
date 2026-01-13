document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Animation Observer
    initScrollObserver();

    // 2. Initialize Parallax Effects
    window.addEventListener('scroll', handleParallax);

    // 3. Start Index Portals Rotation
    startImageRotation('.portal-bg-left', 5000);
    startImageRotation('.portal-bg-right', 5500); // Slight offset for organic feel

    // 4. Start Chascona Adobe Texture Rotation
    startImageRotation('.adobe-texture-img', 5000);

    // 5. Initialize Click-triggered Dropdowns
    initDropdowns();
});

/**
 * Observer for "Entrance" animations.
 * Triggers .appear class on .reveal-on-scroll elements.
 */
function initScrollObserver() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToReveal = document.querySelectorAll('.reveal-on-scroll');
    elementsToReveal.forEach(el => observer.observe(el));
}

/**
 * Generic Image Rotation Function
 * Fades between images with the same selector.
 */
function startImageRotation(selector, interval) {
    const images = document.querySelectorAll(selector);
    if (images.length <= 1) return;

    let currentIndex = 0;
    setInterval(() => {
        images[currentIndex].classList.remove('opacity-100');
        images[currentIndex].classList.add('opacity-0', 'pointer-events-none');

        currentIndex = (currentIndex + 1) % images.length;

        images[currentIndex].classList.remove('opacity-0', 'pointer-events-none');
        images[currentIndex].classList.add('opacity-100');
    }, interval);
}

/**
 * Handle Parallax Effects
 */
function handleParallax() {
    const parallaxElements = document.querySelectorAll('.parallax-item');
    const scrollY = window.scrollY;

    parallaxElements.forEach(el => {
        const speed = el.dataset.speed || 0.5;
        // Optimization: only transform if element is somewhat in view
        el.style.transform = `translateY(${scrollY * speed}px)`;
    });
}

// Global Navigation Toggle
window.toggleMobileMenu = function () {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('hidden');
        menu.classList.toggle('flex');
    }
};

/**
 * Initialize Click-triggered Dropdowns
 * Replaces hover interaction for better mobile/touch support.
 */
function initDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-item-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('a');

        trigger.addEventListener('click', (e) => {
            // Only handle if it's on a desktop or specifically for these custom dropdowns
            // Prevent default only if we want to toggle the menu instead of navigating immediately
            e.preventDefault();
            e.stopPropagation();

            // Close other dropdowns
            dropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove('is-active');
            });

            dropdown.classList.toggle('is-active');
        });
    });

    // Click outside to close
    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('is-active'));
    });
}

/**
 * Shooting Star Generator for Calma Night Mode
 * @param {string} containerId - ID of the container
 * @param {boolean} [progressive=false] - Whether to use top-heavy distribution
 */
window.createShootingStar = function (containerId, progressive = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const star = document.createElement('div');
    star.className = 'shooting-star absolute h-px bg-gradient-to-r from-white to-transparent opacity-0 pointer-events-none';

    // Random position and length
    const startX = Math.random() * 100;

    let startY;
    if (progressive) {
        // Favoring the top (using Math.pow to cluster near 0)
        // We multiply by 80 to allow stars in the lower part as requested
        startY = Math.pow(Math.random(), 2) * 80;
    } else {
        startY = Math.random() * 60; // Standard 60% top spread
    }

    const length = 100 + Math.random() * 150;

    star.style.left = startX + '%';
    star.style.top = startY + '%';
    star.style.width = length + 'px';
    star.style.transform = 'rotate(-45deg)';

    container.appendChild(star);

    // CSS Animation will handle the movement
    setTimeout(() => star.remove(), 2000);
};
