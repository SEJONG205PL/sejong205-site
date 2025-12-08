/*
======================================================
Breadcrumb & Sub-page Navigation Full Version
- header-menu.js 메뉴 데이터 연동
- 일반 subpage 자동 breadcrumb, subnav 생성
- Footer pages도 독립 네비게이션 지원
======================================================
*/

(function () {
    let menuData = null;

    /* =========================
       메뉴 데이터 수신
    ========================= */
    window.addEventListener("menuDataLoaded", (e) => {
        menuData = e.detail;
        init();
    });

    if (document.readyState !== "loading") waitForMenuData();
    else document.addEventListener("DOMContentLoaded", waitForMenuData);

    function waitForMenuData() {
        // header-menu cache 우선 사용
        if (window.debugMenu && window.debugMenu.getCache()) {
            menuData = window.debugMenu.getCache();
            init();
            return;
        }

        let timer = setInterval(() => {
            if (window.debugMenu && window.debugMenu.getCache()) {
                menuData = window.debugMenu.getCache();
                clearInterval(timer);
                init();
            }
        }, 120);

        setTimeout(() => clearInterval(timer), 2500); // 안전종료
    }

    /* =========================
        메인 실행
    ========================= */
    function init() {
        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        const path = location.pathname;

        // =======================
        // 1) Footer Pages 먼저 처리 (정적)
        // =======================
        if (path.startsWith("/subpage/footer/")) {
            return buildFooterMenu(path, breadcrumbEl, titleEl, subNavInner);
        }

        // =======================
        // 2) 메뉴 기반 일반 subpage 처리
        // =======================
        if (!menuData) return;

        let current = findMenuByLink(path);

        // breadcrumb 생성
        if (breadcrumbEl) breadcrumbEl.textContent = current ? makeBreadcrumb(current) : "";

        // 타이틀 적용
        if (titleEl && current) titleEl.textContent = current.name;

        // sub-navigation 생성 (동일 부모 depth3만 표시)
        if (subNavInner && current) {
            const siblings = menuData.filter((m) => m.parent_id === current.parent_id && m.depth === 3);
            subNavInner.innerHTML = siblings
            .map((m) => `<a href="${m.link}" class="sub-nav__item ${m.link === path ? "is-active" : ""}">${m.name}</a>`)
            .join("");
        }
    }

    /* ==================================================
        🔥 Footer Pages 처리 (Vendor, Policies, Legal)
    ================================================== */
    function buildFooterMenu(path, breadcrumbEl, titleEl, subNavInner) {
        const groups = {
            "/subpage/footer/legal_information/": {
                title: "Legal Information",
                items: [
                    {name: "Legal Info", link: "/subpage/footer/legal_information/legal-info.html"},
                    {name: "Legal Notice", link: "/subpage/footer/legal_information/legal-notice.html"},
                    {name: "Privacy Policy", link: "/subpage/footer/legal_information/privacy-policy.html"},
                ],
            },
            "/subpage/footer/policies/": {
                title: "Policies",
                items: [
                    {name: "Refund Policy", link: "/subpage/footer/policies/refund.html"},
                    {name: "Shipping Policy", link: "/subpage/footer/policies/shipping.html"},
                ],
            },
            "/subpage/footer/vendor/": {
                title: "Vendor Guide",
                items: [
                    {name: "Vendor Terms", link: "/subpage/footer/vendor/terms.html"},
                    {name: "Settlement Guide", link: "/subpage/footer/vendor/settlement.html"},
                    {name: "VAT Regulations", link: "/subpage/footer/vendor/vat.html"},
                    {name: "Advertisement", link: "/subpage/footer/vendor/advertisement.html"},
                ],
            },
        };

        let activeGroup = Object.keys(groups).find((key) => path.startsWith(key));
        if (!activeGroup) return;

        let {title, items} = groups[activeGroup];

        if (breadcrumbEl) breadcrumbEl.textContent = title;

        // 현재 페이지명 자동 타이틀
        if (titleEl) {
            const file = path.split("/").pop();
            const match = items.find((m) => m.link.endsWith(file));
            titleEl.textContent = match ? match.name : title;
        }

        if (subNavInner) {
            subNavInner.innerHTML = items
            .map((m) => `<a href="${m.link}" class="sub-nav__item ${m.link === path ? "is-active" : ""}">${m.name}</a>`)
            .join("");
        }
    }

    /* ==================================================
        util - 메뉴 검색 & breadcrumb 생성
    ================================================== */
    function findMenuByLink(path) {
        return (
            menuData.find((m) => m.depth === 3 && m.link === path) ||
            menuData.find((m) => m.depth === 3 && path.includes(m.link.replace(".html", ""))) ||
            null
        );
    }

    function makeBreadcrumb(node) {
        let chain = [node.name];
        while (node.parent_id) {
            node = menuData.find((m) => m.id === node.parent_id);
            if (node) chain.unshift(node.name);
        }
        return chain.join(" > ");
    }
})();
