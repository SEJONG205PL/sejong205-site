// 섹션별 스크롤 기능
window.addEventListener("load", function () {
    const sections = document.querySelectorAll(".section");
    const sectionCount = sections.length;

    if (sectionCount === 0) {
        console.log("섹션을 찾을 수 없습니다");
        return;
    }

    console.log("✅ 섹션 스크롤 활성화:", sectionCount + "개 섹션");

    sections.forEach(function (section, index) {
        section.addEventListener("mousewheel", function (event) {
            event.preventDefault();

            let delta = 0;

            if (!event) event = window.event;
            if (event.wheelDelta) {
                delta = event.wheelDelta / 120;
                if (window.opera) delta = -delta;
            } else if (event.detail) {
                delta = -event.detail / 3;
            }

            let moveTop = window.scrollY;
            let currentSection = sections[index];

            // wheel down : 다음 섹션으로 이동
            if (delta < 0) {
                if (index !== sectionCount - 1) {
                    try {
                        moveTop = window.pageYOffset + currentSection.nextElementSibling.getBoundingClientRect().top;
                        console.log("→ 섹션", index + 2, "로 이동");
                    } catch (e) {
                        console.log("다음 섹션 없음");
                    }
                } else {
                    // 마지막 섹션에서는 푸터로 이동
                    const footer = document.querySelector("footer, #footer");
                    if (footer) {
                        moveTop = footer.offsetTop;
                        console.log("→ 푸터로 이동");
                    }
                }
            }
            // wheel up : 이전 섹션으로 이동
            else {
                if (index !== 0) {
                    try {
                        moveTop =
                            window.pageYOffset + currentSection.previousElementSibling.getBoundingClientRect().top;
                        console.log("→ 섹션", index, "로 이동");
                    } catch (e) {
                        console.log("이전 섹션 없음");
                    }
                } else {
                    // 첫 섹션에서는 최상단으로
                    moveTop = 0;
                    console.log("→ 최상단으로");
                }
            }

            window.scrollTo({top: moveTop, left: 0, behavior: "smooth"});
        });

        // wheel 이벤트도 추가 (Firefox 등 다른 브라우저 지원)
        section.addEventListener(
            "wheel",
            function (event) {
                event.preventDefault();

                const delta = event.deltaY;
                let moveTop = window.scrollY;
                let currentSection = sections[index];

                // 아래로 스크롤
                if (delta > 0) {
                    if (index !== sectionCount - 1) {
                        try {
                            moveTop =
                                window.pageYOffset + currentSection.nextElementSibling.getBoundingClientRect().top;
                            console.log("→ 섹션", index + 2, "로 이동");
                        } catch (e) {}
                    } else {
                        const footer = document.querySelector("footer, #footer");
                        if (footer) {
                            moveTop = footer.offsetTop;
                            console.log("→ 푸터로 이동");
                        }
                    }
                }
                // 위로 스크롤
                else {
                    if (index !== 0) {
                        try {
                            moveTop =
                                window.pageYOffset + currentSection.previousElementSibling.getBoundingClientRect().top;
                            console.log("→ 섹션", index, "로 이동");
                        } catch (e) {}
                    } else {
                        moveTop = 0;
                        console.log("→ 최상단으로");
                    }
                }

                window.scrollTo({top: moveTop, left: 0, behavior: "smooth"});
            },
            {passive: false}
        );
    });

    // 키보드 이벤트 추가
    document.addEventListener("keydown", function (e) {
        // 현재 섹션 찾기
        const scrollTop = window.pageYOffset;
        let currentIndex = 0;

        sections.forEach((section, index) => {
            if (scrollTop >= section.offsetTop - 100) {
                currentIndex = index;
            }
        });

        if (e.key === "ArrowDown" || e.key === "PageDown") {
            e.preventDefault();
            if (currentIndex < sectionCount - 1) {
                const nextSection = sections[currentIndex + 1];
                window.scrollTo({top: nextSection.offsetTop, behavior: "smooth"});
            }
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
            e.preventDefault();
            if (currentIndex > 0) {
                const prevSection = sections[currentIndex - 1];
                window.scrollTo({top: prevSection.offsetTop, behavior: "smooth"});
            } else {
                window.scrollTo({top: 0, behavior: "smooth"});
            }
        }
    });

    // 스크롤 인디케이터 클릭
    const scrollIndicator = document.querySelector(".scroll-indicator");
    if (scrollIndicator) {
        scrollIndicator.style.cursor = "pointer";
        scrollIndicator.addEventListener("click", function (e) {
            e.preventDefault();
            console.log("📍 스크롤 인디케이터 클릭");
            if (sections[1]) {
                window.scrollTo({top: sections[1].offsetTop, behavior: "smooth"});
            }
        });
    }
});

// 기존 코드: 애니메이션 옵저버
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

// 기존 코드: 헤더 설정
document.addEventListener("DOMContentLoaded", () => {
    const isMainPage = document.querySelector(".hero-section") !== null;

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
});

// Categories Slider Initialize
document.addEventListener("DOMContentLoaded", () => {
    const swiper = new Swiper(".categorySwiper", {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        breakpoints: {
            640: {
                slidesPerView: 1.5,
                spaceBetween: 20,
            },
            768: {
                slidesPerView: 2,
                spaceBetween: 24,
            },
            1024: {
                slidesPerView: 2.5,
                spaceBetween: 28,
            },
            1280: {
                slidesPerView: 3,
                spaceBetween: 32,
            },
        },
    });
});
