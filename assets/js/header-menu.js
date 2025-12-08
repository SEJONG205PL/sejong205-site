/*
======================================================
SEJONG205 — Header Menu OPTIMIZED BUILD
- include.js의 includeLoaded 이벤트 대기
- Supabase 준비 후 즉시 렌더링
- 중복 DB 쿼리 방지
======================================================
*/

let menuCache = null;
let loadPromise = null;

/* includeLoaded 이벤트 대기 */
document.addEventListener("includeLoaded", () => {
    console.log("📥 Include 완료, 메뉴 로드 시작");
    loadMenus();
});

/* 백업: DOM이 이미 준비된 경우 */
if (document.readyState !== "loading") {
    setTimeout(() => {
        if (document.getElementById("pcMenu") && !menuCache) {
            console.log("🔄 백업 로드 실행");
            loadMenus();
        }
    }, 200);
}

/* --------------------------------------------------
메뉴 로드
-------------------------------------------------- */
async function loadMenus() {
    // 중복 실행 방지
    if (loadPromise) return loadPromise;
    if (menuCache) {
        renderMenus(menuCache);
        return Promise.resolve();
    }

    loadPromise = (async () => {
        try {
            // 1️⃣ DOM 요소 확인
            const pcMenu = document.getElementById("pcMenu");
            const megaContainer = document.getElementById("megaContainer");
            const mobileMenu = document.getElementById("mobileMenu");

            if (!pcMenu || !megaContainer || !mobileMenu) {
                console.warn("⚠️ 메뉴 DOM 요소 없음, 재시도...");
                await new Promise((resolve) => setTimeout(resolve, 100));
                loadPromise = null;
                return loadMenus();
            }

            // 2️⃣ Supabase 대기
            if (!window.supabaseClient) {
                console.log("⏳ Supabase 대기 중...");
                await waitForSupabase();
            }

            // 3️⃣ DB 쿼리
            console.log("📡 메뉴 데이터 로딩...");
            const {data, error} = await window.supabaseClient
            .from("menu_items")
            .select("*")
            .order("order_num", {ascending: true});

            if (error) throw error;

            menuCache = data;

            // 4️⃣ 다른 스크립트에서 사용 가능하도록 이벤트 발생
            window.dispatchEvent(new CustomEvent("menuDataLoaded", {detail: data}));

            // 5️⃣ 렌더링
            renderMenus(data);
        } catch (e) {
            console.error("❌ Menu load error:", e);
            await new Promise((resolve) => setTimeout(resolve, 300));
            loadPromise = null;
            return loadMenus();
        }
    })();

    return loadPromise;
}

/* --------------------------------------------------
Supabase 대기
-------------------------------------------------- */
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 3초

        const check = () => {
            if (window.supabaseClient) {
                console.log("✅ Supabase 준비 완료");
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error("Supabase 로드 타임아웃"));
            } else {
                attempts++;
                setTimeout(check, 100);
            }
        };
        check();
    });
}

/* --------------------------------------------------
메뉴 렌더링
-------------------------------------------------- */
function renderMenus(data) {
    const depth1 = data.filter((m) => m.depth === 1);
    const depth2 = data.filter((m) => m.depth === 2);
    const depth3 = data.filter((m) => m.depth === 3);

    console.log(`🎨 메뉴 렌더링: D1(${depth1.length}) D2(${depth2.length}) D3(${depth3.length})`);

    /* ===== PC 메뉴 ===== */
    let pcHTML = "";
    let megaHTML = "";

    depth1.forEach((d1) => {
        // 대메뉴 생성
        pcHTML += `<div class="nav-item"><a class="nav-link" data-mega="mega-${d1.id}">${d1.name}</a></div>`;

        // 중메뉴 찾기
        const c2 = depth2.filter((d2) => d2.parent_id === d1.id);

        if (c2.length > 0) {
            megaHTML += `<div id="mega-${d1.id}" class="mega-menu"><div class="mega-inner width">`;

            c2.forEach((d2) => {
                // 소메뉴 찾기
                const c3 = depth3.filter((d3) => d3.parent_id === d2.id);
                megaHTML += `<div class="mega-col"><h3>${d2.name}</h3><ul>`;

                if (c3.length > 0) {
                    // 소메뉴 있음
                    c3.forEach((d3) => {
                        megaHTML += `<li><a href="${d3.link || "#"}" target="${d3.target || "_self"}">${
                            d3.name
                        }</a></li>`;
                    });
                } else {
                    // 소메뉴 없음 - 중메뉴 자체를 링크로
                    megaHTML += `<li><a href="${d2.link || "#"}" target="${d2.target || "_self"}">${d2.name}</a></li>`;
                }

                megaHTML += `</ul></div>`;
            });

            megaHTML += `</div></div>`;
        } else {
            // 하위 메뉴 없음
            megaHTML += `<div id="mega-${d1.id}" class="mega-menu" style="display:none;"></div>`;
        }
    });

    document.getElementById("pcMenu").innerHTML = pcHTML;
    document.getElementById("megaContainer").innerHTML = megaHTML;

    /* ===== 모바일 메뉴 ===== */
    let mobileHTML = "";

    depth1.forEach((d1) => {
        const c2 = depth2.filter((d2) => d2.parent_id === d1.id);

        if (c2.length > 0) {
            // 하위 메뉴 있음 - 아코디언
            mobileHTML += `
        <li>
            <button class="mobile-accordion">${d1.name}<span class="arrow">▼</span></button>
            <div class="mobile-sub">`;

            c2.forEach((d2) => {
                const c3 = depth3.filter((d3) => d3.parent_id === d2.id);

                if (c3.length > 0) {
                    // 2depth 아코디언
                    mobileHTML += `
                <button class="mobile-accordion-lv2">${d2.name}<span class="arrow">▼</span></button>
                <div class="mobile-sub-lv2">`;

                    c3.forEach((d3) => {
                        mobileHTML += `
                    <a href="${d3.link || "#"}" target="${d3.target || "_self"}">${d3.name}</a>`;
                    });

                    mobileHTML += `
                </div>`;
                } else {
                    // 소메뉴 없음 - 중메뉴 자체를 링크로
                    mobileHTML += `
                <a href="${d2.link || "#"}" target="${d2.target || "_self"}" class="mobile-sub-item">${d2.name}</a>`;
                }
            });

            mobileHTML += `
            </div>
        </li>`;
        } else {
            // 하위 메뉴 없음 - 바로 링크
            mobileHTML += `
        <li>
            <a href="${d1.link || "#"}" target="${d1.target || "_self"}" class="mobile-menu-item">${d1.name}</a>
        </li>`;
        }
    });

    document.getElementById("mobileMenu").innerHTML = mobileHTML;

    // 렌더링 완료 이벤트
    document.dispatchEvent(new Event("menusReady"));
    loadPromise = null;

    console.log("✅ 메뉴 렌더링 완료");
}

/* --------------------------------------------------
디버깅 함수
-------------------------------------------------- */
window.debugMenu = {
    // 캐시된 메뉴 데이터 확인
    getCache: () => {
        if (!menuCache) {
            console.warn("⚠️ 캐시된 메뉴 데이터 없음");
            return null;
        }
        console.table(menuCache);
        return menuCache;
    },

    // 메뉴 강제 리로드
    reload: () => {
        console.log("🔄 메뉴 강제 리로드");
        menuCache = null;
        loadPromise = null;
        loadMenus();
    },

    // DOM 상태 체크
    checkDOM: () => {
        console.log("🔍 DOM 체크:");
        console.log("- pcMenu:", !!document.getElementById("pcMenu"));
        console.log("- megaContainer:", !!document.getElementById("megaContainer"));
        console.log("- mobileMenu:", !!document.getElementById("mobileMenu"));
        console.log("- supabaseClient:", !!window.supabaseClient);
        console.log("- menuCache:", !!menuCache);
    },

    // 메뉴 데이터 분석
    analyze: () => {
        if (!menuCache) {
            console.warn("⚠️ 메뉴 데이터 없음");
            return;
        }

        const depth1 = menuCache.filter((m) => m.depth === 1);
        const depth2 = menuCache.filter((m) => m.depth === 2);
        const depth3 = menuCache.filter((m) => m.depth === 3);

        console.group("📊 메뉴 데이터 분석");
        console.log(`총 ${menuCache.length}개 메뉴`);
        console.log(`- Depth 1: ${depth1.length}개`);
        console.log(`- Depth 2: ${depth2.length}개`);
        console.log(`- Depth 3: ${depth3.length}개`);

        console.log("\n🌳 메뉴 구조:");
        depth1.forEach((d1) => {
            console.log(`${d1.name} (ID: ${d1.id})`);
            const children = depth2.filter((d2) => d2.parent_id === d1.id);
            children.forEach((d2) => {
                console.log(`  └─ ${d2.name} (ID: ${d2.id})`);
                const grandChildren = depth3.filter((d3) => d3.parent_id === d2.id);
                grandChildren.forEach((d3) => {
                    console.log(`      └─ ${d3.name} (ID: ${d3.id})`);
                });
            });
        });
        console.groupEnd();
    },
};

// 콘솔에서 쉽게 사용할 수 있는 단축 함수
window.checkMenu = () => window.debugMenu.checkDOM();
window.reloadMenu = () => window.debugMenu.reload();
window.analyzeMenu = () => window.debugMenu.analyze();
