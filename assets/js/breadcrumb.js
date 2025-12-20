/*
======================================================
SEJONGO Subpage Navigation FINAL CLEAN VERSION
- breadcrumb / title / subnav 통합
- board / gallery 배너 정상 출력
- footer 분기 완전 분리
- is-active 안정화
======================================================
*/

(function () {
    let menuData = null;
    let initialized = false;

    /* =========================
       메뉴 데이터 수신
    ========================= */
    window.addEventListener("menuDataLoaded", (e) => {
        menuData = e.detail || [];
        init();
    });

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            if (!menuData && window.menuDataGlobal) {
                menuData = window.menuDataGlobal;
                init();
            }
        }, 300);
    });

    async function init() {
        if (initialized || !menuData) return;
        initialized = true;

        const path = normalizePath(location.pathname);
        const url = new URL(location.href);

        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const labelEl = document.querySelector(".sub-hero__label");
        const subNavInner = document.querySelector(".sub-nav__inner");

        /* =========================
           FOOTER PAGE
        ========================= */
        if (path.startsWith("/subpage/footer/")) {
            buildFooter(path, labelEl, titleEl, subNavInner);
            if (breadcrumbEl) breadcrumbEl.textContent = "";
            return;
        }

        /* =========================
           일반 메뉴 탐색
        ========================= */
        let current = findMenuByPath(path);

        /* =========================
           BOARD
        ========================= */
        if (path.includes("/skin/board/")) {
            const id = url.searchParams.get("id");
            current = menuData.find((m) => m.type === "board" && m.link.includes(`id=${id}`)) || current;

            if (titleEl && id) {
                try {
                    const {data} = await supabaseClient
                    .from("board_list")
                    .select("title")
                    .eq("board_id", Number(id))
                    .maybeSingle();
                    if (data?.title) titleEl.textContent = data.title;
                } catch {}
            }
        }

        /* =========================
           GALLERY
        ========================= */
        if (path.includes("/skin/gallery/")) {
            const id = url.searchParams.get("id");
            current = menuData.find((m) => m.type === "gallery" && m.link.includes(`id=${id}`)) || current;

            if (titleEl && id) {
                try {
                    const {data} = await supabaseClient
                    .from("gallery_list")
                    .select("title")
                    .eq("gallery_id", Number(id))
                    .maybeSingle();
                    if (data?.title) titleEl.textContent = data.title;
                } catch {}
            }
        }

        if (!current) return;

        /* =========================
           Breadcrumb
        ========================= */
        if (breadcrumbEl) {
            breadcrumbEl.textContent = makeBreadcrumb(current);
        }

        /* =========================
           Title
        ========================= */
        if (titleEl && !path.includes("/skin/")) {
            titleEl.textContent = current.name;
        }

        /* =========================
           Sub Navigation
        ========================= */
        if (subNavInner) {
            const siblings = menuData.filter((m) => m.parent_id === current.parent_id && m.depth === current.depth);

            subNavInner.innerHTML = siblings
            .map((m) => {
                const active =
                    normalizePath(m.link) === path || path.startsWith(normalizePath(m.link)) ? "is-active" : "";
                return `<a href="${m.link}" class="sub-nav__item ${active}">${m.name}</a>`;
            })
            .join("");
        }
    }

    /* =========================
       FOOTER BUILDER
    ========================= */
    function buildFooter(path, labelEl, titleEl, navEl) {
        const map = {
            "/subpage/footer/legal_information/": {
                title: "Legal Information",
                list: [
                    ["Legal Info", "legal-info.html"],
                    ["Legal Notice", "legal-notice.html"],
                    ["Privacy Policy", "privacy-policy.html"],
                ],
            },
            "/subpage/footer/policies/": {
                title: "Policies",
                list: [
                    ["Refund Policy", "refund.html"],
                    ["Shipping Policy", "shipping.html"],
                ],
            },
            "/subpage/footer/vendor/": {
                title: "Vendor Guide",
                list: [
                    ["Vendor Terms", "terms.html"],
                    ["Settlement Guide", "settlement.html"],
                    ["VAT Regulations", "vat.html"],
                    ["Advertisement", "advertisement.html"],
                ],
            },
        };

        const key = Object.keys(map).find((k) => path.startsWith(k));
        if (!key) return;

        const {title, list} = map[key];
        const file = path.split("/").pop();

        if (labelEl) labelEl.textContent = title;

        const matched = list.find(([, f]) => f === file);
        if (titleEl) {
            titleEl.textContent = matched ? matched[0] : file.replace(".html", "").replace(/-/g, " ");
        }

        if (navEl) {
            navEl.innerHTML = list
            .map(([name, fileName]) => {
                const link = key + fileName;
                const active = normalizePath(link) === normalizePath(path) ? "is-active" : "";
                return `<a href="${link}" class="sub-nav__item ${active}">${name}</a>`;
            })
            .join("");
        }
    }

    /* =========================
       UTIL
    ========================= */
    function normalizePath(p) {
        return p.replace(/\/$/, "").replace(".html", "");
    }

    function findMenuByPath(path) {
        return (
            menuData.find((m) => normalizePath(m.link) === path) ||
            menuData.find((m) => path.startsWith(normalizePath(m.link)))
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
