gsap.registerPlugin(ScrollTrigger);

window.addEventListener('DOMContentLoaded', () => {
    
    new Swiper(".mySwiper", {
        slidesPerView: "auto",
        spaceBetween: 30,
        centeredSlides: true,
        loop: false,
        grabCursor: true
    });

    const scrollVideo = document.getElementById('scrollVideo');
    if (scrollVideo) {
        let observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    scrollVideo.play().catch(() => {});
                } else {
                    scrollVideo.pause();
                }
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

    const galleryContainer = document.getElementById('random-images-container');
    function loadRandomImages() {
        galleryContainer.innerHTML = '';
        const usedNumbers = new Set();
        for (let i = 0; i < 4; i++) {
            let num;
            do { num = Math.floor(Math.random() * 97) + 1; } while (usedNumbers.has(num));
            usedNumbers.add(num);
            const img = document.createElement('img');
            img.src = `gallery/images/${num}.webp`;
            img.onerror = () => img.style.display = 'none';
            galleryContainer.appendChild(img);
        }
    }
    loadRandomImages();
    
    const btn = document.createElement('button');
    btn.innerText = "Randomize Images";
    btn.onclick = loadRandomImages;
    document.getElementById('gallery-preview').prepend(btn);

    if (window.VineApp) {
        window.VineApp.init();
    }

    if (window.TerrainApp && typeof window.TerrainApp.init === 'function') {
        window.TerrainApp.init();
    }

    ScrollTrigger.create({
        trigger: "#vine-section",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
            if (window.VineApp) window.VineApp.draw(self.progress);
        }
    });

    gsap.fromTo(".vine-text-content", 
        { opacity: 0 }, 
        { 
            opacity: 1, 
            duration: 1,
            scrollTrigger: {
                trigger: "#vine-section",
                start: "20% top",
                toggleActions: "play none none none"
            }
        }
    );

    gsap.to(".vine-text-content", {
        y: -300,
        scrollTrigger: {
            trigger: "#vine-section",
            start: "40% top",
            end: "bottom top",
            scrub: true
        }
    });

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