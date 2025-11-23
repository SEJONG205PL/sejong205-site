function initMobileHeader() {

  /* ---------------------------
      PC HEADER – Hover 유지형 Mega Menu
  ----------------------------*/
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    const link = item.querySelector(".nav-link");
    const mega = item.querySelector(".mega-menu");

    if (!link || !mega) return;

    // nav-item에 hover되면 메뉴 표시
    item.addEventListener("mouseenter", () => {
      mega.classList.add("open");
    });

    // nav-item에서 마우스가 벗어나면 메뉴 숨김
    item.addEventListener("mouseleave", () => {
      mega.classList.remove("open");
    });
  });


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
