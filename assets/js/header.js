// === header.js (GitHub Pages 호환 완전 버전) ===

// header.html이 fetch로 불러온 후 실행되어야 하므로
// 함수로 감싸고 index.html에서 호출한다.
function initMobileHeader() {

  /* ---------------------------
      PC 헤더 (Mega Menu)
  ----------------------------*/
  const navMenu = document.querySelector(".nav-menu");
  const megaMenusContainer = document.querySelector(".mega-menus-container");

  if (navMenu && megaMenusContainer) {

    const links = navMenu.querySelectorAll(".nav-link[data-mega]");
    const megaMenus = megaMenusContainer.querySelectorAll(".mega-menu");

    function closeAllMega() {
      megaMenus.forEach(m => m.classList.remove("open"));
    }

    // hover 시 열기
    links.forEach(link => {
      link.addEventListener("mouseenter", () => {
        const id = link.dataset.mega;
        closeAllMega();
        const target = document.getElementById(id);
        if (target) target.classList.add("open");
      });
    });

    // 메뉴 밖으로 마우스 나가면 닫기
    megaMenusContainer.addEventListener("mouseleave", closeAllMega);
    navMenu.addEventListener("mouseleave", closeAllMega);
  }

  /* ---------------------------
      MOBILE HEADER
  ----------------------------*/
  const toggleBtn = document.querySelector(".mobile-nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener("click", () => {
      toggleBtn.classList.toggle("active");
      mobileNav.classList.toggle("open");
    });
  }

  /* ---------------------------
      MOBILE ACCORDIONS
  ----------------------------*/
  const acc1 = document.querySelectorAll(".mobile-accordion");
  acc1.forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const panel = btn.nextElementSibling;
      panel.classList.toggle("open");
    });
  });

  const acc2 = document.querySelectorAll(".mobile-accordion-lv2");
  acc2.forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const panel = btn.nextElementSibling;
      panel.classList.toggle("open");
    });
  });
}
