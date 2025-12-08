document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".hero-slide");
    const prevBtn = document.querySelector(".hero-prev");
    const nextBtn = document.querySelector(".hero-next");
    let index = 0;

    // Set background image from data-bg
    slides.forEach((slide) => {
        const bg = slide.getAttribute("data-bg");
        slide.style.backgroundImage = `url(${bg})`;
    });

    function showSlide(i) {
        slides.forEach((s) => s.classList.remove("active"));
        slides[i].classList.add("active");
    }

    function nextSlide() {
        index = (index + 1) % slides.length;
        showSlide(index);
    }

    function prevSlide() {
        index = (index - 1 + slides.length) % slides.length;
        showSlide(index);
    }

    nextBtn.addEventListener("click", nextSlide);
    prevBtn.addEventListener("click", prevSlide);

    // Auto slide every 5 seconds
    setInterval(nextSlide, 5000);
});
