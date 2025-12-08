// 게시판 목록 — APP READY 기준
document.addEventListener("appReady", () => {
    // supabaseClient 없으면 그냥 포기 (에러 표기)
    if (!window.supabaseClient) {
        console.error("❌ supabaseClient not found");
        showError("데이터베이스 연결에 실패했습니다.");
        return;
    }
    initBoardList();
});

let boardState = {
    boardId: null,
    allPosts: [],
    noticePosts: [],
    regularPosts: [],
    currentPage: 1,
    pageSize: 10,
    isAdmin: false,
    isLoading: false,
};

async function initBoardList() {
    try {
        console.log("📌 Board list init...");

        const url = new URL(location.href);
        boardState.boardId = Number(url.searchParams.get("id"));

        if (!boardState.boardId) {
            showError("존재하지 않는 게시판입니다.");
            return;
        }

        const postList = document.getElementById("postList");
        const pagination = document.querySelector(".sn-pagination");
        if (!postList || !pagination) {
            console.error("필수 DOM 요소 없음");
            return;
        }

        boardState.isLoading = true;
        showLoading();

        boardState.isAdmin = await checkAdminPermission();
        if (boardState.isAdmin) {
            showAdminElements();
        }

        await loadPosts();

        boardState.isLoading = false;
        renderTable();
        renderPagination();
        setupEventDelegation();

        console.log("📌 Board list ready");
    } catch (err) {
        console.error(err);
        boardState.isLoading = false;
        showError("게시판 로딩에 실패했습니다.");
    }
}

async function checkAdminPermission() {
    try {
        if (typeof supabaseClient === "undefined") {
            console.warn("supabaseClient 없음");
            return false;
        }

        const {data: sessionData, error: sessionError} = await supabaseClient.auth.getSession();
        if (sessionError || !sessionData?.session?.user) return false;

        const {data: profile, error: profileError} = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

        if (profileError) return false;

        return profile?.role === "admin";
    } catch (e) {
        console.error("관리자 체크 실패:", e);
        return false;
    }
}

function showAdminElements() {
    const adminBoard = document.querySelector(".admin_board");
    const adminTh = document.querySelector(".admin-th");

    if (adminBoard) adminBoard.classList.remove("hide");
    if (adminTh) adminTh.classList.remove("hide");
}

function showLoading() {
    const postList = document.getElementById("postList");
    if (!postList) return;
    postList.innerHTML = `
        <tr>
            <td colspan="6" class="Looking_box">
                <div class="loading-spinner-alt"></div>
                <div style="margin-top: 8px;">Loading...</div>
            </td>
        </tr>`;
}

async function loadPosts() {
    console.log(`📌 loadPosts for board_id=${boardState.boardId}`);

    const {data: noticePosts, error: nErr} = await supabaseClient
    .from("posts")
    .select("id,title,views,author_id,created_at,updated_at,notice")
    .eq("board_id", boardState.boardId)
    .eq("notice", true)
    .order("created_at", {ascending: true});

    if (nErr) {
        console.error("공지 로딩 실패:", nErr);
        boardState.noticePosts = [];
    } else {
        boardState.noticePosts = noticePosts || [];
    }

    const {data: regularPosts, error: rErr} = await supabaseClient
    .from("posts")
    .select("id,title,views,author_id,created_at,updated_at,notice")
    .eq("board_id", boardState.boardId)
    .eq("notice", false)
    .order("id", {ascending: false});

    if (rErr) {
        console.error("일반글 로딩 실패:", rErr);
        boardState.regularPosts = [];
    } else {
        boardState.regularPosts = regularPosts || [];
    }

    boardState.allPosts = [...boardState.noticePosts, ...boardState.regularPosts];
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function truncateTitle(title, max = 50) {
    if (!title) return "";
    if (title.length <= max) return title;
    return title.substring(0, max) + "...";
}

function renderTable() {
    const postList = document.getElementById("postList");
    if (!postList) return;

    if (boardState.allPosts.length === 0) {
        postList.innerHTML = `
            <tr>
                <td colspan="${boardState.isAdmin ? 6 : 5}" class="text-center">
                    게시글이 없습니다.
                </td>
            </tr>`;
        return;
    }

    const totalRegular = boardState.regularPosts.length;
    let html = "";

    // 공지 (notice-row + notice-badge)
    boardState.noticePosts.forEach((post) => {
        const adminTd = boardState.isAdmin
            ? `<td class="admin-td"><input type="checkbox" class="admin-checkbox" data-id="${post.id}"></td>`
            : "";

        html += `
            <tr data-post-id="${post.id}" class="board-row notice-row">
                <td><span class="notice-badge">공지</span></td>
                ${adminTd}
                <td>
                    <a href="/skin/board/detail.html?id=${boardState.boardId}&post=${post.id}" 
                       class="title-link" 
                       title="${escapeHtml(post.title)}">
                        ${escapeHtml(truncateTitle(post.title))}
                    </a>
                </td>
                <td>${post.author_id ? "Admin" : "익명"}</td>
                <td>${post.views ?? 0}</td>
                <td>${post.updated_at?.substring(0, 10) ?? "-"}</td>
            </tr>`;
    });

    // 일반글 + 페이징
    const start = (boardState.currentPage - 1) * boardState.pageSize;
    const end = start + boardState.pageSize;
    const slice = boardState.regularPosts.slice(start, end);

    slice.forEach((post, idx) => {
        const num = totalRegular - (start + idx);
        const adminTd = boardState.isAdmin
            ? `<td class="admin-td"><input type="checkbox" class="admin-checkbox" data-id="${post.id}"></td>`
            : "";

        html += `
            <tr data-post-id="${post.id}" class="board-row">
                <td>${num > 0 ? num : "-"}</td>
                ${adminTd}
                <td>
                    <a href="/skin/board/detail.html?id=${boardState.boardId}&post=${post.id}" 
                       class="title-link" 
                       title="${escapeHtml(post.title)}">
                        ${escapeHtml(truncateTitle(post.title))}
                    </a>
                </td>
                <td>${post.author_id ? "Admin" : "익명"}</td>
                <td>${post.views ?? 0}</td>
                <td>${post.updated_at?.substring(0, 10) ?? "-"}</td>
            </tr>`;
    });

    postList.innerHTML = html;
}

function renderPagination() {
    const pagination = document.querySelector(".sn-pagination");
    if (!pagination) return;

    const totalPages = Math.ceil(boardState.regularPosts.length / boardState.pageSize);
    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    const pagesPerGroup = 10;
    const currentGroup = Math.ceil(boardState.currentPage / pagesPerGroup);
    const totalGroups = Math.ceil(totalPages / pagesPerGroup);

    const startPage = (currentGroup - 1) * pagesPerGroup + 1;
    const endPage = Math.min(currentGroup * pagesPerGroup, totalPages);

    let html = "";

    if (totalGroups > 1 && currentGroup > 1) {
        const prevLast = (currentGroup - 1) * pagesPerGroup;
        html += `<button class="sn-page-btn" data-page="${prevLast}">&lt;</button>`;
    }

    for (let p = startPage; p <= endPage; p++) {
        html += `<button class="sn-page-btn${p === boardState.currentPage ? " active" : ""}" data-page="${p}">
            ${p}
        </button>`;
    }

    if (totalGroups > 1 && currentGroup < totalGroups) {
        const nextFirst = currentGroup * pagesPerGroup + 1;
        html += `<button class="sn-page-btn" data-page="${nextFirst}">&gt;</button>`;
    }

    pagination.innerHTML = html;
}

function setupEventDelegation() {
    document.addEventListener("click", async (e) => {
        const row = e.target.closest(".board-row");
        const titleLink = e.target.closest(".title-link");

        if (row && !e.target.matches(".admin-checkbox") && !titleLink) {
            const postId = row.dataset.postId;
            if (postId) goDetail(Number(postId));
        }

        if (e.target.matches(".sn-page-btn") && !e.target.disabled) {
            const p = Number(e.target.dataset.page);
            if (!p) return;
            changePage(p);
        }

        if (e.target.matches(".admin-checkbox")) {
            e.stopPropagation();
            updateSelectedCount();
        }

        if (e.target.matches("#btnWrite")) {
            handleWriteClick();
        }

        if (e.target.matches("#btnDeleteSelected")) {
            await handleDeleteSelected();
        }

        if (e.target.matches("#btnDeleteAll")) {
            await handleDeleteAll();
        }
    });
}

function handleWriteClick() {
    if (!boardState.isAdmin) {
        alert("관리자만 글쓰기가 가능합니다.");
        return;
    }
    location.href = `/skin/board/write.html?id=${boardState.boardId}`;
}

function updateSelectedCount() {
    const checked = document.querySelectorAll(".admin-checkbox:checked");
    const count = checked.length;
    const btn = document.getElementById("btnDeleteSelected");
    if (btn) btn.textContent = count > 0 ? `선택삭제 (${count})` : "선택삭제";
}

async function handleDeleteSelected() {
    if (!boardState.isAdmin) {
        alert("관리자만 삭제가 가능합니다.");
        return;
    }

    const checked = document.querySelectorAll(".admin-checkbox:checked");
    if (checked.length === 0) {
        alert("삭제할 게시글을 선택해주세요.");
        return;
    }

    if (!confirm(`선택한 ${checked.length}개의 게시글을 삭제하시겠습니까?`)) return;

    const ids = Array.from(checked).map((cb) => Number(cb.dataset.id));

    const {error} = await supabaseClient.from("posts").delete().in("id", ids);
    if (error) {
        console.error(error);
        alert("삭제 실패");
        return;
    }

    alert(`${ids.length}개의 게시글이 삭제되었습니다.`);
    boardState.currentPage = 1;
    await loadPosts();
    renderTable();
    renderPagination();
}

async function handleDeleteAll() {
    if (!boardState.isAdmin) {
        alert("관리자만 삭제가 가능합니다.");
        return;
    }

    if (!confirm("이 게시판의 모든 게시글을 삭제하시겠습니까?")) return;

    const {error} = await supabaseClient.from("posts").delete().eq("board_id", boardState.boardId);

    if (error) {
        console.error(error);
        alert("전체 삭제 실패");
        return;
    }

    alert("모든 게시글이 삭제되었습니다.");
    boardState.currentPage = 1;
    await loadPosts();
    renderTable();
    renderPagination();
}

function changePage(page) {
    const totalPages = Math.ceil(boardState.regularPosts.length / boardState.pageSize);
    if (page < 1 || page > totalPages) return;
    boardState.currentPage = page;
    renderTable();
    renderPagination();
    window.scrollTo({top: 0, behavior: "smooth"});
}

function goDetail(postId) {
    if (!postId) return;
    location.href = `/skin/board/detail.html?id=${boardState.boardId}&post=${postId}`;
}

function showError(message) {
    const postList = document.getElementById("postList");
    if (!postList) return;
    postList.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <strong>오류 발생</strong><br>
                ${escapeHtml(message)}
            </td>
        </tr>`;
}
