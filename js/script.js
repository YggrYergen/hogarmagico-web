const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Animation Observer
    initScrollObserver();

    // 2. Initialize Parallax Effects
    initParallax();

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
 * With prefers-reduced-motion the elements are shown at once, without the slide/fade.
 */
function initScrollObserver() {
    const elementsToReveal = document.querySelectorAll('.reveal-on-scroll');
    if (!elementsToReveal.length) return;

    if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
        elementsToReveal.forEach(el => {
            if (reducedMotionQuery.matches) el.style.transition = 'none';
            el.classList.add('appear');
        });
        // Restore the element's own transitions (hover etc.) once the final state has been painted.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            elementsToReveal.forEach(el => { el.style.transition = ''; });
        }));
        return;
    }

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

    elementsToReveal.forEach(el => observer.observe(el));
}

/**
 * Generic Image Rotation Function
 * Fades between images with the same selector.
 * The timer only runs while the tab is visible, the images' container is on screen and the
 * user has not asked for reduced motion; otherwise nothing is scheduled.
 */
function startImageRotation(selector, interval) {
    const images = document.querySelectorAll(selector);
    if (images.length <= 1) return;

    const lead = Math.min(2000, interval / 2); // how early the next photo starts loading
    let currentIndex = 0;
    let nextIndex = 1;
    let timer = null;
    let running = false;
    let epoch = 0; // bumped on pause so in-flight loads never trigger a transition
    const loads = new Map();
    const visibleContainers = new Set();
    const hasObserver = 'IntersectionObserver' in window;

    // Resolves true once the image is loaded and decoded, false on error. Slides marked with
    // data-src/data-srcset only start downloading here, never at page load.
    const load = (img) => {
        if (!loads.has(img)) {
            if (img.dataset.src) {
                if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                img.src = img.dataset.src;
                delete img.dataset.srcset;
                delete img.dataset.src;
            }
            loads.set(img, typeof img.decode === 'function'
                ? img.decode().then(() => true, () => false)
                : new Promise(resolve => {
                    if (img.complete) return resolve(img.naturalWidth > 0);
                    img.addEventListener('load', () => resolve(true), { once: true });
                    img.addEventListener('error', () => resolve(false), { once: true });
                }));
        }
        return loads.get(img);
    };

    const swap = (index) => {
        images[currentIndex].classList.remove('opacity-100');
        images[currentIndex].classList.add('opacity-0', 'pointer-events-none');

        currentIndex = index;

        images[currentIndex].classList.remove('opacity-0', 'pointer-events-none');
        images[currentIndex].classList.add('opacity-100');
    };

    // One cycle: preload the next photo shortly before it is due, then swap only if it is ready.
    // On error the current slide stays visible and the following candidate is tried next cycle.
    const cycle = () => {
        const myEpoch = epoch;
        const dueAt = performance.now() + interval;
        timer = setTimeout(() => {
            timer = null;
            const candidate = nextIndex;
            load(images[candidate]).then(ok => {
                if (myEpoch !== epoch) return;
                timer = setTimeout(() => {
                    timer = null;
                    if (ok) {
                        swap(candidate);
                        nextIndex = (candidate + 1) % images.length;
                    } else {
                        nextIndex = (candidate + 1) % images.length;
                        if (nextIndex === currentIndex) nextIndex = (nextIndex + 1) % images.length;
                    }
                    cycle();
                }, Math.max(0, dueAt - performance.now()));
            });
        }, interval - lead);
    };

    const sync = () => {
        const shouldRun = !document.hidden && !reducedMotionQuery.matches && (!hasObserver || visibleContainers.size > 0);
        if (shouldRun && !running) {
            running = true;
            cycle();
        } else if (!shouldRun && running) {
            running = false;
            epoch++;
            clearTimeout(timer);
            timer = null;
        }
    };

    document.addEventListener('visibilitychange', sync);
    reducedMotionQuery.addEventListener?.('change', sync);

    if (hasObserver) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) visibleContainers.add(entry.target);
                else visibleContainers.delete(entry.target);
            });
            sync();
        });
        new Set(Array.from(images, img => img.parentElement)).forEach(container => observer.observe(container));
    } else {
        sync();
    }
}

/**
 * Parallax Effects
 * Elements are looked up once; the scroll listener is only attached if there is something to move,
 * is passive, and writes at most once per frame. Skipped entirely under prefers-reduced-motion.
 */
function initParallax() {
    const parallaxElements = Array.from(document.querySelectorAll('.parallax-item'));
    if (!parallaxElements.length) return;

    let frame = 0;
    const update = () => {
        frame = 0;
        if (reducedMotionQuery.matches) {
            parallaxElements.forEach(el => { el.style.transform = ''; });
            return;
        }
        const scrollY = window.scrollY;
        parallaxElements.forEach(el => {
            const speed = el.dataset.speed || 0.5;
            el.style.transform = `translateY(${scrollY * speed}px)`;
        });
    };

    window.addEventListener('scroll', () => {
        if (reducedMotionQuery.matches && !parallaxElements[0].style.transform) return;
        if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });
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
    if (dropdowns.length) {
        document.addEventListener('click', () => {
            dropdowns.forEach(d => d.classList.remove('is-active'));
        });
    }
}

/**
 * Shooting Star Generator for Calma Night Mode
 * Creates nothing while the tab is hidden, the container is off screen or reduced motion is on.
 * @param {string} containerId - ID of the container
 * @param {boolean} [progressive=false] - Whether to use top-heavy distribution
 */
window.createShootingStar = function (containerId, progressive = false) {
    if (document.hidden || reducedMotionQuery.matches) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

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
