/*
======================================================
SEJONGO Breadcrumb & Subpage Navigation Final Version
- Header 메뉴 데이터 기반 자동 breadcrumb / title / subnav
- board, gallery 지원(id 기반 매칭)
- footer 전용 네비 분리
======================================================
*/

(function () {
    let menu = null;
    let ready = false;

    /* =========================
       menuDataLoaded 수신 (핵심)
    ========================= */
    window.addEventListener("menuDataLoaded", (e) => {
        menu = e.detail;
        ready = true;
        build();
    });

    /* =========================
       이벤트 놓쳤을 경우 대비 fallback
    ========================= */
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            if (!ready && window.menuDataGlobal) {
                menu = window.menuDataGlobal;
                ready = true;
                build();
            }
        }, 400);
    });

    /* ============================================
       MAIN 실행
    ============================================ */
    async function build() {
        if (!menu) return;

        const path = location.pathname;
        const url = new URL(location.href);

        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        /* =====================
           Footer Pages 전용 처리
        ===================== */
        if (path.startsWith("/subpage/footer/")) {
            return buildFooter(path, breadcrumbEl, titleEl, subNavInner);
        }

        let current = findMenu(path) || findLoose(path);

        /* =====================
           Board
        ===================== */
        if (path.includes("/skin/board/")) {
            const id = url.searchParams.get("id");
            current = menu.find((m) => m.type === "board" && m.link.includes(`id=${id}`)) || current;

            if (titleEl && id) {
                try {
                    const {data} = await supabaseClient
                    .from("board_list")
                    .select("title")
                    .eq("board_id", Number(id))
                    .maybeSingle();
                    if (data?.title) titleEl.textContent = data.title;
                } catch (e) {}
            }
        } /* =====================
           Gallery
        ===================== */ else if (path.includes("/skin/gallery/")) {
            const id = url.searchParams.get("id");
            current = menu.find((m) => m.type === "gallery" && m.link.includes(`id=${id}`)) || current;

            if (titleEl && id) {
                try {
                    const {data} = await supabaseClient
                    .from("gallery_list")
                    .select("title")
                    .eq("gallery_id", Number(id))
                    .maybeSingle();
                    if (data?.title) titleEl.textContent = data.title;
                } catch (e) {}
            }
        }
    }
})();

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
            if (!isMenuLoaded) init(); // fallback
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
            const siblings = menuData.filter((m) => m.parent_id === current.parent_id && m.depth === 3);

            subNavInner.innerHTML = siblings
            .map((m) => `<a href="${m.link}" class="sub-nav__item ${m.link === path ? "is-active" : ""}">${m.name}</a>`)
            .join("");
        }
    }

    /* ==================================================
   Footer Pages 처리 (Vendor / Policies / Legal)
   파일명 → Title 자동 변환
==================================================*/
    document.addEventListener("DOMContentLoaded", () => {
        const path = location.pathname;

        const subHeroLabel = document.querySelector(".sub-hero__label");
        const subHeroTitle = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        buildFooterMenu(path, subHeroLabel, subHeroTitle, subNavInner);
    });

    function buildFooterMenu(path, labelEl, titleEl, navEl) {
        const map = {
            "/subpage/footer/legal_information/": {
                title: "Legal Information",
                list: [
                    ["Legal Info", "/subpage/footer/legal_information/legal-info.html"],
                    ["Legal Notice", "/subpage/footer/legal_information/legal-notice.html"],
                    ["Privacy Policy", "/subpage/footer/legal_information/privacy-policy.html"],
                ],
            },
            "/subpage/footer/policies/": {
                title: "Policies",
                list: [
                    ["Refund Policy", "/subpage/footer/policies/refund.html"],
                    ["Shipping Policy", "/subpage/footer/policies/shipping.html"],
                ],
            },
            "/subpage/footer/vendor/": {
                title: "Vendor Guide",
                list: [
                    ["Vendor Terms", "/subpage/footer/vendor/terms.html"],
                    ["Settlement Guide", "/subpage/footer/vendor/settlement.html"],
                    ["VAT Regulations", "/subpage/footer/vendor/vat.html"],
                    ["Advertisement", "/subpage/footer/vendor/advertisement.html"],
                ],
            },
        };

        const key = Object.keys(map).find((k) => path.startsWith(k));
        if (!key) return;

        const {title, list} = map[key];

        /* 1. 그룹명 → sub-hero__label */
        if (labelEl) {
            labelEl.textContent = title;
        }

        /* 2. 현재 페이지 제목 */
        const file = path.split("/").pop().replace(".html", "");
        let autoTitle = file.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        const matched = list.find(([, link]) => link.endsWith(file + ".html"));
        if (titleEl) {
            titleEl.textContent = matched ? matched[0] : autoTitle;
        }

        /* 3. Footer 서브 네비 생성 */
        if (navEl) {
            navEl.innerHTML = list
            .map(([name, link]) => {
                const active = link === path ? "is-active" : "";
                return `<a href="${link}" class="sub-nav__item ${active}">${name}</a>`;
            })
            .join("");
        }
    }
    /* ==================================================
       DB 메뉴 검색 util
    ==================================================*/
    function findMenu(path) {
        return (
            menuData.find((m) => m.link === path) || menuData.find((m) => path.includes(m.link.replace(".html", "")))
        );
    }

    function makeBreadcrumb(node) {
        const stack = [node.name];
        while (node.parent_id) {
            node = menuData.find((m) => m.id === node.parent_id);
            if (node) stack.unshift(node.name);
        }
        return stack.join(" > ");
    }
})();
