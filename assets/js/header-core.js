/* ======================================================
   SEJONGO HEADER-CORE FINAL (FULL VERSION)
   - Header/Footer include
   - Supabase Init
   - Menu Fetch + Render
   - PC/Mobile Nav
   - menuDataLoaded 이벤트 발생 (breadcrumb.js 연동)
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
        console.warn("⚠️ Supabase library missing");
        afterSupabaseReady();
        return;
    }

    try {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseReady = true;
        console.log("🟢 Supabase Ready");
        document.dispatchEvent(new Event("supabaseReady"));
        afterSupabaseReady();
    } catch (e) {
        console.error("❌ Supabase Init Error", e);
        afterSupabaseReady();
    }
}

function afterSupabaseReady() {
    if (document.getElementById("pcMenu") && document.getElementById("mobileMenu")) loadMenus();
    else {
        console.log("ℹ️ No menu DOM, menusReady direct");
        document.dispatchEvent(new Event("menusReady"));
        setTimeout(() => document.dispatchEvent(new Event("appReady")), 0);
    }
}

/* ================= 3. MENU LOAD ================= */
async function loadMenus() {
    await waitHeaderNodes();

    if (!window.supabaseClient) {
        document.dispatchEvent(new Event("menusReady"));
        document.dispatchEvent(new Event("appReady"));
        return;
    }

    if (menuCache) {
        renderMenus(menuCache);
        return;
    }

    if (menuPromise) return menuPromise;

    menuPromise = (async () => {
        console.log("📡 Fetching menu_items...");
        let {data, error} = await supabaseClient.from("menu_items").select("*").order("order_num", {ascending: true});

        if (error) {
            console.error(error);
            document.dispatchEvent(new Event("menusReady"));
            document.dispatchEvent(new Event("appReady"));
            return;
        }

        menuCache = data;
        renderMenus(menuCache);
    })();
}

function waitHeaderNodes() {
    return new Promise((res) => {
        const check = () => {
            if (document.getElementById("pcMenu") && document.getElementById("mobileMenu")) res();
            else setTimeout(check, 60);
        };
        check();
    });
}

/* ================= 4. RENDER MENUS ================= */
function renderMenus(data) {
    const pcMenu = document.getElementById("pcMenu");
    const megaContainer = document.getElementById("megaContainer");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!pcMenu || !megaContainer || !mobileMenu) {
        document.dispatchEvent(new Event("menusReady"));
        document.dispatchEvent(new Event("appReady"));
        return;
    }

    const d1 = data.filter((v) => v.depth === 1);
    const d2 = data.filter((v) => v.depth === 2);
    const d3 = data.filter((v) => v.depth === 3);

    let pcHtml = "",
        megaHtml = "";
    d1.forEach((m) => {
        pcHtml += `<div class="nav-item"><a class="nav-link" data-mega="m${m.id}">${m.name}</a></div>`;

        const child2 = d2.filter((s) => s.parent_id === m.id);
        megaHtml += `<div id="m${m.id}" class="mega-menu${
            child2.length ? "" : " none"
        }"><div class="mega-inner width">`;

        child2.forEach((s) => {
            const child3 = d3.filter((t) => t.parent_id === s.id);
            megaHtml += `<div class="mega-col"><h3>${s.name}</h3><ul>`;
            (child3.length ? child3 : [s]).forEach((v) => {
                megaHtml += `<li><a href="${v.link || "#"}">${v.name}</a></li>`;
            });
            megaHtml += `</ul></div>`;
        });
        megaHtml += "</div></div>";
    });

    pcMenu.innerHTML = pcHtml;
    megaContainer.innerHTML = megaHtml;

    /* MOBILE */
    let mbHtml = "";
    d1.forEach((m) => {
        const c2 = d2.filter((s) => s.parent_id === m.id);
        if (!c2.length) {
            mbHtml += `<li><a href="${m.link || "#"}">${m.name}</a></li>`;
            return;
        }

        mbHtml += `<li>
            <button class="mobile-accordion">${m.name}<span>▼</span></button>
            <div class="mobile-sub">`;

        c2.forEach((s) => {
            const c3 = d3.filter((v) => v.parent_id === s.id);
            if (c3.length) {
                mbHtml += `<button class="mobile-accordion-lv2">${s.name}<span>▼</span></button>
                        <div class="mobile-sub-lv2">`;
                c3.forEach((v) => (mbHtml += `<a href="${v.link}">${v.name}</a>`));
                mbHtml += "</div>";
            } else {
                mbHtml += `<a class="mobile-sub-item" href="${s.link}">${s.name}</a>`;
            }
        });

        mbHtml += "</div></li>";
    });

    mobileMenu.innerHTML = mbHtml;

    /* ⭐ breadcrumb.js가 menuData를 받아 사용할 수 있도록 이벤트 발행 */
    window.menuDataGlobal = data;
    window.dispatchEvent(new CustomEvent("menuDataLoaded", {detail: data})); // 🔥 핵심
    console.log("📡 menuDataLoaded dispatched");

    document.dispatchEvent(new Event("menusReady"));
    initPCMenu();
    initMobileMenu();

    setTimeout(() => document.dispatchEvent(new Event("appReady")), 0);
}

/* ================= 5. PC MENU ================= */
function initPCMenu() {
    const links = document.querySelectorAll(".nav-link[data-mega]");
    const menus = document.querySelectorAll(".mega-menu");
    const header = document.querySelector("header.main-header.pc");
    if (!links.length || !header) return;

    function close() {
        menus.forEach((m) => m.classList.remove("open"));
        links.forEach((l) => l.classList.remove("active"));
    }

    links.forEach((l) => {
        l.addEventListener("mouseenter", () => {
            close();
            const m = document.getElementById(l.dataset.mega);
            if (m) {
                m.classList.add("open");
                l.classList.add("active");
            }
        });
    });
    header.addEventListener("mouseleave", close);
}

/* ================= 6. MOBILE MENU ================= */
function initMobileMenu() {
    const toggle = document.querySelector(".mobile-nav-toggle");
    const nav = document.querySelector(".mobile-nav");
    if (!toggle || !nav) return;

    toggle.onclick = () => {
        nav.classList.toggle("open");
        toggle.classList.toggle("active");
    };

    document.querySelectorAll(".mobile-accordion").forEach((btn) => {
        btn.onclick = () => {
            const p = btn.nextElementSibling;
            btn.classList.toggle("active");
            p.classList.toggle("open");
        };
    });

    document.querySelectorAll(".mobile-accordion-lv2").forEach((btn) => {
        btn.onclick = () => {
            const p = btn.nextElementSibling;
            btn.classList.toggle("active");
            p.classList.toggle("open");
        };
    });
}

/* ================= 7. AUTH UI ================= */
document.addEventListener("menusReady", checkAuthHeaderUI);

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

document.addEventListener("click", async (e) => {
    if (e.target.id === "headerLogoutBtn") {
        await supabaseClient.auth.signOut();
        alert("로그아웃 완료");
        location.reload();
    }
});

document.addEventListener("click", (e) => {
    if (e.target.id === "headerDashboardIcon") location.href = "/admin/index.html";
});
