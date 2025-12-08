/*
======================================================
Gallery Detail - ULTRA OPTIMIZED VERSION
- 즉시 렌더링 우선
- 최소한의 대기 시간
- 병렬 처리 극대화
======================================================
*/

(function () {
    let initialized = false;

    async function runDetail() {
        if (initialized) return;
        initialized = true;

        // DOM 요소 캐싱
        const elements = {
            title: document.querySelector(".gallery-detail-title"),
            author: document.querySelector(".author"),
            date: document.querySelector(".date"),
            views: document.querySelector(".views"),
            content: document.querySelector(".gallery-detail-content"),
            extra: document.getElementById("extraArea"),
            notice: document.getElementById("noticeIndicator"),
            admin: document.getElementById("adminActions"),
        };

        // 최소한의 로딩 표시
        if (elements.content) {
            elements.content.innerHTML = `<div class="Looking_box"><div class="loading-spinner-alt"></div></div>`;
        }

        // URL 파라미터 파싱
        const params = new URLSearchParams(window.location.search);
        const galleryId = Number(params.get("id"));
        const postId = Number(params.get("post"));

        // 빠른 유효성 검사
        if (!galleryId || !postId) {
            if (elements.title) elements.title.innerText = "잘못된 접근";
            if (elements.content) {
                elements.content.innerHTML = `
                    <div style="text-align:center;padding:40px;">
                        잘못된 경로입니다.<br><br>
                        <a href="/" style="color:#0073ff;">홈으로</a>
                    </div>`;
            }
            return;
        }

        try {
            // 🚀 즉시 데이터 로드 (관리자 체크는 나중에)
            const {data: post, error} = await supabaseClient
            .from("gallery")
            .select("*")
            .eq("id", postId)
            .eq("gallery_id", galleryId)
            .single();

            if (error || !post) {
                if (elements.title) elements.title.innerText = "갤러리를 찾을 수 없습니다";
                if (elements.content) {
                    elements.content.innerHTML = `
                        <div style="text-align:center;padding:40px;">
                            존재하지 않거나 삭제된 갤러리입니다.<br>
                            <a href="/skin/gallery/list.html?id=${galleryId}" style="color:#0073ff;">목록으로</a>
                        </div>`;
                }
                return;
            }

            // 🎯 핵심 정보 즉시 렌더링 (최우선)
            if (elements.title) elements.title.innerText = post.title || "제목 없음";
            if (elements.date)
                elements.date.textContent = post.created_at
                    ? new Date(post.created_at).toLocaleDateString("ko-KR")
                    : "-";
            if (elements.views) elements.views.textContent = `Views ${post.views || 0}`;
            if (elements.content) elements.content.innerHTML = post.description || "<p>내용이 없습니다.</p>";

            // 공지 뱃지 (있으면)
            if (post.notice && elements.notice) {
                elements.notice.innerHTML = `<span class="notice-badge">공지</span>`;
            }

            // 🚀 나머지 작업은 모두 백그라운드에서 비동기 처리
            Promise.all([
                // 1. 관리자 체크 + 버튼 설정
                checkAndSetupAdmin(galleryId, postId, elements.admin),

                // 2. 작성자 정보 (덜 중요)
                loadAuthor(post.author_id, elements.author),

                // 3. 조회수 업데이트 (사용자에게 안보임)
                incrementViews(postId, post.views, elements.views),

                // 4. 첨부파일/링크 (있으면)
                renderExtras(post, elements.extra),
            ]).catch((err) => {
                console.error("백그라운드 작업 오류:", err);
            });
        } catch (err) {
            console.error("로딩 오류:", err);
            if (elements.content) {
                elements.content.innerHTML = `
                    <div style="text-align:center;padding:40px;color:red;">
                        오류가 발생했습니다.<br>
                        <small>${err.message}</small>
                    </div>`;
            }
        }
    }

    /* --------------------------------------------------
    관리자 체크 및 버튼 설정 (통합)
    -------------------------------------------------- */
    async function checkAndSetupAdmin(galleryId, postId, adminEl) {
        if (!adminEl) return;

        try {
            const {data: sessionData} = await supabaseClient.auth.getSession();
            if (!sessionData?.session?.user) return;

            const {data: profile} = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", sessionData.session.user.id)
            .maybeSingle();

            if (profile?.role !== "admin") return;

            // 관리자면 버튼 표시
            adminEl.classList.add("show");

            // 이벤트 바로 설정
            const editBtn = adminEl.querySelector(".edit-btn");
            const deleteBtn = adminEl.querySelector(".delete-btn");

            if (editBtn) {
                editBtn.onclick = () => {
                    window.location.href = `/skin/gallery/write.html?id=${galleryId}&post=${postId}`;
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (!confirm("정말 삭제하시겠습니까?")) return;

                    try {
                        const {error} = await supabaseClient.from("gallery").delete().eq("id", postId);

                        if (error) {
                            alert("삭제 실패");
                        } else {
                            alert("삭제 완료");
                            window.location.href = `/skin/gallery/list.html?id=${galleryId}`;
                        }
                    } catch (err) {
                        alert("삭제 중 오류 발생");
                    }
                };
            }
        } catch (err) {
            console.error("관리자 체크 실패:", err);
        }
    }

    /* --------------------------------------------------
    작성자 정보 로드
    -------------------------------------------------- */
    async function loadAuthor(authorId, authorEl) {
        if (!authorEl || !authorId) {
            if (authorEl) authorEl.textContent = "Admin";
            return;
        }

        try {
            const {data: profile} = await supabaseClient
            .from("profiles")
            .select("username, email")
            .eq("id", authorId)
            .maybeSingle();

            if (profile) {
                authorEl.textContent = profile.username || profile.email?.split("@")[0] || "Admin";
            } else {
                authorEl.textContent = "Admin";
            }
        } catch (err) {
            authorEl.textContent = "Admin";
        }
    }

    /* --------------------------------------------------
    조회수 증가
    -------------------------------------------------- */
    async function incrementViews(postId, currentViews, viewsEl) {
        try {
            const newViews = (currentViews || 0) + 1;

            const {error} = await supabaseClient.from("gallery").update({views: newViews}).eq("id", postId);

            if (!error && viewsEl) {
                viewsEl.textContent = `Views ${newViews}`;
            }
        } catch (err) {
            console.error("조회수 업데이트 실패:", err);
        }
    }

    /* --------------------------------------------------
    첨부파일/링크 렌더링 (최적화)
    -------------------------------------------------- */
    function renderExtras(post, extraArea) {
        if (!extraArea) return Promise.resolve();

        return new Promise((resolve) => {
            extraArea.innerHTML = "";

            // 링크 필터링
            const links = Array.isArray(post.links)
                ? post.links.filter((link) => link && typeof link === "string" && link.trim())
                : [];

            // 파일 필터링
            const files = Array.isArray(post.files)
                ? post.files.filter((file) => {
                      if (!file) return false;
                      if (typeof file === "string") return file.trim();
                      if (typeof file === "object") return file.url || file.path;
                      return false;
                  })
                : [];

            // 아무것도 없으면 숨기고 종료
            if (links.length === 0 && files.length === 0) {
                extraArea.style.display = "none";
                resolve();
                return;
            }

            extraArea.style.display = "block";
            const fragment = document.createDocumentFragment();

            // 링크 블록
            if (links.length > 0) {
                const linkBlock = createLinkBlock(links);
                fragment.appendChild(linkBlock);
            }

            // 파일 블록
            if (files.length > 0) {
                const fileBlock = createFileBlock(files);
                fragment.appendChild(fileBlock);
            }

            extraArea.appendChild(fragment);
            resolve();
        });
    }

    /* --------------------------------------------------
    링크 블록 생성 (DOM 최적화)
    -------------------------------------------------- */
    function createLinkBlock(links) {
        const block = document.createElement("div");
        block.className = "extra-block";

        const title = document.createElement("div");
        title.className = "extra-title";
        title.textContent = `관련 링크 (${links.length})`;

        const list = document.createElement("div");
        list.className = "extra-list";

        links.forEach((url) => {
            const a = document.createElement("a");
            a.href = url.startsWith("http") ? url : "https://" + url;
            a.textContent = url.length > 50 ? url.slice(0, 50) + "..." : url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "extra-link";
            a.title = url;
            list.appendChild(a);
        });

        block.appendChild(title);
        block.appendChild(list);
        return block;
    }

    /* --------------------------------------------------
    파일 블록 생성 (DOM 최적화)
    -------------------------------------------------- */
    function createFileBlock(files) {
        const block = document.createElement("div");
        block.className = "extra-block";

        const title = document.createElement("div");
        title.className = "extra-title";
        title.textContent = `첨부 파일 (${files.length})`;

        const list = document.createElement("div");
        list.className = "extra-list";

        files.forEach((fileInfo, index) => {
            // 파일 정보 정규화
            const file =
                typeof fileInfo === "string"
                    ? {url: fileInfo, name: `파일_${index + 1}`, size: null}
                    : {
                          url: fileInfo.url || fileInfo.path || "",
                          name: fileInfo.name || `파일_${index + 1}`,
                          size: fileInfo.size || null,
                      };

            if (!file.url) return;

            const link = document.createElement("a");
            link.href = "#";
            link.className = "extra-link file-download-link";
            link.title = `${file.name} 다운로드`;

            // 파일 아이콘 + 이름
            link.innerHTML = `
                <svg class="file-icon" viewBox="0 0 24 24" style="width:16px;height:16px;margin-right:8px;">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" fill="currentColor"/>
                </svg>
                ${file.name}
            `;

            // 파일 크기 (있으면)
            if (file.size) {
                const sizeKB = Math.round(file.size / 1024);
                const sizeMB = Math.round(sizeKB / 1024);
                const sizeText = sizeMB > 0 ? `${sizeMB}MB` : `${sizeKB}KB`;

                const span = document.createElement("span");
                span.style.cssText = "font-size:12px;color:#6c757d;margin-left:8px;";
                span.textContent = `(${sizeText})`;
                link.appendChild(span);
            }

            // 다운로드 이벤트
            link.onclick = async (e) => {
                e.preventDefault();

                try {
                    link.style.opacity = "0.6";

                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement("a");
                    a.href = url;
                    a.download = file.name.replace(/[\\/:*?"<>|]/g, "_");
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    URL.revokeObjectURL(url);
                    link.style.opacity = "1";
                } catch (err) {
                    link.style.opacity = "1";
                    alert("다운로드 실패: " + err.message);
                }
            };

            list.appendChild(link);
        });

        block.appendChild(title);
        block.appendChild(list);
        return block;
    }

    /* --------------------------------------------------
    초기화 (즉시 실행)
    -------------------------------------------------- */
    (function init() {
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
    })();
})();
