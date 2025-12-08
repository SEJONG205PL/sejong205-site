/* ======================================================
   SEJONGO HEADER-CORE FINAL
   - Header/Footer include
   - Supabase Init
   - Menu Fetch + Render
   - PC/Mobile Nav
   - appReady 이벤트 발행
====================================================== */
console.log("🚀 HEADER-CORE LOADED");

/* ================= 0. CONFIG ================= */
const SUPABASE_URL = "https://kacybdckxdromylxdptz.supabase.co";
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3liZGNreGRyb215bHhkcHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODE3NDcsImV4cCI6MjA3OTc1Nzc0N30.O7aJjNrcCinIprlSdbe0EAK0FQgSmBRBl6PaOTwm1Rg";

let menuCache = null;
let menuPromise = null;

/* ================= 1. INCLUDE (header/footer 자동 로드) ================= */
document.addEventListener("DOMContentLoaded", () => {
    const inc = document.querySelectorAll("[data-include]");
    if (!inc.length) {
        // include 없으면 바로 Supabase → appReady
        initSupabase();
        return;
    }

    let loaded = 0;
    inc.forEach((el) => {
        const url = el.dataset.include;
        fetch(url)
        .then((r) => {
            if (!r.ok) throw new Error("include load failed: " + url);
            return r.text();
        })
        .then((html) => {
            el.innerHTML = html;
            loaded++;
            if (loaded === inc.length) {
                console.log("📥 Include Loaded");
                document.dispatchEvent(new Event("includeLoaded"));
                initSupabase();
            }
        })
        .catch((err) => {
            console.error(err);
            loaded++;
            if (loaded === inc.length) {
                document.dispatchEvent(new Event("includeLoaded"));
                initSupabase();
            }
        });
    });
});

/* ================= 2. SUPABASE INIT ================= */
function initSupabase() {
    if (window.supabaseClient) {
        console.log("ℹ️ Supabase already exists");
        afterSupabaseReady();
        return;
    }

    if (typeof supabase === "undefined") {
        console.warn("⚠️ Supabase library not found");
        afterSupabaseReady();
        return;
    }

    try {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabase = window.supabaseClient;
        window.supabaseReady = true;
        console.log("🟢 Supabase Ready");
        document.dispatchEvent(new Event("supabaseReady"));
        afterSupabaseReady();
    } catch (e) {
        console.error("❌ Supabase Init Error", e);
        afterSupabaseReady();
    }
}

/* Supabase 준비 후 메뉴 여부에 따라 처리 */
function afterSupabaseReady() {
    const hasMenuDom = document.getElementById("pcMenu") && document.getElementById("mobileMenu");

    if (hasMenuDom && window.supabaseClient) {
        loadMenus();
    } else {
        // 메뉴가 없거나 Supabase가 없어도 appReady는 반드시 쏜다
        console.log("ℹ️ No menu DOM or Supabase, firing menusReady/appReady directly");
        document.dispatchEvent(new Event("menusReady"));
        setTimeout(() => {
            document.dispatchEvent(new Event("appReady"));
            console.log("🔥 APP READY (no menu)");
        }, 0);
    }
}

/* ================= 3. MENU LOAD FROM DB ================= */
async function loadMenus() {
    if (!window.supabaseClient) {
        console.warn("⚠️ Supabase client missing, skip menu load");
        document.dispatchEvent(new Event("menusReady"));
        setTimeout(() => {
            document.dispatchEvent(new Event("appReady"));
            console.log("🔥 APP READY (no supabase menu)");
        }, 0);
        return;
    }

    if (menuPromise) return menuPromise;
    if (menuCache) {
        renderMenus(menuCache);
        return;
    }

    await waitHeaderNodes();

    menuPromise = (async () => {
        try {
            console.log("📡 Fetching menu_items...");
            let {data, error} = await supabaseClient
            .from("menu_items")
            .select("*")
            .order("order_num", {ascending: true});

            if (error) {
                console.error("❌ menu_items fetch error:", error);
                document.dispatchEvent(new Event("menusReady"));
                setTimeout(() => {
                    document.dispatchEvent(new Event("appReady"));
                    console.log("🔥 APP READY (menu error)");
                }, 0);
                return;
            }

            menuCache = data || [];
            renderMenus(menuCache);
        } catch (e) {
            console.error("❌ loadMenus fatal:", e);
            document.dispatchEvent(new Event("menusReady"));
            setTimeout(() => {
                document.dispatchEvent(new Event("appReady"));
                console.log("🔥 APP READY (menu fatal)");
            }, 0);
        }
    })();

    return menuPromise;
}

/* Header DOM 존재할 때까지 대기 */
function waitHeaderNodes() {
    return new Promise((res) => {
        const fn = () => {
            if (document.getElementById("pcMenu") && document.getElementById("mobileMenu")) {
                res();
            } else {
                setTimeout(fn, 80);
            }
        };
        fn();
    });
}

/* ================= 4. RENDER MENUS ================= */
function renderMenus(data) {
    const pcMenu = document.getElementById("pcMenu");
    const megaContainer = document.getElementById("megaContainer");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!pcMenu || !megaContainer || !mobileMenu) {
        console.warn("⚠️ Menu DOM missing, skip render");
        document.dispatchEvent(new Event("menusReady"));
        setTimeout(() => {
            document.dispatchEvent(new Event("appReady"));
            console.log("🔥 APP READY (no menu dom)");
        }, 0);
        return;
    }

    const d1 = data.filter((v) => v.depth === 1);
    const d2 = data.filter((v) => v.depth === 2);
    const d3 = data.filter((v) => v.depth === 3);

    /* PC NAV */
    let pcHtml = "";
    let megaHtml = "";

    d1.forEach((m) => {
        pcHtml += `<div class="nav-item"><a class="nav-link" data-mega="m${m.id}">${m.name}</a></div>`;
        const child2 = d2.filter((s) => s.parent_id === m.id);

        if (child2.length) {
            megaHtml += `<div id="m${m.id}" class="mega-menu"><div class="mega-inner width">`;
            child2.forEach((s) => {
                const child3 = d3.filter((t) => t.parent_id === s.id);
                megaHtml += `<div class="mega-col"><h3>${s.name}</h3><ul>`;
                if (child3.length) {
                    child3.forEach((v) => {
                        megaHtml += `<li><a href="${v.link || "#"}" target="${v.target || "_self"}">${v.name}</a></li>`;
                    });
                } else {
                    megaHtml += `<li><a href="${s.link || "#"}" target="${s.target || "_self"}">${s.name}</a></li>`;
                }
                megaHtml += `</ul></div>`;
            });
            megaHtml += `</div></div>`;
        } else {
            megaHtml += `<div id="m${m.id}" class="mega-menu none"></div>`;
        }
    });

    pcMenu.innerHTML = pcHtml;
    megaContainer.innerHTML = megaHtml;

    /* MOBILE NAV */
    let mbHtml = "";
    d1.forEach((m) => {
        const c2 = d2.filter((s) => s.parent_id === m.id);
        if (!c2.length) {
            mbHtml += `<li><a href="${m.link || "#"}" target="${m.target || "_self"}">${m.name}</a></li>`;
            return;
        }

        mbHtml += `
        <li>
            <button class="mobile-accordion">${m.name}<span>▼</span></button>
            <div class="mobile-sub">`;

        c2.forEach((s) => {
            const c3 = d3.filter((v) => v.parent_id === s.id);
            if (c3.length) {
                mbHtml += `
                <button class="mobile-accordion-lv2">${s.name}<span>▼</span></button>
                <div class="mobile-sub-lv2">`;
                c3.forEach((v) => {
                    mbHtml += `<a href="${v.link || "#"}" target="${v.target || "_self"}">${v.name}</a>`;
                });
                mbHtml += `</div>`;
            } else {
                mbHtml += `<a class="mobile-sub-item" href="${s.link || "#"}" target="${s.target || "_self"}">${
                    s.name
                }</a>`;
            }
        });

        mbHtml += `</div></li>`;
    });

    mobileMenu.innerHTML = mbHtml;

    document.querySelectorAll("header.main-header.pc").forEach((h) => h.classList.add("ready"));

    document.dispatchEvent(new Event("menusReady"));
    initPCMenu();
    initMobileMenu();

    setTimeout(() => {
        document.dispatchEvent(new Event("appReady"));
        console.log("🔥 APP READY (menu rendered)");
    }, 0);

    console.log("🎉 MENU RENDER COMPLETE");
}

/* ================= 5. PC HOVER ================= */
function initPCMenu() {
    const header = document.querySelector(".main-header.pc");
    const links = document.querySelectorAll(".nav-link[data-mega]");
    const megas = document.querySelectorAll(".mega-menu");

    if (!header || !links.length) {
        setTimeout(initPCMenu, 150);
        return;
    }

    let active = null;

    const closeAll = () => {
        megas.forEach((m) => m.classList.remove("open"));
        links.forEach((l) => l.classList.remove("active"));
        active = null;
    };

    links.forEach((link) => {
        link.addEventListener("mouseenter", () => {
            if (window.innerWidth < 960) return;
            closeAll();
            const m = document.getElementById(link.dataset.mega);
            if (m) {
                m.classList.add("open");
                link.classList.add("active");
                active = link;
            }
        });
    });

    megas.forEach((menu) => {
        menu.addEventListener("mouseenter", () => {
            if (active) active.classList.add("active");
        });
    });

    header.addEventListener("mouseleave", () => {
        if (window.innerWidth < 960) return;
        closeAll();
    });

    console.log("✔ PC mega menu initialized");
}

/* ================= 6. MOBILE NAV ================= */
function initMobileMenu() {
    const toggle = document.querySelector(".mobile-nav-toggle");
    const nav = document.querySelector(".mobile-nav");

    if (!toggle || !nav) {
        setTimeout(initMobileMenu, 150);
        return;
    }

    toggle.addEventListener("click", () => {
        nav.classList.toggle("open");
        toggle.classList.toggle("active");
        document.body.classList.toggle("mobile-menu-open");
    });

    const lv1 = document.querySelectorAll(".mobile-accordion");
    const lv2 = document.querySelectorAll(".mobile-accordion-lv2");

    lv1.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling;
            if (!sub) return;

            const isOpen = sub.classList.contains("open");
            document.querySelectorAll(".mobile-accordion").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".mobile-sub").forEach((s) => s.classList.remove("open"));

            if (!isOpen) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    lv2.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling;
            const parent = btn.closest(".mobile-sub");
            if (!sub || !parent) return;

            const isOpen = sub.classList.contains("open");
            parent.querySelectorAll(".mobile-accordion-lv2").forEach((b) => b.classList.remove("active"));
            parent.querySelectorAll(".mobile-sub-lv2").forEach((s) => s.classList.remove("open"));

            if (!isOpen) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    console.log("✔ Mobile menu initialized");
}

/* ======================================================
   7. LOGIN / LOGOUT UI (복구)
====================================================== */

// 로그인 버튼 클릭 → 로그인 페이지 or 모달
document.addEventListener("click", (e) => {
    if (e.target.id === "headerLoginBtn") {
        location.href = "/admin/login.html"; // 로그인 URL 원하는대로 변경
    }
});

// Supabase 세션 감지 → 로그인 상태 유지
async function checkAuthHeaderUI() {
    const {
        data: {session},
    } = await supabaseClient.auth.getSession();
    const loginBtn = document.getElementById("headerLoginBtn");
    const userBox = document.getElementById("headerUserBox");

    if (!loginBtn || !userBox) return;

    if (session) {
        loginBtn.style.display = "none";
        userBox.classList.remove("hide");
    } else {
        loginBtn.style.display = "inline-block";
        userBox.classList.add("hide");
    }
}

document.addEventListener("menusReady", checkAuthHeaderUI);

// 로그아웃 처리
document.addEventListener("click", async (e) => {
    if (e.target.id === "headerLogoutBtn") {
        await supabaseClient.auth.signOut();
        alert("로그아웃 되었습니다.");
        location.reload();
    }
});

// 관리자 페이지 이동 버튼 (원하면 제거 또는 수정)
document.addEventListener("click", (e) => {
    if (e.target.id === "headerDashboardIcon") {
        location.href = "/admin/index.html";
    }
});
