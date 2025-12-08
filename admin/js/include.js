document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-include]").forEach(async (el) => {
        const file = el.getAttribute("data-include");
        try {
            const html = await fetch(file).then((res) => res.text());
            el.innerHTML = html;
        } catch (e) {
            console.error("Include error:", file, e);
        }
    });
});
