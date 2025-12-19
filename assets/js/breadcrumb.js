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

    function buildFooter(currentPath) {
        console.log("=== buildFooter Debug ===");

        // ✅ 1. 경로 정규화 (이게 제일 중요)
        const cleanPath = currentPath.split("?")[0].split("#")[0].replace(/\/$/, ""); // trailing slash 제거

        console.log("Clean path:", cleanPath);

        const labelEl = document.querySelector(".sub-hero__label");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavEl = document.querySelector(".sub-nav__inner");

        if (!labelEl || !titleEl || !subNavEl) {
            console.error("❌ DOM 요소 누락");
            return;
        }

        const map = {
            "/subpage/footer/legal_information": {
                group: "Legal Information",
                list: [
                    ["Legal Info", "/subpage/footer/legal_information/legal-info.html"],
                    ["Legal Notice", "/subpage/footer/legal_information/legal-notice.html"],
                    ["Privacy Policy", "/subpage/footer/legal_information/privacy-policy.html"],
                ],
            },
            "/subpage/footer/policies": {
                group: "Policies",
                list: [
                    ["Refund Policy", "/subpage/footer/policies/refund.html"],
                    ["Shipping Policy", "/subpage/footer/policies/shipping.html"],
                ],
            },
            "/subpage/footer/vendor": {
                group: "Vendor Guide",
                list: [
                    ["Vendor Terms", "/subpage/footer/vendor/terms.html"],
                    ["Settlement Guide", "/subpage/footer/vendor/settlement.html"],
                    ["VAT Regulations", "/subpage/footer/vendor/vat.html"],
                    ["Advertisement", "/subpage/footer/vendor/advertisement.html"],
                ],
            },
        };

        // ✅ 2. 그룹 매칭 (단순 + 정확)
        const currentGroup = Object.keys(map).find((groupPath) => cleanPath.startsWith(groupPath));

        console.log("Found group:", currentGroup);

        if (!currentGroup) {
            console.error("❌ NO GROUP MATCH FOUND");
            labelEl.textContent = "Unknown";
            titleEl.textContent = "Page Not Found";
            subNavEl.innerHTML = "";
            return;
        }

        const {group, list} = map[currentGroup];

        // Breadcrumb
        labelEl.textContent = group;

        // ✅ 3. 현재 파일명 안전하게 추출
        const currentFile = cleanPath.split("/").pop();
        console.log("Current file:", currentFile);

        // Title 설정
        const matchedItem = list.find(([, itemPath]) => itemPath.endsWith(currentFile));

        if (matchedItem) {
            titleEl.textContent = matchedItem[0];
        } else {
            titleEl.textContent = group;
        }

        // ✅ 4. 네비게이션 생성 (이동 절대 안 막음)
        subNavEl.innerHTML = list
        .map(([name, link]) => {
            const targetFile = link.split("/").pop();
            const isActive = targetFile === currentFile ? "is-active" : "";
            return `<a href="${link}" class="sub-nav__item ${isActive}">${name}</a>`;
        })
        .join("");
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
