/* ======================================================
 Gallery Detail (원본 구조 유지 + 버그 Fix + 다중링크/파일 정상화)
====================================================== */

(function () {
    let init = false;

    async function run() {
        if (init) return;
        init = true;

        const $t = q(".gallery-detail-title");
        const $a = q(".author");
        const $d = q(".date");
        const $v = q(".views");
        const $c = q(".gallery-detail-content");
        const $extra = q("#extraArea");
        const $admin = q("#adminActions");

        if ($c) $c.innerHTML = `<div class="Looking_box"><div class="loading-spinner-alt"></div></div>`;

        const param = new URLSearchParams(location.search);
        const gid = Number(param.get("id"));
        const pid = Number(param.get("post"));

        if (!gid || !pid) return printError("잘못된 접근");

        const {data: post, error} = await supabaseClient
        .from("gallery")
        .select("*")
        .eq("id", pid)
        .eq("gallery_id", gid)
        .single();

        if (error || !post) return printError("데이터 없음");

        /* --- 즉시 출력 (핵심) -------------------------------------------- */
        $t.textContent = post.title;
        $d.textContent = new Date(post.created_at).toLocaleDateString("ko-KR");
        $v.textContent = `Views ${post.views || 0}`;
        $c.innerHTML = post.description || "";

        if (post.notice) insert("#noticeIndicator", `<span class="notice-badge">공지</span>`);

        /* --- 백그라운드 처리 ------------------------------------------ */
        checkAdmin(pid, gid, $admin);
        updateViews(pid, post.views);
        renderExtras(post, $extra);
        loadAuthor(post.author_id, $a);
    }

    /* util */
    function q(s) {
        return document.querySelector(s);
    }
    function insert(sel, html) {
        const el = q(sel);
        if (el) el.innerHTML = html;
    }

    function printError(msg) {
        q(".gallery-detail-content").innerHTML = `<div style="text-align:center;padding:40px;">${msg}</div>`;
    }

    /* ========================= 📌 관리자 버튼 ========================= */
    async function checkAdmin(pid, gid, box) {
        if (!box) return;
        const session = await supabaseClient.auth.getSession();
        if (!session?.data?.session?.user) return;

        const uid = session.data.session.user.id;
        const {data} = await supabaseClient.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (data?.role !== "admin") return;

        box.style.display = "flex";

        box.querySelector(".edit-btn").onclick = () =>
            (location.href = `/skin/gallery/write.html?id=${gid}&post=${pid}`);

        box.querySelector(".delete-btn").onclick = async () => {
            if (!confirm("삭제하시겠습니까?")) return;
            await supabaseClient.from("gallery").delete().eq("id", pid);
            alert("삭제 완료");
            location.href = `/skin/gallery/list.html?id=${gid}`;
        };
    }

    /* ========================= 📌 작성자 ========================= */
    async function loadAuthor(id, el) {
        if (!el) return;
        if (!id) return (el.textContent = "Admin");

        const {data} = await supabaseClient.from("profiles").select("username,email").eq("id", id).maybeSingle();

        el.textContent = data?.username || data?.email?.split("@")[0] || "Admin";
    }

    /* ========================= 📌 조회수 증가 ========================= */
    async function updateViews(id, v) {
        const views = (v || 0) + 1;
        await supabaseClient.from("gallery").update({views}).eq("id", id);
        q(".views").textContent = `Views ${views}`;
    }

    /* ========================= 📌 링크 / 파일 렌더 ========================= */
    function renderExtras(post, box) {
        if (!box) return;

        let links = normalize(post.links);
        let files = normalize(post.files);

        if (!links.length && !files.length) return (box.style.display = "none");

        let html = ``;

        if (links.length) {
            html += `
            <div class="extra-block">
                <div class="extra-title">관련 링크</div>
                <ul class="extra-list">
                    ${links.map((v, i) => `<li><a href="${v}" target="_blank">${makeShort(v)}</a></li>`).join("")}
                </ul>
            </div>`;
        }

        if (files.length) {
            html += `
            <div class="extra-block">
                <div class="extra-title">첨부 파일</div>
                <ul class="extra-list">
                    ${files
                    .map((f, i) => {
                        const url = typeof f === "string" ? f : f.url;
                        const name = typeof f === "string" ? `파일_${i + 1}` : f.name || `파일_${i + 1}`;
                        return `<li><a href="${url}" download>${name}</a></li>`;
                    })
                    .join("")}
                </ul>
            </div>`;
        }

        box.innerHTML = html;
    }

    /* 문자열/JSON/배열 모두 처리 */
    function normalize(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
            return JSON.parse(data);
        } catch {
            return [data];
        }
    }

    function makeShort(url) {
        return url.length > 45 ? url.slice(0, 45) + "..." : url;
    }

    /* boot */
    function boot() {
        if (!window.supabaseClient) return setTimeout(boot, 50);
        run();
    }
    boot();
})();
