/*
======================================================
Breadcrumb & Subpage Navigation (최종 안정버전)
======================================================
*/

(function () {
    let menuData = null;
    let isMenuLoaded = false;

    /* =========================
       header-menu.js에서 데이터 수신
    ========================= */
    window.addEventListener("menuDataLoaded", (e) => {
        menuData = e.detail;
        isMenuLoaded = true;
        init(); // 메뉴 로딩 후 실행
    });

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            if (!isMenuLoaded) init();  // fallback
        }, 200); 
    });

    /* =========================
       메인 실행
    ========================= */
    function init() {
        const path = location.pathname;
        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        /* =======================
           Footer pages 처리
        =======================*/
        if (path.startsWith("/subpage/footer/")) {
            buildFooterMenu(path, breadcrumbEl, titleEl, subNavInner);
            return; // DB 메뉴 탐색 중지 → 경고 없음
        }

        /* =======================
           일반 Subpage 처리
        =======================*/
        if (!menuData) return; // 로딩 안됐으면 그냥 종료 (경고 없음)

        const current = findMenu(path);

        if (breadcrumbEl) breadcrumbEl.textContent = current ? makeBreadcrumb(current) : "";
        if (titleEl && current) titleEl.textContent = current.name;

        if (subNavInner && current) {
            const siblings = menuData.filter(m => m.parent_id === current.parent_id && m.depth === 3);

            subNavInner.innerHTML = siblings.map(m =>
                `<a href="${m.link}" class="sub-nav__item ${m.link === path ? "is-active" : ""}">${m.name}</a>`
            ).join("");
        }
    }

/* ==================================================
   Footer Pages 처리 (Vendor / Policies / Legal)
   파일명 → Title 자동 변환
==================================================*/
function buildFooterMenu(path, breadcrumbEl, titleEl, subNavInner) {
    const map = {
        "/subpage/footer/legal_information/": {
            title: "Legal Information",
            list: [
                ["Legal Info", "/subpage/footer/legal_information/legal-info.html"],
                ["Legal Notice", "/subpage/footer/legal_information/legal-notice.html"],
                ["Privacy Policy", "/subpage/footer/legal_information/privacy-policy.html"],
            ]
        },
        "/subpage/footer/policies/": {
            title: "Policies",
            list: [
                ["Refund Policy", "/subpage/footer/policies/refund.html"],
                ["Shipping Policy", "/subpage/footer/policies/shipping.html"],
            ]
        },
        "/subpage/footer/vendor/": {
            title: "Vendor Guide",
            list: [
                ["Vendor Terms", "/subpage/footer/vendor/terms.html"],
                ["Settlement Guide", "/subpage/footer/vendor/settlement.html"],
                ["VAT Regulations", "/subpage/footer/vendor/vat.html"],
                ["Advertisement", "/subpage/footer/vendor/advertisement.html"],
            ]
        }
    };

    const key = Object.keys(map).find(x => path.startsWith(x));
    if (!key) return;

    const { title, list } = map[key];

    /* breadcrumb → 그룹 이름만 표시 */
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    /* 파일명 → 타이틀 자동 변환 */
    const file = path.split("/").pop().replace(".html", "");
    let autoTitle = file.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    // ex) legal-notice → Legal Notice

    // 데이터 목록에 존재하면 이름으로, 없으면 자동 생성명 사용
    const matched = list.find(([name, link]) => link.endsWith(file + ".html"));
    if (titleEl) titleEl.textContent = matched ? matched[0] : autoTitle;

    /* Footer 네비게이션 생성 */
    if (subNavInner) {
        subNavInner.innerHTML = list.map(([name, link]) =>
            `<a href="${link}" class="sub-nav__item ${link === path ? "is-active" : ""}">${name}</a>`
        ).join("");
    }
}


    /* ==================================================
       DB 메뉴 검색 util
    ==================================================*/
    function findMenu(path) {
        return menuData.find(m => m.link === path)
            || menuData.find(m => path.includes(m.link.replace(".html","")));
    }

    function makeBreadcrumb(node) {
        const stack = [node.name];
        while(node.parent_id) {
            node = menuData.find(m => m.id === node.parent_id);
            if (node) stack.unshift(node.name);
        }
        return stack.join(" > ");
    }
})();

