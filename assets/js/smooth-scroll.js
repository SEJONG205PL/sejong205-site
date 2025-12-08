/*
======================================================
Smooth Scroll - OPTIMIZED VERSION
- 성능 최적화
- 버벅거림 제거
- 메모리 누수 방지
======================================================
*/

(function () {
    let current = 0;
    let target = 0;
    let ease = 0.1; // 0.08 → 0.1 (더 빠른 반응)
    let speed = 1.0; // 1.2 → 1.0 (적절한 속도)
    let rafId = null;
    let isScrolling = false;
    let scrollTimeout = null;

    // 성능 최적화: will-change 설정
    document.documentElement.style.willChange = "scroll-position";

    // 외부 접근용
    window.__smoothScrollTarget = target;

    /* --------------------------------------------------
    애니메이션 업데이트 (최적화)
    -------------------------------------------------- */
    function update() {
        target = window.__smoothScrollTarget;

        // 차이가 거의 없으면 즉시 동기화
        const diff = Math.abs(target - current);

        if (diff < 0.5) {
            current = target;
            window.scrollTo(0, current);
            isScrolling = false;
            return; // RAF 중단
        }

        // 부드러운 보간
        current += (target - current) * ease;
        window.scrollTo(0, current);

        // 계속 애니메이션
        rafId = requestAnimationFrame(update);
    }

    /* --------------------------------------------------
    스크롤 시작
    -------------------------------------------------- */
    function startScroll() {
        if (!isScrolling) {
            isScrolling = true;
            rafId = requestAnimationFrame(update);
        }
    }

    /* --------------------------------------------------
    휠 이벤트 (쓰로틀링 적용)
    -------------------------------------------------- */
    let lastWheelTime = 0;
    const wheelThrottle = 16; // 약 60fps

    window.addEventListener(
        "wheel",
        function (e) {
            const now = Date.now();

            // 쓰로틀링: 16ms마다만 처리
            if (now - lastWheelTime < wheelThrottle) {
                e.preventDefault();
                return;
            }
            lastWheelTime = now;

            // 타겟 위치 업데이트
            window.__smoothScrollTarget += e.deltaY * speed;

            // 바운더리 체크
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));

            // 스크롤 시작
            startScroll();

            e.preventDefault();
        },
        {passive: false}
    );

    /* --------------------------------------------------
    터치 이벤트 (모바일 지원)
    -------------------------------------------------- */
    let touchStartY = 0;
    let touchStartScroll = 0;

    window.addEventListener(
        "touchstart",
        function (e) {
            touchStartY = e.touches[0].clientY;
            touchStartScroll = window.__smoothScrollTarget;
        },
        {passive: true}
    );

    window.addEventListener(
        "touchmove",
        function (e) {
            const touchY = e.touches[0].clientY;
            const diff = touchStartY - touchY;

            window.__smoothScrollTarget = touchStartScroll + diff;

            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));

            startScroll();
        },
        {passive: true}
    );

    /* --------------------------------------------------
    키보드 스크롤 지원
    -------------------------------------------------- */
    window.addEventListener("keydown", function (e) {
        let delta = 0;

        switch (e.key) {
            case "ArrowDown":
                delta = 100;
                break;
            case "ArrowUp":
                delta = -100;
                break;
            case "PageDown":
                delta = window.innerHeight * 0.8;
                break;
            case "PageUp":
                delta = -window.innerHeight * 0.8;
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

    /* --------------------------------------------------
    스페이스바 스크롤
    -------------------------------------------------- */
    window.addEventListener("keydown", function (e) {
        if (e.code === "Space") {
            const delta = e.shiftKey ? -window.innerHeight * 0.8 : window.innerHeight * 0.8;
            window.__smoothScrollTarget += delta;

            const maxScroll = document.body.scrollHeight - window.innerHeight;
            window.__smoothScrollTarget = Math.max(0, Math.min(window.__smoothScrollTarget, maxScroll));

            startScroll();
            e.preventDefault();
        }
    });

    /* --------------------------------------------------
    리사이즈 처리
    -------------------------------------------------- */
    window.addEventListener("resize", function () {
        const maxScroll = document.body.scrollHeight - window.innerHeight;

        if (window.__smoothScrollTarget > maxScroll) {
            window.__smoothScrollTarget = Math.max(0, maxScroll);
        }
    });

    /* --------------------------------------------------
    초기 위치 동기화
    -------------------------------------------------- */
    window.__smoothScrollTarget = window.pageYOffset || document.documentElement.scrollTop;
    current = window.__smoothScrollTarget;

    // 페이지 로드 시 스크롤 복원
    if (window.__smoothScrollTarget > 0) {
        window.scrollTo(0, current);
    }
})();
