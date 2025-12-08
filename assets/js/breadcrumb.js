/*
======================================================
Breadcrumb & Sub-page Navigation (FULL FINAL VERSION)
- header-menu.js의 menuData 기반
- depth 제한 제거 → footer/page 포함 전체 정상화
- is-active 자동 매칭 → underline/border 정상 작동
======================================================
*/

(function () {
    let menuData = null;

    /* header-menu.js에서 메뉴 로드 완료 이벤트 수신 */
    window.addEventListener("menuDataLoaded", (e) => {
        menuData = e.detail;
        start();
    });

    /* header-menu.js보다 먼저 실행될 경우 대비 */
    if (document.readyState !== "loading") waitMenuData();
    else document.addEventListener("DOMContentLoaded", waitMenuData);


    async function waitMenuData() {
        if (window.debugMenu && window.debugMenu.getCache()) {
            menuData = window.debugMenu.getCache();
            start();
            return;
        }
        setTimeout(waitMenuData, 120);
    }


    /* 메인 실행 */
    async function start() {
        if (!menuData) return console.warn("⚠ menuData 없음");

        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        const path = location.pathname.replace(/\/$/, ""); // 슬래시 정규화
        let current = null;


        /* ============ 해당 페이지 메뉴 찾기 ============ */
        // 1) DB menu_items.link와 1:1 매칭
        current = menuData.find(m => m.link === path);

        // 2) URL에 파일명 포함 형태 fallback
        if (!current) {
            const key = path.split("/").pop().replace(".html", "");
            current = menuData.find(m => m.link && m.link.includes(key));
        }

        // 3) 그래도 없으면 footer+일반페이지 폴더 자동 매칭(FINAL)
        if (!current) {
            const folder = path.split("/")[2]; // ex) /subpage/company/overview → company
            current = menuData.find(m => m.link && m.link.includes(folder));
        }


        /* ============ PAGE TITLE 적용 ============ */
        if (current && titleEl) titleEl.textContent = current.name;


        /* ============ BREADCRUMB 생성 ============ */
        if (breadcrumbEl) {
            if (!current) { breadcrumbEl.textContent = ""; return; }

            const stack = [];
            let node = current;

            while (node) {
                stack.unshift(node.name);
                node = menuData.find(m => m.id === node.parent_id);
            }
            breadcrumbEl.textContent = stack.join(" > ");
        }


        /* ============ SUB NAVIGATION 생성 (depth 자유) ============ */
        if (subNavInner) {
            subNavInner.innerHTML = "";

            if (!current) return;

            // 동일 parent_id인 형제 메뉴 모두 → (중/소메뉴 구조 유지)
            const siblings = menuData.filter(m => m.parent_id === current.parent_id);

            siblings.forEach(item => {
                const a = document.createElement("a");
                a.href = item.link || "#";
                a.textContent = item.name;
                a.className = "sub-nav__item";

                // ★ 현재 페이지 active 자동 인식(high accuracy)
                if (item.link.replace(/\/$/, "") === path) a.classList.add("is-active");

                subNavInner.appendChild(a);
            });
        }
    }
})();
