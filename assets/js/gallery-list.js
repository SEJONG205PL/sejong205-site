/* ======================================================
   GALLERY LIST — FINAL FIXED VERSION
   - header-core.js 환경 통합 대응
   - supabase init 대기 문제 해결
   - 관리자 버튼 표시 정상 작동
   - 게시물/공지 출력 + pagination 정상화
====================================================== */

let G = {
    galleryId: null,
    postsNotice: [],
    posts: [],
    all: [],
    page: 1,
    size: 12,
    admin: false,
};

/* -------------------- 초기 실행 -------------------- */
waitForSupabase().then(initGalleryList);

function waitForSupabase() {
    return new Promise((res) => {
        let t = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(t);
                res();
            }
        }, 60);
    });
}

/* -------------------- MAIN -------------------- */
async function initGalleryList() {
    G.galleryId = Number(new URLSearchParams(location.search).get("id"));
    if (!G.galleryId) {
        alert("잘못된 접근");
        location.href = "/";
        return;
    }

    showLoading();

    const [adminCheck] = await Promise.all([checkAdmin(), loadGallery()]);

    G.admin = adminCheck;
    render();
    bindEvents();

    if (G.admin) document.querySelector(".admin_board")?.classList.remove("hide");
}

/* -------------------- 관리자 인증 -------------------- */
async function checkAdmin() {
    const {
        data: {session},
    } = await supabaseClient.auth.getSession();
    if (!session) return false;

    const {data: p} = await supabaseClient.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    return p?.role === "admin";
}

/* -------------------- 데이터 가져오기 -------------------- */
async function loadGallery() {
    const [notice, res] = await Promise.all([
        supabaseClient
        .from("gallery")
        .select("*")
        .eq("gallery_id", G.galleryId)
        .eq("notice", true)
        .order("id", {ascending: false}),
        supabaseClient
        .from("gallery")
        .select("*")
        .eq("gallery_id", G.galleryId)
        .eq("notice", false)
        .order("id", {ascending: false}),
    ]);

    G.postsNotice = notice.data ?? [];
    G.posts = res.data ?? [];
    G.all = [...G.postsNotice, ...G.posts];
}

/* -------------------- 렌더 -------------------- */
function render() {
    const box = document.querySelector(".sn-grid");
    const pag = document.querySelector(".sn-pagination");

    if (!G.all.length) {
        box.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px">No gallery.</div>`;
        pag.innerHTML = "";
        return;
    }

    let html = "";

    G.postsNotice.forEach((p) => (html += card(p, true)));
    const start = (G.page - 1) * G.size;
    G.posts.slice(start, start + G.size).forEach((p) => (html += card(p, false)));

    box.innerHTML = html;
    renderPagination();
}

function card(p, isNotice) {
    return `
    <div class="sn-card ${isNotice ? "sn-card-notice" : ""}" data-id="${p.id}">
        ${
            G.admin
                ? `<label class="sn-admin-checkbox-wrap"><input type="checkbox" class="admin-check" data-id="${p.id}"></label>`
                : ""
        }
        ${isNotice ? `<div class="sn-notice-badge">공지</div>` : ""}
        <div class="sn-img"><img src="${p.image_url || "/assets/img/default.jpg"}"></div>
        <div class="sn-content">
            <h3>${p.title}</h3>
            <div class="sn-meta-box">
                <div class="sn-meta">
                    <span>👁 ${p.views || 0}</span><span>${p.created_at?.slice(0, 10)}</span>
                </div>
                <a class="sn-link" href="/skin/gallery/detail.html?id=${G.galleryId}&post=${p.id}">more →</a>
            </div>
        </div>
    </div>`;
}

/* -------------------- Pagination -------------------- */
function renderPagination() {
    const pag = document.querySelector(".sn-pagination");
    const total = Math.ceil(G.posts.length / G.size);
    if (total <= 1) {
        pag.innerHTML = "";
        return;
    }

    let h = "";
    for (let i = 1; i <= total; i++) {
        h += `<button class="sn-page-btn ${i === G.page ? "active" : ""}" data-go="${i}">${i}</button>`;
    }
    pag.innerHTML = h;
}

/* -------------------- 이벤트 -------------------- */
function bindEvents() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("sn-page-btn")) {
            G.page = Number(e.target.dataset.go);
            render();
            window.scrollTo({top: 0, behavior: "smooth"});
        }

        if (
            e.target.closest(".sn-card") &&
            !e.target.classList.contains("admin-check") &&
            !e.target.classList.contains("sn-link")
        ) {
            const id = e.target.closest(".sn-card").dataset.id;
            location.href = `/skin/gallery/detail.html?id=${G.galleryId}&post=${id}`;
        }
    });

    // 관리자 버튼
    const W = document.getElementById("btnWrite");
    const DS = document.getElementById("btnDeleteSelected");
    const DA = document.getElementById("btnDeleteAll");

    if (W) W.onclick = () => (location.href = `/skin/gallery/write.html?id=${G.galleryId}`);
    if (DS) DS.onclick = delSelected;
    if (DA) DA.onclick = delAll;
}

/* -------------------- 삭제 -------------------- */
async function delSelected() {
    const sel = [...document.querySelectorAll(".admin-check:checked")].map((x) => Number(x.dataset.id));
    if (!sel.length) return alert("선택 없음");

    if (!confirm(`${sel.length}개 삭제?`)) return;
    await supabaseClient.from("gallery").delete().in("id", sel);

    await loadGallery();
    G.page = 1;
    render();
}

async function delAll() {
    if (!confirm("정말 전체 삭제?")) return;
    await supabaseClient.from("gallery").delete().eq("gallery_id", G.galleryId);

    await loadGallery();
    G.page = 1;
    render();
}

/* -------------------- Loading -------------------- */
function showLoading() {
    document.querySelector(".sn-grid").innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:50px">
            <div class="loading-spinner-alt"></div>Loading...
        </div>`;
}
