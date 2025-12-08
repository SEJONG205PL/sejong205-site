/*
======================================================
Breadcrumb & Sub-page Info
- header-menu.js의 캐시 재사용
- 중복 쿼리 제거
======================================================
*/

(function () {
    let menuData = null;

    // header-menu.js에서 데이터 받기
    window.addEventListener("menuDataLoaded", (e) => {
        menuData = e.detail;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }
    });

    // 혹시 이미 로드되었다면
    if (document.readyState !== "loading") {
        waitForMenuData();
    }

    async function waitForMenuData() {
        // header-menu.js의 캐시 확인
        if (window.debugMenu && window.debugMenu.getCache()) {
            menuData = window.debugMenu.getCache();
            init();
            return;
        }

        // 최대 1초 대기
        let attempts = 0;
        const check = () => {
            if (window.debugMenu && window.debugMenu.getCache()) {
                menuData = window.debugMenu.getCache();
                init();
            } else if (attempts < 10) {
                attempts++;
                setTimeout(check, 100);
            } else {
                console.warn("⚠️ 메뉴 데이터를 가져올 수 없음");
            }
        };
        check();
    }

    async function init() {
        const supa = window.supabaseClient;
        if (!supa) {
            console.warn("⚠️ Supabase 클라이언트 없음");
            return;
        }

        const breadcrumbEl = document.getElementById("breadcrumb");
        const titleEl = document.querySelector(".sub-hero__title");
        const subNavInner = document.querySelector(".sub-nav__inner");

        if (!menuData) {
            console.warn("⚠️ 메뉴 데이터 없음");
            return;
        }

        const url = new URL(location.href);
        const pathname = url.pathname;
        let currentMenu = null;

        // ---------- 게시판 ----------
        if (pathname.includes("/skin/board/")) {
            const boardId = url.searchParams.get("id");
            currentMenu = menuData.find((m) => m.type === "board" && m.link && m.link.includes(`id=${boardId}`));

            const {data: boardInfo} = await supa
            .from("board_list")
            .select("title")
            .eq("board_id", Number(boardId))
            .maybeSingle();

            if (boardInfo && titleEl) {
                titleEl.textContent = boardInfo.title;
            }
        }
        // ---------- 갤러리 ----------
        else if (pathname.includes("/skin/gallery/")) {
            const gid = url.searchParams.get("id");
            currentMenu = menuData.find((m) => m.type === "gallery" && m.link && m.link.includes(`id=${gid}`));

            const {data: galleryInfo} = await supa
            .from("gallery_list")
            .select("title")
            .eq("gallery_id", Number(gid))
            .maybeSingle();

            if (galleryInfo && titleEl) {
                titleEl.textContent = galleryInfo.title;
            }
        }
       // ---------- 일반 subpage ----------
else if (pathname.startsWith("/subpage/")) {
    // 1) depth3 중 URL이 존재하는 항목에서 매칭
    currentMenu = menuData.find((m) => m.depth === 3 && m.link && m.link === pathname);

    // 2) 확장자/경로 차이 허용 (fallback)
    if (!currentMenu) {
        currentMenu = menuData.find((m) => m.depth === 3 && pathname.includes(m.link.replace(/\.html$/, "")));
    }

    // 3) 파일명 기반 fallback
    if (!currentMenu) {
        const key = pathname.split("/").pop().replace(".html", "");
        currentMenu = menuData.find((m) => m.depth === 3 && m.name.toLowerCase().includes(key.toLowerCase()));
    }

    if (currentMenu && titleEl) titleEl.textContent = currentMenu.name;
}


/* ======================================================
📌 여기 아래 "Footer 개별 네비" 추가
====================================================== */

// Footer - legal_information
if (pathname.startsWith("/subpage/footer/legal_information/")) {
    createFooterMenu("Legal Information", [
        {name:"Legal Info", link:"/subpage/footer/legal_information/legal-info.html"},
        {name:"Legal Notice", link:"/subpage/footer/legal_information/legal-notice.html"},
        {name:"Privacy Policy", link:"/subpage/footer/legal_information/privacy-policy.html"},
    ]);
    return;
}

// Footer - policies
if (pathname.startsWith("/subpage/footer/policies/")) {
    createFooterMenu("Policies", [
        {name:"Refund Policy", link:"/subpage/footer/policies/refund.html"},
        {name:"Shipping Policy", link:"/subpage/footer/policies/shipping.html"},
    ]);
    return;
}

// Footer - vendor
if (pathname.startsWith("/subpage/footer/vendor/")) {
    createFooterMenu("Vendor Guide", [
        {name:"Vendor Terms", link:"/subpage/footer/vendor/terms.html"},
        {name:"Settlement Guide", link:"/subpage/footer/vendor/settlement.html"},
        {name:"VAT Regulations", link:"/subpage/footer/vendor/vat.html"},
        {name:"Advertisement", link:"/subpage/footer/vendor/advertisement.html"},
    ]);
    return;
}


/* ===== footer 공용 함수 ===== */
function createFooterMenu(title, menuList) {
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    if (titleEl) {
        const file = location.pathname.split("/").pop();
        const match = menuList.find(m => m.link.endsWith(file));
        titleEl.textContent = match ? match.name : title;
    }

    if (subNavInner) {
        subNavInner.innerHTML = menuList.map(m =>
            `<a href="${m.link}" class="sub-nav__item ${m.link===location.pathname ? 'is-active':''}">
                ${m.name}
            </a>`
        ).join("");
    }
}


        // ---------- breadcrumb ----------
        if (breadcrumbEl) {
            if (currentMenu) {
                const stack = [];
                let node = currentMenu;
                while (node) {
                    stack.unshift(node.name);
                    node = menuData.find((m) => m.id === node.parent_id);
                }
                breadcrumbEl.textContent = stack.join(" > ");
            } else {
                breadcrumbEl.textContent = ""; // 혹은 fallback 문구 가능
            }
        }

        // ---------- Sub Navigation (소메뉴만) ----------
        if (subNavInner) {
            subNavInner.innerHTML = "";

            if (currentMenu) {
                const siblings = menuData.filter((m) => m.parent_id === currentMenu.parent_id && m.depth === 3);

                siblings.forEach((item) => {
                    const el = document.createElement("a");
                    el.href = item.link || "#";
                    el.textContent = item.name;
                    el.className = "sub-nav__item" + (item.id === currentMenu.id ? " is-active" : "");
                    subNavInner.appendChild(el);
                });
            }
        }
    }
})();



