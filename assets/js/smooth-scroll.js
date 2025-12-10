/*
======================================================
Smooth Scroll - IMPROVED VERSION
- 더 빠른 반응속도
- 모바일 최적화
- 자연스러운 느낌
======================================================
*/

(function () {
    // 모바일 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 1024;

    // 모바일에서는 스무스 스크롤 비활성화
    if (isMobile) {
        return;
    }

    let current = 0;
    let target = 0;
    let ease = 0.15; // 0.1 → 0.15 (더 빠른 반응)
    let speed = 1.2; // 1.0 → 1.2 (더 빠른 스크롤)
    let rafId = null;
    let isScrolling = false;

    document.documentElement.style.willChange = "scroll-position";
    window.__smoothScrollTarget = target;

    /* 애니메이션 업데이트 */
    function update() {
        target = window.__smoothScrollTarget;
        const diff = Math.abs(target - current);

        // 차이가 작으면 즉시 동기화
        if (diff < 0.3) {
            current = target;
            window.scrollTo(0, current);
            isScrolling = false;
            return;
        }

        // 부드러운 보간
        current += (target - current) * ease;
        window.scrollTo(0, current);

        rafId = requestAnimationFrame(update);
    }

    /* 스크롤 시작 */
    function startScroll() {
        if (!isScrolling) {
            isScrolling = true;
            rafId = requestAnimationFrame(update);
        }
    }

    /* 휠 이벤트 - 쓰로틀링 제거 (더 빠른 반응) */
    window.addEventListener(
        "wheel",
        function (e) {
            // 타겟 위치 업데이트
            window.__smoothScrollTarget += e.deltaY * speed;

            // 바운더리 체크
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));

            startScroll();
            e.preventDefault();
        },
        {passive: false}
    );

    /* 키보드 스크롤 */
    window.addEventListener("keydown", function (e) {
        let delta = 0;

        switch (e.key) {
            case "ArrowDown":
                delta = 120; // 100 → 120
                break;
            case "ArrowUp":
                delta = -120;
                break;
            case "PageDown":
                delta = window.innerHeight * 0.85;
                break;
            case "PageUp":
                delta = -window.innerHeight * 0.85;
                break;
            case "Home":
                window.__smoothScrollTarget = 0;
                startScroll();
                e.preventDefault();
                return;
            case "End":
                window.__smoothScrollTarget = document.body.scrollHeight - window.innerHeight;
                startScroll();
                e.preventDefault();
                return;
            default:
                return;
        }

        if (delta !== 0) {
            window.__smoothScrollTarget += delta;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));
            startScroll();
            e.preventDefault();
        }
    });

    /* 스페이스바 */
    window.addEventListener("keydown", function (e) {
        if (e.code === "Space") {
            const delta = e.shiftKey ? -window.innerHeight * 0.85 : window.innerHeight * 0.85;
            window.__smoothScrollTarget += delta;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));
            startScroll();
            e.preventDefault();
        }
    });

    /* 리사이즈 */
    window.addEventListener("resize", function () {
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        if (window.__smoothScrollTarget > maxScroll) {
            window.__smoothScrollTarget = Math.max(0, maxScroll);
        }
    });

    /* 초기화 */
    window.__smoothScrollTarget = window.pageYOffset || document.documentElement.scrollTop;
    current = window.__smoothScrollTarget;

    if (window.__smoothScrollTarget > 0) {
        window.scrollTo(0, current);
    }
})();
