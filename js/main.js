gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

window.addEventListener('DOMContentLoaded', () => {
    
    new Swiper(".mySwiper", {
        slidesPerView: "auto",
        spaceBetween: 30,
        centeredSlides: true,
        initialSlide: 3,
        loop: false,
        grabCursor: true,
        mousewheel: { forceToAxis: true }
    });

    const scrollVideo = document.getElementById('scrollVideo');
    if (scrollVideo) {
        let observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) scrollVideo.play().catch(() => {});
                else scrollVideo.pause();
            });
        }, { threshold: 0.5 });
        observer.observe(scrollVideo);

        scrollVideo.addEventListener('timeupdate', () => {
            if (scrollVideo.duration && scrollVideo.currentTime >= scrollVideo.duration - 1.1) {
                scrollVideo.currentTime = 0;
                scrollVideo.play().catch(() => {});
            }
        });
    }

    const galleryContainer = document.getElementById('random-images-container-3d') || document.getElementById('random-images-container');
    function loadRandomImages() {
        if (!galleryContainer) return;
        galleryContainer.innerHTML = '';
        const usedNumbers = new Set();
        for (let i = 0; i < 4; i++) {
            const img = document.createElement('img');
            galleryContainer.appendChild(img);
            function tryLoad() {
                let num;
                do { num = Math.floor(Math.random() * 97) + 1; } while (usedNumbers.has(num));
                usedNumbers.add(num);
                img.src = `gallery/images/${num}.webp`;
            }
            img.onerror = tryLoad;
            tryLoad();
        }
    }
    loadRandomImages();

    const btn = document.getElementById('randomize-btn-3d');
    if(btn) {
        btn.onclick = loadRandomImages;
    } else {
        const fallbackBtn = document.createElement('button');
        fallbackBtn.innerText = "Randomize Images";
        fallbackBtn.onclick = loadRandomImages;
        const previewEl = document.getElementById('gallery-preview');
        if(previewEl) previewEl.prepend(fallbackBtn);
    }

    if (window.VineApp && typeof window.VineApp.init === 'function') window.VineApp.init();
    if (window.TerrainApp && typeof window.TerrainApp.init === 'function') window.TerrainApp.init();

    ScrollTrigger.create({
        trigger: "#vine-section",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
            if (window.VineApp) window.VineApp.draw(self.progress);
        }
    });

    gsap.fromTo(".taxo-content, .vine-text-content", 
        { opacity: 0 }, 
        {
            opacity: 1,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
                trigger: "#vine-section",
                start: "center top",
                toggleActions: "play none none reverse"
            }
        }
    );

    ScrollTrigger.create({
        trigger: "#three-section",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
            if (window.TerrainApp && typeof window.TerrainApp.render === 'function') {
                window.TerrainApp.render(self.progress);
            }
        }
    });
});