// === header.js (단일 mega-box + hover 유지형 최종버전) ===

function initHeader() {

  /* ------------------------------------
      PC : 단일 Mega Box 컨트롤
  ------------------------------------ */
  const navLinks = document.querySelectorAll(".nav-link[data-menu]");
  const megaBox = document.querySelector(".mega-box");
  const megaContents = document.querySelectorAll(".mega-content");

  let hideTimer = null;

  function showMega(menuName) {
    clearTimeout(hideTimer);

    // 모든 콘텐츠 숨김
    megaContents.forEach(c => c.classList.remove("active"));

    // 해당 콘텐츠만 활성화
    const target = document.querySelector(`.mega-content[data-menu="${menuName}"]`);
    if (target) target.classList.add("active");

    // mega-box 표시
    megaBox.classList.add("show");
  }

  function hideMega() {
    hideTimer = setTimeout(() => {
      megaBox.classList.remove("show");
      megaContents.forEach(c => c.classList.remove("active"));
    }, 120); // 살짝 지연 → 끊김 없음
  }

  // 메뉴 hover → mega box 열림
  navLinks.forEach(link => {
    link.addEventListener("mouseenter", () => {
      const targetMenu = link.dataset.menu;
      showMega(targetMenu);
    });

    link.addEventListener("mouseleave", () => {
      hideMega();
    });
  });

  // mega 박스 hover 유지
  megaBox.addEventListener("mouseenter", () => {
    clearTimeout(hideTimer);
  });

  megaBox.addEventListener("mouseleave", () => {
    hideMega();
  });



  /* ------------------------------------
      MOBILE HEADER
  ------------------------------------ */
  const toggleBtn = document.querySelector(".mobile-nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener("click", () => {
      toggleBtn.classList.toggle("active");
      mobileNav.classList.toggle("open");
    });
  }

  /* ------------------------------------
      MOBILE ACCORDION
  ------------------------------------ */
  document.querySelectorAll(".mobile-accordion").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.nextElementSibling.classList.toggle("open");
    });
  });

  document.querySelectorAll(".mobile-accordion-lv2").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      btn.nextElementSibling.classList.toggle("open");
    });
  });

}
