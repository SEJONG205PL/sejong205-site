// === header.js (hover 유지형 최종 안정버전) ===

function initMobileHeader() {

  /* ---------------------------
      PC HEADER (Mega Menu Hover)
  ----------------------------*/
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    const link = item.querySelector(".nav-link");
    const mega = item.querySelector(".mega-menu");

    if (!link || !mega) return;

    // 메뉴 hover 시 열기
    item.addEventListener("mouseenter", () => {
      closeAllMega();
      mega.classList.add("open");
      document.querySelector(".main-header").classList.add("menu-open");
    });

    // 메뉴 + mega-menu 전체 hover 유지됨
    item.addEventListener("mouseleave", () => {
      closeAllMega();
      document.querySelector(".main-header").classList.remove("menu-open");
    });

  });

  // 모든 mega-menu 닫기
  function closeAllMega() {
    document.querySelectorAll(".mega-menu").forEach(m => m.classList.remove("open"));
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
      btn.nextElementSibling.classList.toggle("open");
    });
  });

  const acc2 = document.querySelectorAll(".mobile-accordion-lv2");
  acc2.forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.nextElementSibling.classList.toggle("open");
    });
  });

}
