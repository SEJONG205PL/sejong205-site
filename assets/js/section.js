// document.addEventListener("DOMContentLoaded", () => {
//     const slides = document.querySelectorAll(".hero-slide");
//     const prevBtn = document.querySelector(".hero-prev");
//     const nextBtn = document.querySelector(".hero-next");
//     let index = 0;

//     // Set background image from data-bg
//     slides.forEach((slide) => {
//         const bg = slide.getAttribute("data-bg");
//         slide.style.backgroundImage = `url(${bg})`;
//     });

//     function showSlide(i) {
//         slides.forEach((s) => s.classList.remove("active"));
//         slides[i].classList.add("active");
//     }

//     function nextSlide() {
//         index = (index + 1) % slides.length;
//         showSlide(index);
//     }

//     function prevSlide() {
//         index = (index - 1 + slides.length) % slides.length;
//         showSlide(index);
//     }

//     nextBtn.addEventListener("click", nextSlide);
//     prevBtn.addEventListener("click", prevSlide);

//     // Auto slide every 5 seconds
//     setInterval(nextSlide, 5000);
// });

document.addEventListener("DOMContentLoaded", () => {
    const observerOptions = {
        threshold: 0.3,
        rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const title = entry.target.querySelector(".intro-tit");
                const content = entry.target.querySelector(".intro-content");

                if (title) title.classList.add("show");
                if (content) content.classList.add("show");
            }
        });
    }, observerOptions);

    const section = document.querySelector(".mein_introduction");
    if (section) {
        observer.observe(section);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const isMainPage = document.querySelector(".hero-section") !== null; // 여기 수정!

    if (isMainPage) {
        document.body.classList.add("main-page");

        // PC에서만 투명 헤더
        if (window.innerWidth > 1024) {
            setTimeout(() => {
                const header = document.querySelector(".main-header");
                if (header) {
                    header.classList.add("transparent-header");

                    // 스크롤 이벤트
                    window.addEventListener("scroll", () => {
                        if (window.scrollY > 50) {
                            header.classList.add("scrolled");
                            header.classList.remove("transparent-header");
                        } else {
                            header.classList.remove("scrolled");
                            header.classList.add("transparent-header");
                        }
                    });

                    // 마우스 호버 이벤트
                    header.addEventListener("mouseenter", () => {
                        if (window.scrollY < 50) {
                            header.classList.add("hovered");
                        }
                    });

                    header.addEventListener("mouseleave", () => {
                        if (window.scrollY < 50) {
                            header.classList.remove("hovered");
                        }
                    });
                }
            }, 500);
        }
    }

    // 기존 스크롤 애니메이션 코드...
    const observerOptions = {
        threshold: 0.3,
        rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const title = entry.target.querySelector(".intro-tit");
                const content = entry.target.querySelector(".intro-content");

                if (title) title.classList.add("show");
                if (content) content.classList.add("show");
            }
        });
    }, observerOptions);

    const section = document.querySelector(".mein_introduction");
    if (section) {
        observer.observe(section);
    }
});
