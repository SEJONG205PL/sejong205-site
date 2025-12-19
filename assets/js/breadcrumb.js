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

        /* =====================
           일반 SUBPAGE
        ===================== */
        if (current) {
            if (breadcrumbEl) breadcrumbEl.textContent = makeBreadcrumb(current);
            if (titleEl && !titleEl.textContent) titleEl.textContent = current.name;

            if (subNavInner) {
                // 현재 파일명 기준 (overview.html 등)
                const currentFile = window.location.pathname.split("/").pop();

                // 동일 부모 depth=3 메뉴만 출력
                const siblings = menu.filter((m) => m.parent_id === current.parent_id && m.depth === 3);

                subNavInner.innerHTML = siblings
                .map(
                    (m) =>
                        `<a href="${m.link}" class="sub-nav__item ${m.link.includes(currentFile) ? "is-active" : ""}">
                        ${m.name}
                    </a>`
                )
                .join("");
            }
        }
    }

    function buildFooter(path) {
        // DOM 요소 안전하게 가져오기
        const labelEl = document.querySelector(".sub-hero__label");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavEl = document.querySelector(".sub-nav__inner");

        // 필수 요소가 없는 경우 조기 종료
        if (!labelEl || !titleEl || !subNavEl) {
            console.error("Required DOM elements not found");
            return;
        }

        const map = {
            "/subpage/footer/legal_information/": {
                group: "Legal Information",
                list: [
                    ["Legal Info", "/subpage/footer/legal_information/legal-info.html"],
                    ["Legal Notice", "/subpage/footer/legal_information/legal-notice.html"],
                    ["Privacy Policy", "/subpage/footer/legal_information/privacy-policy.html"],
                ],
            },
            "/subpage/footer/policies/": {
                group: "Policies",
                list: [
                    ["Refund Policy", "/subpage/footer/policies/refund.html"],
                    ["Shipping Policy", "/subpage/footer/policies/shipping.html"],
                ],
            },
            "/subpage/footer/vendor/": {
                group: "Vendor Guide",
                list: [
                    ["Vendor Terms", "/subpage/footer/vendor/terms.html"],
                    ["Settlement Guide", "/subpage/footer/vendor/settlement.html"],
                    ["VAT Regulations", "/subpage/footer/vendor/vat.html"],
                    ["Advertisement", "/subpage/footer/vendor/advertisement.html"],
                ],
            },
        };

        // 현재 경로에 해당하는 그룹 찾기
        const key = Object.keys(map).find((k) => path.startsWith(k));

        // 매핑되는 그룹이 없는 경우 기본 처리
        if (!key) {
            labelEl.textContent = "Unknown";
            titleEl.textContent = "Page Not Found";
            subNavEl.innerHTML = "";
            console.warn(`No mapping found for path: ${path}`);
            return;
        }

        const {group, list} = map[key];
        const filename = path.split("/").pop(); // .html 제거하지 않고 원본 그대로 사용

        // Breadcrumb에 그룹명 설정
        labelEl.textContent = group;

        // 페이지 타이틀 설정 (수정됨)
        const matched = list.find(([name, link]) => {
            const linkFilename = link.split("/").pop(); // 여기도 .html 제거하지 않음
            return linkFilename === filename;
        });

        titleEl.textContent = matched ? matched[0] : group; // 매칭 실패 시 그룹명

        // 서브 네비게이션 생성 (innerHTML 사용하여 간소화)
        subNavEl.innerHTML = list
        .map(([name, link]) => {
            const isActive = link === path ? "is-active" : "";
            return `<a href="${link}" class="sub-nav__item ${isActive}">${name}</a>`;
        })
        .join("");

        // 디버깅용 로그
        console.log(`Current path: ${path}`);
        console.log(`Filename: ${filename}`);
        console.log(`Matched:`, matched);
        console.log(`Footer built successfully`);
    }

    /* ===============================
       Utility
    =============================== */
    function findMenu(p) {
        return menu.find((m) => m.link === p);
    }
    function findLoose(p) {
        return menu.find((m) => p.includes(m.link.replace(".html", "")));
    }
    function makeBreadcrumb(node) {
        const stack = [node.name];
        while (node.parent_id) {
            node = menu.find((m) => m.id === node.parent_id);
            if (node) stack.unshift(node.name);
        }
        return stack.join(" > ");
    }
})();
