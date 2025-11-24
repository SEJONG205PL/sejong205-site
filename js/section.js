document.addEventListener("DOMContentLoaded", () => {
    new Swiper(".mainSwiper", {
        loop: true,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        speed: 900, // 부드러운 트랜지션
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        effect: "fade", // 페이드 슬라이드 (원하면 slide로 바꿔도 ok)
        fadeEffect: {
            crossFade: true,
        },
    });
});
