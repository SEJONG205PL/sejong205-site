/*
======================================================
  SEJONG205 — HEADER CONTROLLER FINAL
  - 로그인 UI
  - PC 메가메뉴 Hover
  - 모바일 햄버거 + 아코디언 2단
======================================================
*/

let loginInitDone = false;
let pcMenuInitDone = false;
let mobileBurgerInitDone = false;
let mobileAccordionInitDone = false;

/* ---------------------------------
 *  이벤트 연결
 * --------------------------------- */

// include 로드 후: 로그인 / 모바일 햄버거 준비
document.addEventListener("includeLoaded", () => {
    tryInitLoginUI();
    tryInitMobileBurger();
});

// Supabase 준비 후도 한 번 더 시도
document.addEventListener("appReady", () => {
    tryInitLoginUI();
});

// 메뉴가 DB에서 렌더링된 뒤: PC 메가메뉴 + 모바일 아코디언 준비
document.addEventListener("menusReady", () => {
    tryInitPCMegaMenu();
    tryInitMobileAccordions();
});

/* ---------------------------------
 *  로그인 UI
 * --------------------------------- */

function tryInitLoginUI() {
    if (loginInitDone) return;
    initLoginUI();
}

async function initLoginUI() {
    const loginBtn = document.getElementById("headerLoginBtn");
    const userBox = document.getElementById("headerUserBox");

    // DOM 아직이면 재시도
    if (!loginBtn || !userBox) {
        setTimeout(initLoginUI, 200);
        return;
    }

    // Supabase 아직이면 재시도
    if (!window.supabaseClient) {
        setTimeout(initLoginUI, 200);
        return;
    }

    try {
        const {data} = await supabaseClient.auth.getSession();
        const user = data?.session?.user;

        const dashboardIcon = document.getElementById("headerDashboardIcon");
        const logoutBtn = document.getElementById("headerLogoutBtn");

        if (!user) {
            loginBtn.classList.remove("hide");
            userBox.classList.add("hide");
            loginBtn.onclick = () => (location.href = "/admin/login.html");
        } else {
            loginBtn.classList.add("hide");
            userBox.classList.remove("hide");

            if (dashboardIcon) {
                dashboardIcon.onclick = () => (location.href = "/admin/dashboard.html");
            }

            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await supabaseClient.auth.signOut();
                    alert("로그아웃 되었습니다.");
                    location.href = "/";
                };
            }
        }

        loginInitDone = true;
    } catch (err) {
        console.error("Login UI init failed:", err);
    }
}

/* ---------------------------------
 *  PC 메가메뉴 (Hover)
 * --------------------------------- */

function tryInitPCMegaMenu() {
    if (pcMenuInitDone) return;
    initPCMegaMenu();
}

function initPCMegaMenu() {
    const header = document.querySelector(".main-header.pc");
    const navWrapper = document.querySelector(".nav-wrapper");

    if (!navWrapper || !header) {
        setTimeout(initPCMegaMenu, 200);
        return;
    }

    const links = navWrapper.querySelectorAll(".nav-link[data-mega]");
    const megaMenus = document.querySelectorAll(".mega-menu");

    if (!links.length || !megaMenus.length) {
        setTimeout(initPCMegaMenu, 200);
        return;
    }

    let activeLink = null;

    function closeAll() {
        megaMenus.forEach((m) => m.classList.remove("open"));
        links.forEach((l) => l.classList.remove("active"));
        activeLink = null;
    }

    links.forEach((link) => {
        link.addEventListener("mouseenter", () => {
            if (window.innerWidth < 960) return;

            closeAll();

            const target = document.getElementById(link.dataset.mega);

            if (target) {
                target.classList.add("open");
                link.classList.add("active");
                activeLink = link;
            }
        });
    });

    megaMenus.forEach((menu) => {
        menu.addEventListener("mouseenter", () => {
            if (activeLink) activeLink.classList.add("active");
        });
    });

    header.addEventListener("mouseleave", () => {
        if (window.innerWidth < 960) return;
        closeAll();
    });

    console.log("PC mega menu initialized ✔");
}

/* ---------------------------------
 *  모바일 햄버거 토글
 *  (메뉴 항목 없어도 먼저 동작해야 하므로 따로 분리)
 * --------------------------------- */

function tryInitMobileBurger() {
    if (mobileBurgerInitDone) return;
    initMobileBurger();
}

function initMobileBurger() {
    const toggleBtn = document.querySelector(".mobile-nav-toggle");
    const mobileNav = document.querySelector(".mobile-nav");

    if (!toggleBtn || !mobileNav) {
        setTimeout(initMobileBurger, 200);
        return;
    }

    toggleBtn.addEventListener("click", () => {
        mobileNav.classList.toggle("open");
        toggleBtn.classList.toggle("active");
        document.body.classList.toggle("mobile-menu-open");
    });

    mobileBurgerInitDone = true;
    console.log("Mobile burger initialized ✔");
}

/* ---------------------------------
 *  모바일 아코디언 (1단 / 2단)
 * --------------------------------- */

function tryInitMobileAccordions() {
    if (mobileAccordionInitDone) return;
    initMobileAccordions();
}

function initMobileAccordions() {
    const level1Btns = document.querySelectorAll(".mobile-accordion");
    const level2Btns = document.querySelectorAll(".mobile-accordion-lv2");

    // 메뉴가 아직 안 그려졌으면 재시도
    if (!level1Btns.length) {
        setTimeout(initMobileAccordions, 200);
        return;
    }

    // 1단 (대메뉴) : 열 때 나머지 닫기
    level1Btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling;
            if (!sub) return;

            const isOpen = sub.classList.contains("open");

            // 모두 닫기
            document.querySelectorAll(".mobile-accordion").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".mobile-sub").forEach((s) => s.classList.remove("open"));

            // 다시 열기
            if (!isOpen) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    // 2단 (중메뉴) : 같은 섹션 안에서만 아코디언
    level2Btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const sub = btn.nextElementSibling;
            const parentSub = btn.closest(".mobile-sub");
            if (!sub || !parentSub) return;

            const isOpen = sub.classList.contains("open");

            // 같은 섹션의 다른 애들 닫기
            parentSub.querySelectorAll(".mobile-accordion-lv2").forEach((b) => b.classList.remove("active"));
            parentSub.querySelectorAll(".mobile-sub-lv2").forEach((s) => s.classList.remove("open"));

            if (!isOpen) {
                btn.classList.add("active");
                sub.classList.add("open");
            }
        });
    });

    mobileAccordionInitDone = true;
    console.log("Mobile accordion initialized ✔");
}
