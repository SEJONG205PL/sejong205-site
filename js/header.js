function initMobileHeader() {
    /* =================================
     *  PC HEADER (MEGA MENU)
     * ================================= */
    const navWrapper = document.querySelector(".nav-wrapper");
    if (navWrapper) {
        const links = navWrapper.querySelectorAll(".nav-link[data-mega]");
        const megaMenus = navWrapper.querySelectorAll(".mega-menu");

        function closeAllMega() {
            megaMenus.forEach((m) => m.classList.remove("open"));
        }

        links.forEach((link) => {
            link.addEventListener("mouseenter", () => {
                if (window.innerWidth < 960) return;
                closeAllMega();
                const target = document.getElementById(link.dataset.mega);
                if (target) target.classList.add("open");
            });
        });

        navWrapper.addEventListener("mouseleave", () => {
            if (window.innerWidth < 960) return;
            closeAllMega();
        });

        document.addEventListener("click", (e) => {
            if (window.innerWidth >= 960) return;
            if (!navWrapper.contains(e.target)) closeAllMega();
        });
    }

    /* =================================
     *  MOBILE HEADER
     * ================================= */
    const toggleBtn = document.querySelector(".mobile-nav-toggle");
    const mobileNav = document.querySelector(".mobile-nav");
    const acc1 = document.querySelectorAll(".mobile-accordion");
    const acc2 = document.querySelectorAll(".mobile-accordion-lv2");

    /* ▪ 햄버거 토글 */
    if (toggleBtn && mobileNav) {
        toggleBtn.addEventListener("click", () => {
            mobileNav.classList.toggle("open");
            toggleBtn.classList.toggle("active");
        });
    }

    /* ▪ 1단 (대분류) */
    acc1.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling; // .mobile-sub 또는 .mobile-sub-lv2
            const opened = btn.classList.contains("active");

            // 모든 1단/2단 닫기
            acc1.forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".mobile-sub, .mobile-sub-lv2").forEach((s) => s.classList.remove("open"));

            // 방금 누른 것 다시 열기
            if (!opened && sub) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    /* ▪ 2단 (중분류 → 소분류) */
    acc2.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling;
            const parent = btn.closest(".mobile-sub");
            const opened = btn.classList.contains("active");

            if (!parent || !sub) return;

            // 같은 그룹의 2단 전부 닫기
            parent.querySelectorAll(".mobile-accordion-lv2").forEach((b) => b.classList.remove("active"));
            parent.querySelectorAll(".mobile-sub-lv2").forEach((s) => s.classList.remove("open"));

            // 클릭한 것만 다시 열기
            if (!opened) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    /* ▪ 모바일 메뉴 밖 터치 시 닫기 */
    document.addEventListener("click", (e) => {
        if (!mobileNav || !toggleBtn) return;
        if (!mobileNav.classList.contains("open")) return;
        if (mobileNav.contains(e.target) || toggleBtn.contains(e.target)) return;
        mobileNav.classList.remove("open");
        toggleBtn.classList.remove("active");
    });

    /* ▪ 해상도 변경 시 리셋 */
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
            if (mobileNav) mobileNav.classList.remove("open");
            if (toggleBtn) toggleBtn.classList.remove("active");
        }
    });
}

/* 🔥 fetch 이후 실행할 수 있도록 전역으로 등록 */
window.initMobileHeader = initMobileHeader;
