
document.addEventListener("DOMContentLoaded", () => {
  const navMenu = document.querySelector(".nav-menu");
  if (!navMenu) return;

  const links = navMenu.querySelectorAll(".nav-link[data-mega]");
  const megaMenus = navMenu.querySelectorAll(".mega-menu");

  function closeAll() {
    megaMenus.forEach(m => m.classList.remove("open"));
  }

  links.forEach(link => {
    link.addEventListener("mouseenter", () => {
      const id = link.dataset.mega;
      if (!id) return;
      closeAll();
      const target = navMenu.querySelector("#" + id);
      if (target) target.classList.add("open");
    });
  });

  navMenu.addEventListener("mouseleave", () => {
    closeAll();
  });
});
