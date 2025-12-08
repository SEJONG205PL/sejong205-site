document.addEventListener("DOMContentLoaded", () => {
    const topBtn = document.getElementById("topBtn");

    // 버튼 표시/숨김
    window.addEventListener("scroll", () => {
        topBtn.classList.toggle("show", window.scrollY > 150);
    });

    topBtn.addEventListener("click", () => {
        // 스무스 스크롤 시스템의 target 값을 0으로 초기화
        window.__smoothScrollTarget = 0;

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    });
});
