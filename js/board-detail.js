/*
======================================================
Board Detail - OPTIMIZED VERSION
- 병렬 처리로 로딩 속도 개선
- 불필요한 대기 시간 제거
- 즉시 렌더링 우선
======================================================
*/

(function () {
    let initialized = false;

    async function runDetail() {
        if (initialized) return;
        initialized = true;

        const titleEl = document.querySelector(".post-title");
        const authorEl = document.querySelector(".author");
        const dateEl = document.querySelector(".date");
        const viewsEl = document.querySelector(".views");
        const contentEl = document.querySelector(".post-content");
        const extraArea = document.getElementById("extraArea");
        const noticeIndicator = document.getElementById("noticeIndicator");
        const adminActions = document.getElementById("adminActions");
        const backBtn = document.getElementById("backToList");

        // 간단한 로딩 표시
        contentEl.innerHTML = `<div class="Looking_box"><div class="loading-spinner-alt"></div></div>`;

        const params = new URLSearchParams(window.location.search);
        const boardId = Number(params.get("id"));
        const postId = Number(params.get("post"));

        // 유효성 검사
        if (!boardId || !postId) {
            titleEl.innerText = "잘못된 접근입니다.";
            contentEl.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    게시판 또는 게시글 ID가 없습니다.<br><br>
                    <a href="/skin/board/list.html" style="color:#0073ff;">목록으로</a>
                </div>`;
            return;
        }

        if (backBtn) backBtn.href = `/skin/board/list.html?id=${boardId}`;

        try {
            // 🚀 병렬 처리: 게시글 로드 + 관리자 체크 동시 실행
            const [postResult, authResult] = await Promise.all([
                // 게시글 데이터 로드
                supabaseClient.from("posts").select("*").eq("id", postId).single(),

                // 관리자 체크
                (async () => {
                    try {
                        const {data: sessionData} = await supabaseClient.auth.getSession();
                        const currentUser = sessionData?.session?.user || null;

                        if (!currentUser) return {isAdmin: false, user: null};

                        const {data: profile} = await supabaseClient
                        .from("profiles")
                        .select("role")
                        .eq("id", currentUser.id)
                        .maybeSingle();

                        return {
                            isAdmin: profile?.role === "admin",
                            user: currentUser,
                        };
                    } catch {
                        return {isAdmin: false, user: null};
                    }
                })(),
            ]);

            const {data: post, error} = postResult;
            const {isAdmin} = authResult;

            // 게시글 없음 처리
            if (error || !post || post.board_id !== boardId) {
                titleEl.innerText = "게시글을 찾을 수 없습니다.";
                contentEl.innerHTML = `
                    <div style="text-align:center;padding:40px;">
                        요청한 게시글이 존재하지 않거나 삭제되었습니다.<br>
                        <a href="/skin/board/list.html?id=${boardId}" style="color:#0073ff;">목록으로</a>
                    </div>`;
                return;
            }

            // 🎯 즉시 렌더링 (작성자 정보 나중에 로드)
            titleEl.innerText = post.title || "제목 없음";

            if (post.notice && noticeIndicator) {
                noticeIndicator.innerHTML = `<span class="notice-badge">공지</span>`;
            }

            if (dateEl) {
                dateEl.textContent = post.created_at ? new Date(post.created_at).toLocaleDateString("ko-KR") : "-";
            }

            if (viewsEl) {
                viewsEl.textContent = `Views ${post.views || 0}`;
            }

            // 컨텐츠 즉시 표시
            contentEl.innerHTML = post.content || "<p>내용이 없습니다.</p>";

            // 관리자 버튼 표시
            if (isAdmin && adminActions) {
                adminActions.classList.add("show");
                setupAdminActions(boardId, postId);
            }

            // 🚀 병렬 처리: 작성자 정보 + 조회수 업데이트 + 첨부파일 렌더링
            Promise.all([
                // 작성자 정보 로드 (비동기)
                loadAuthorInfo(post.author_id).then((name) => {
                    if (authorEl) authorEl.textContent = name;
                }),

                // 조회수 업데이트 (비동기)
                updateViewCount(postId, post.views, viewsEl),

                // 첨부파일/링크 렌더링 (동기)
                renderExtras(post, extraArea),
            ]).catch((err) => {
                console.error("후속 작업 오류:", err);
            });
        } catch (err) {
            console.error("상세 페이지 오류:", err);
            contentEl.innerHTML = `
                <div style="text-align:center;padding:40px;color:red;">
                    게시글을 불러오는 중 오류가 발생했습니다.<br>
                    <small>${err.message}</small>
                </div>`;
        }
    }

    /* --------------------------------------------------
    작성자 정보 로드 (비동기)
    -------------------------------------------------- */
    async function loadAuthorInfo(authorId) {
        if (!authorId) return "Admin";

        try {
            const {data: profile} = await supabaseClient
            .from("profiles")
            .select("username, email")
            .eq("id", authorId)
            .maybeSingle();

            if (profile) {
                return profile.username || profile.email?.split("@")[0] || "Admin";
            }
        } catch (err) {
            console.error("작성자 정보 로드 실패:", err);
        }

        return "Admin";
    }

    /* --------------------------------------------------
    조회수 업데이트 (비동기)
    -------------------------------------------------- */
    async function updateViewCount(postId, currentViews, viewsEl) {
        try {
            const newViews = (currentViews || 0) + 1;

            const {error} = await supabaseClient.from("posts").update({views: newViews}).eq("id", postId);

            if (!error && viewsEl) {
                viewsEl.textContent = `Views ${newViews}`;
            }
        } catch (err) {
            console.error("조회수 업데이트 실패:", err);
        }
    }

    /* --------------------------------------------------
    첨부파일/링크 렌더링
    -------------------------------------------------- */
    function renderExtras(post, extraArea) {
        if (!extraArea) return;

        extraArea.innerHTML = "";
        extraArea.style.display = "block";

        const links = Array.isArray(post.links) ? post.links.filter(Boolean) : [];
        const files = Array.isArray(post.files) ? post.files.filter((f) => f && f.url) : [];

        // 링크 렌더링
        if (links.length > 0) {
            const block = document.createElement("div");
            block.className = "extra-block";
            block.innerHTML = `<div class="extra-title">관련 링크</div><div class="extra-list"></div>`;
            const list = block.querySelector(".extra-list");

            links.forEach((url) => {
                const a = document.createElement("a");
                a.href = url.startsWith("http") ? url : "https://" + url;
                a.innerText = url.length > 50 ? url.slice(0, 50) + "..." : url;
                a.target = "_blank";
                list.appendChild(a);
            });

            extraArea.appendChild(block);
        }

        // 파일 렌더링
        if (files.length > 0) {
            const block = document.createElement("div");
            block.className = "extra-block";
            block.innerHTML = `<div class="extra-title">첨부 파일</div><div class="extra-list"></div>`;
            const list = block.querySelector(".extra-list");

            files.forEach((fileInfo, index) => {
                const fileUrl = fileInfo.url;
                const fileName = fileInfo.name || fileInfo.path?.split("/").pop() || `파일_${index + 1}`;

                const link = document.createElement("a");
                link.href = "#";
                link.innerHTML = `
                    <svg class="file-icon" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z"/>
                    </svg>
                    ${fileName}
                `;

                link.onclick = async (e) => {
                    e.preventDefault();
                    try {
                        const response = await fetch(fileUrl);
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);

                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName.replace(/[\\/:*?"<>|]/g, "_");
                        a.click();
                        URL.revokeObjectURL(url);
                    } catch (err) {
                        alert("다운로드 실패: " + err.message);
                    }
                };

                list.appendChild(link);
            });

            extraArea.appendChild(block);
        }

        // 둘 다 없으면 숨김
        if (links.length === 0 && files.length === 0) {
            extraArea.style.display = "none";
        }
    }

    /* --------------------------------------------------
    관리자 액션 설정
    -------------------------------------------------- */
    function setupAdminActions(boardId, postId) {
        const adminActions = document.getElementById("adminActions");
        if (!adminActions) return;

        const editBtn = adminActions.querySelector(".edit-btn");
        const deleteBtn = adminActions.querySelector(".delete-btn");

        if (editBtn) {
            editBtn.onclick = () => {
                window.location.href = `/skin/board/write.html?id=${boardId}&post=${postId}`;
            };
        }

        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (!confirm("정말 삭제하시겠습니까?")) return;

                const {error} = await supabaseClient.from("posts").delete().eq("id", postId);

                if (error) {
                    alert("삭제 실패");
                } else {
                    alert("삭제 완료");
                    window.location.href = `/skin/board/list.html?id=${boardId}`;
                }
            };
        }
    }

    /* --------------------------------------------------
    초기화
    -------------------------------------------------- */
    function initWhenReady() {
        // Supabase 대기
        if (!window.supabaseClient) {
            const check = () => {
                if (window.supabaseClient) {
                    runDetail();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        } else {
            runDetail();
        }
    }

    // 즉시 실행
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWhenReady);
    } else {
        initWhenReady();
    }
})();
