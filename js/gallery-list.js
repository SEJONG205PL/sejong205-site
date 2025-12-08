/*
======================================================
Gallery List - OPTIMIZED VERSION
- 게시판과 동일한 구조
- 병렬 처리로 로딩 속도 개선
- gallery_id 기반 필터링
======================================================
*/

let galleryState = {
    allPosts: [],
    noticePosts: [],
    regularPosts: [],
    currentPage: 1,
    pageSize: 12,
    isAdmin: false,
    isLoading: false,
    galleryId: null, // 갤러리 ID
};

/* --------------------------------------------------
초기화 - 즉시 실행
-------------------------------------------------- */
(function initWhenReady() {
    if (!window.supabaseClient) {
        const check = () => {
            if (window.supabaseClient) {
                initGalleryList();
            } else {
                setTimeout(check, 50);
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", check);
        } else {
            check();
        }
    } else {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initGalleryList);
        } else {
            initGalleryList();
        }
    }
})();

/* --------------------------------------------------
메인 초기화
-------------------------------------------------- */
async function initGalleryList() {
    try {
        console.log("⚡ Gallery list 초기화 시작");

        // URL 파라미터에서 gallery_id 가져오기
        const params = new URLSearchParams(window.location.search);
        galleryState.galleryId = Number(params.get("id"));

        if (!galleryState.galleryId) {
            alert("잘못된 갤러리 경로입니다.");
            window.location.href = "/";
            return;
        }

        const galleryGrid = document.querySelector(".sn-grid");
        const pagination = document.querySelector(".sn-pagination");
        const adminBoard = document.querySelector(".admin_board");

        if (!galleryGrid) {
            console.error("❌ Gallery grid element not found");
            return;
        }

        // 로딩 표시
        galleryState.isLoading = true;
        showLoading();

        // 관리자 영역 기본 숨김
        if (adminBoard) adminBoard.classList.add("hide");

        // 🚀 병렬 처리: 관리자 체크 + 갤러리 데이터 로드
        const [isAdmin] = await Promise.all([checkAdminPermission(), loadGalleryPosts()]);

        galleryState.isAdmin = isAdmin;

        if (isAdmin && adminBoard) {
            adminBoard.classList.remove("hide");
            setupAdminButtons();
        }

        galleryState.isLoading = false;

        // 렌더링
        renderGalleryGrid();
        renderPagination();

        // 이벤트 위임
        setupEventDelegation();

        console.log("✅ Gallery list 초기화 완료");
    } catch (error) {
        console.error("❌ Gallery 초기화 실패:", error);
        galleryState.isLoading = false;
        showError("갤러리 로딩에 실패했습니다.");
    }
}

/* --------------------------------------------------
관리자 권한 체크
-------------------------------------------------- */
async function checkAdminPermission() {
    try {
        const {data: sessionData} = await supabaseClient.auth.getSession();

        if (!sessionData?.session?.user) {
            return false;
        }

        const {data: profile} = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

        return profile?.role === "admin";
    } catch (error) {
        console.error("❌ 관리자 체크 실패:", error);
        return false;
    }
}

/* --------------------------------------------------
로딩 표시
-------------------------------------------------- */
function showLoading() {
    const galleryGrid = document.querySelector(".sn-grid");
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div style="grid-column: 1/-1;" class="Looking_box">
                <div class="loading-spinner-alt"></div>
                <div style="margin-top: 8px;">Loading...</div>
            </div>
        `;
    }
}

/* --------------------------------------------------
갤러리 데이터 로드
-------------------------------------------------- */
async function loadGalleryPosts() {
    try {
        console.log("📡 Gallery 데이터 로딩...");

        // 🚀 병렬 처리: 공지 + 일반 게시물 동시 로드
        const [noticeResult, regularResult] = await Promise.all([
            // 공지 게시물
            supabaseClient
            .from("gallery")
            .select("id, title, image_url, views, created_at, updated_at, notice")
            .eq("gallery_id", galleryState.galleryId)
            .eq("notice", true)
            .order("created_at", {ascending: false}),

            // 일반 게시물
            supabaseClient
            .from("gallery")
            .select("id, title, image_url, views, created_at, updated_at, notice")
            .eq("gallery_id", galleryState.galleryId)
            .eq("notice", false)
            .order("created_at", {ascending: false}),
        ]);

        if (noticeResult.error) {
            console.error("공지 로드 실패:", noticeResult.error);
            galleryState.noticePosts = [];
        } else {
            galleryState.noticePosts = noticeResult.data || [];
            console.log(`📌 공지: ${galleryState.noticePosts.length}개`);
        }

        if (regularResult.error) {
            console.error("일반 게시물 로드 실패:", regularResult.error);
            galleryState.regularPosts = [];
        } else {
            galleryState.regularPosts = regularResult.data || [];
            console.log(`📄 일반: ${galleryState.regularPosts.length}개`);
        }

        galleryState.allPosts = [...galleryState.noticePosts, ...galleryState.regularPosts];
        console.log(`✅ 총 ${galleryState.allPosts.length}개 로드 완료`);
    } catch (error) {
        console.error("❌ Gallery 로드 실패:", error);
        throw error;
    }
}

/* --------------------------------------------------
갤러리 그리드 렌더링
-------------------------------------------------- */
function renderGalleryGrid() {
    const galleryGrid = document.querySelector(".sn-grid");
    if (!galleryGrid) return;

    // 게시물이 없을 때
    if (galleryState.noticePosts.length === 0 && galleryState.regularPosts.length === 0) {
        galleryGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color: #6c757d;">
                <h3 style="margin-bottom: 10px;">There are no registered galleries.</h3>
            </div>
        `;
        return;
    }

    let html = "";

    // 1️⃣ 공지 (페이지 상관없이 항상 표시)
    if (galleryState.noticePosts.length > 0) {
        galleryState.noticePosts.forEach((post) => {
            html += createGalleryCard(post, true);
        });
    }

    // 2️⃣ 일반 게시물 (페이징)
    const start = (galleryState.currentPage - 1) * galleryState.pageSize;
    const end = start + galleryState.pageSize;
    const pageRegularPosts = galleryState.regularPosts.slice(start, end);

    pageRegularPosts.forEach((post) => {
        html += createGalleryCard(post, false);
    });

    galleryGrid.innerHTML = html;
}

/* --------------------------------------------------
갤러리 카드 생성
-------------------------------------------------- */
function createGalleryCard(post, isNotice) {
    const imageUrl = post.image_url || "/assets/img/news/default.jpg";
    const title = escapeHtml(post.title || "제목 없음");
    const views = post.views || 0;
    const date = post.created_at ? post.created_at.substring(0, 10) : "-";

    const noticeBadge = isNotice ? '<div class="sn-notice-badge">공지</div>' : "";
    const noticeClass = isNotice ? "sn-card-notice" : "";

    return `
        <div class="sn-card ${noticeClass}" data-post-id="${post.id}">
            ${
                galleryState.isAdmin
                    ? `
                <label class="sn-admin-checkbox-wrap">
                    <input type="checkbox" class="admin-checkbox" data-id="${post.id}">
                </label>
            `
                    : ""
            }

            ${noticeBadge}

            <div class="sn-img">
                <img src="${imageUrl}" alt="${title}" loading="lazy">
            </div>

            <div class="sn-content">
                <h3>${title}</h3>
                <div class="sn-meta-box">
                    <div class="sn-meta">
                        <span class="sn-views">👁 ${views}</span>
                        <span class="sn-date">${date}</span>
                    </div>
                    <a href="/skin/gallery/detail.html?id=${galleryState.galleryId}&post=${
        post.id
    }" class="sn-link">more →</a>
                </div>
            </div>
        </div>
    `;
}

/* --------------------------------------------------
페이지네이션 렌더링
-------------------------------------------------- */
function renderPagination() {
    const pagination = document.querySelector(".sn-pagination");
    if (!pagination) return;

    const totalPages = Math.max(Math.ceil(galleryState.regularPosts.length / galleryState.pageSize), 1);

    pagination.innerHTML = "";

    // 일반 게시글이 없으면 페이지네이션 숨김
    if (galleryState.regularPosts.length === 0) {
        return;
    }

    let paginationHTML = "";

    // 페이지 그룹 계산 (10개씩)
    const pagesPerGroup = 10;
    const currentGroup = Math.ceil(galleryState.currentPage / pagesPerGroup);
    const totalGroups = Math.ceil(totalPages / pagesPerGroup);

    const startPage = (currentGroup - 1) * pagesPerGroup + 1;
    const endPage = Math.min(currentGroup * pagesPerGroup, totalPages);

    // 이전 그룹 버튼
    if (totalGroups > 1 && currentGroup > 1) {
        const prevGroupLastPage = (currentGroup - 1) * pagesPerGroup;
        paginationHTML += `
            <button class="sn-page-btn" data-page="${prevGroupLastPage}">&lt;</button>
        `;
    }

    // 페이지 번호 버튼
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === galleryState.currentPage;
        paginationHTML += `
            <button class="sn-page-btn${isActive ? " active" : ""}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    // 다음 그룹 버튼
    if (totalGroups > 1 && currentGroup < totalGroups) {
        const nextGroupFirstPage = currentGroup * pagesPerGroup + 1;
        paginationHTML += `
            <button class="sn-page-btn" data-page="${nextGroupFirstPage}">&gt;</button>
        `;
    }

    pagination.innerHTML = paginationHTML;
}

/* --------------------------------------------------
관리자 버튼 설정
-------------------------------------------------- */
function setupAdminButtons() {
    const btnWrite = document.getElementById("btnWrite");
    const btnDeleteSelected = document.getElementById("btnDeleteSelected");
    const btnDeleteAll = document.getElementById("btnDeleteAll");

    if (btnWrite) {
        btnWrite.onclick = () => {
            window.location.href = `/skin/gallery/write.html?id=${galleryState.galleryId}`;
        };
    }

    if (btnDeleteSelected) {
        btnDeleteSelected.onclick = handleDeleteSelected;
    }

    if (btnDeleteAll) {
        btnDeleteAll.onclick = handleDeleteAll;
    }
}

/* --------------------------------------------------
이벤트 위임
-------------------------------------------------- */
function setupEventDelegation() {
    document.addEventListener("click", (e) => {
        // 카드 클릭
        const card = e.target.closest(".sn-card");
        const link = e.target.closest(".sn-link");
        const checkbox = e.target.closest(".admin-checkbox");

        if (card && !link && !checkbox) {
            const postId = card.dataset.postId;
            if (postId) {
                window.location.href = `/skin/gallery/detail.html?id=${galleryState.galleryId}&post=${postId}`;
            }
        }

        // 페이지네이션 클릭
        if (e.target.matches(".sn-page-btn") && !e.target.disabled) {
            const page = parseInt(e.target.dataset.page, 10);
            if (page) changePage(page);
        }

        // 체크박스 클릭
        if (e.target.matches(".admin-checkbox")) {
            e.stopPropagation();
            updateSelectedCount();
        }
    });
}

/* --------------------------------------------------
선택 삭제
-------------------------------------------------- */
async function handleDeleteSelected() {
    const selectedCheckboxes = document.querySelectorAll(".admin-checkbox:checked");

    if (selectedCheckboxes.length === 0) {
        alert("삭제할 갤러리를 선택해주세요.");
        return;
    }

    if (confirm(`선택한 ${selectedCheckboxes.length}개의 갤러리를 삭제하시겠습니까?`)) {
        try {
            const selectedIds = Array.from(selectedCheckboxes).map((cb) => parseInt(cb.dataset.id, 10));

            const {error} = await supabaseClient.from("gallery").delete().in("id", selectedIds);

            if (error) throw error;

            alert(`${selectedIds.length}개의 갤러리가 삭제되었습니다.`);

            galleryState.currentPage = 1;
            await loadGalleryPosts();
            renderGalleryGrid();
            renderPagination();
        } catch (error) {
            console.error("❌ 삭제 실패:", error);
            alert("갤러리 삭제에 실패했습니다.");
        }
    }
}

/* --------------------------------------------------
전체 삭제
-------------------------------------------------- */
async function handleDeleteAll() {
    if (confirm("이 갤러리의 모든 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        try {
            const {error} = await supabaseClient.from("gallery").delete().eq("gallery_id", galleryState.galleryId);

            if (error) throw error;

            alert("모든 갤러리가 삭제되었습니다.");

            galleryState.currentPage = 1;
            await loadGalleryPosts();
            renderGalleryGrid();
            renderPagination();
        } catch (error) {
            console.error("❌ 전체 삭제 실패:", error);
            alert("갤러리 삭제에 실패했습니다.");
        }
    }
}

/* --------------------------------------------------
페이지 변경
-------------------------------------------------- */
function changePage(page) {
    const totalPages = Math.max(Math.ceil(galleryState.regularPosts.length / galleryState.pageSize), 1);

    if (page < 1 || page > totalPages) return;

    galleryState.currentPage = page;
    renderGalleryGrid();
    renderPagination();

    window.scrollTo({top: 0, behavior: "smooth"});
}

/* --------------------------------------------------
선택 개수 업데이트
-------------------------------------------------- */
function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll(".admin-checkbox:checked");
    const count = selectedCheckboxes.length;

    const deleteBtn = document.getElementById("btnDeleteSelected");
    if (deleteBtn) {
        deleteBtn.textContent = count > 0 ? `선택삭제 (${count})` : "선택삭제";
    }
}

/* --------------------------------------------------
에러 표시
-------------------------------------------------- */
function showError(message) {
    const galleryGrid = document.querySelector(".sn-grid");
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color: #dc3545;">
                <h3 style="margin-bottom: 10px;">오류 발생</h3>
                <p>${escapeHtml(message)}</p>
                <a href="/skin/gallery/list.html?id=${
                    galleryState.galleryId
                }" style="color: #007bff; margin-top: 20px; display: inline-block;">새로고침</a>
            </div>
        `;
    }
}

/* --------------------------------------------------
유틸리티 함수
-------------------------------------------------- */
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
