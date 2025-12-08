/*
======================================================
Board Write/Edit
- appReady 이벤트 기준으로 초기화
- 관리자만 접근
- 글쓰기 + 수정 + 파일 업로드 유지
======================================================
*/

let editor;
let boardState = {
    isAdmin: false,
    isLoading: false,
    editId: null,
    uploadedFiles: [],
    existingFiles: [],
    fileCounter: 0,
    currentUserId: null,
    boardId: null,
};

let boardWriteInitialized = false;

/* --------------------------------------------------
appReady 기준 초기화
-------------------------------------------------- */
document.addEventListener("appReady", () => {
    if (boardWriteInitialized) return;
    boardWriteInitialized = true;

    if (!window.supabaseClient) {
        alert("데이터베이스 연결에 실패했습니다.");
        return;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initBoardWrite);
    } else {
        initBoardWrite();
    }
});

/* --------------------------------------------------
메인 초기화
-------------------------------------------------- */
async function initBoardWrite() {
    try {
        console.log("⚡ 보드 글쓰기 초기화 시작");

        const params = new URLSearchParams(window.location.search);
        boardState.boardId = Number(params.get("id"));
        boardState.editId = params.get("post");

        if (!boardState.boardId) {
            alert("잘못된 게시판 경로입니다.");
            window.location.href = "/skin/board/list.html";
            return;
        }

        // 사용자 권한 + 에디터 초기화 병렬 처리
        const [authResult] = await Promise.all([checkUserPermission(), initEditorAsync()]);

        if (!authResult.isAdmin) {
            alert("관리자만 접근할 수 있습니다.");
            window.location.href = `/skin/board/list.html?id=${boardState.boardId}`;
            return;
        }

        boardState.isAdmin = true;
        boardState.currentUserId = authResult.userId;

        // UI
        ensureDefaultRows();
        setupEventListeners();

        // 수정 모드
        if (boardState.editId) {
            const titleEl = document.querySelector(".sub-hero__title");
            if (titleEl) titleEl.innerText = "BOARD_EDIT";
            const submitBtn = document.getElementById("btnSubmit");
            if (submitBtn) submitBtn.innerText = "수정완료";

            await loadEditData();
        }

        console.log("✅ 보드 글쓰기 초기화 완료");
    } catch (err) {
        console.error("❌ 초기화 실패:", err);
        alert("초기화 실패: " + err.message);
    }
}

/* --------------------------------------------------
사용자 권한 체크
-------------------------------------------------- */
async function checkUserPermission() {
    try {
        const {data: sessionData, error: sessionError} = await supabaseClient.auth.getSession();

        if (sessionError || !sessionData?.session?.user) {
            throw new Error("로그인이 필요합니다.");
        }

        const userId = sessionData.session.user.id;

        const {data: profile} = await supabaseClient.from("profiles").select("role").eq("id", userId).maybeSingle();

        return {
            isAdmin: profile?.role === "admin",
            userId: userId,
        };
    } catch (err) {
        throw new Error("권한 확인 실패: " + err.message);
    }
}

/* --------------------------------------------------
에디터 초기화
-------------------------------------------------- */
async function initEditorAsync() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkEditor = () => {
            if (typeof SUNEDITOR !== "undefined") {
                try {
                    editor = SUNEDITOR.create("editorContent", {
                        height: 350,
                        lang: SUNEDITOR_LANG["ko"],
                        buttonList: [
                            ["undo", "redo"],
                            ["formatBlock", "bold", "underline", "italic", "strike"],
                            ["fontColor", "align", "list", "table"],
                            ["image", "link"],
                        ],
                        placeholder: "내용을 입력해주세요...",
                    });
                    console.log("✅ 에디터 초기화 완료");
                    resolve();
                } catch (err) {
                    reject(new Error("에디터 생성 실패: " + err.message));
                }
            } else if (attempts >= 50) {
                reject(new Error("SUNEDITOR 로드 타임아웃"));
            } else {
                attempts++;
                setTimeout(checkEditor, 100);
            }
        };
        checkEditor();
    });
}

/* --------------------------------------------------
링크 행 생성
-------------------------------------------------- */
function createLinkRow(value = "") {
    return `
        <div class="multi-item">
            <input type="text" class="link-input" placeholder="https://..." value="${escapeHtml(value)}">
            <button type="button" class="multi-remove">삭제</button>
        </div>
    `;
}

/* --------------------------------------------------
파일 행 생성
-------------------------------------------------- */
function createFileRow(fileData = null) {
    const fileId = fileData?.id || `file_${Date.now()}_${++boardState.fileCounter}`;
    const fileName = fileData?.name || "파일을 선택하세요";

    return `
        <div class="multi-item" data-file-id="${fileId}">
            <div class="file-input-wrapper">
                <div class="file-name">${escapeHtml(fileName)}</div>
                <input type="file" class="file-input" data-file-id="${fileId}" accept="*" style="display: none;">
            </div>
            <button type="button" class="multi-remove" data-file-id="${fileId}">삭제</button>
            <div class="file-upload-progress"></div>
        </div>
    `;
}

/* --------------------------------------------------
기본 행 보장
-------------------------------------------------- */
function ensureDefaultRows() {
    const linkContainer = document.getElementById("linkContainer");
    const fileContainer = document.getElementById("fileContainer");

    if (linkContainer && linkContainer.children.length === 0) {
        linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
    }
    if (fileContainer && fileContainer.children.length === 0) {
        fileContainer.insertAdjacentHTML("beforeend", createFileRow());
    }
}

/* --------------------------------------------------
이벤트 리스너 설정
-------------------------------------------------- */
function setupEventListeners() {
    document.getElementById("btnAddLink")?.addEventListener("click", () => {
        document.getElementById("linkContainer").insertAdjacentHTML("beforeend", createLinkRow());
    });

    document.getElementById("btnAddFile")?.addEventListener("click", () => {
        document.getElementById("fileContainer").insertAdjacentHTML("beforeend", createFileRow());
    });

    document.getElementById("btnSubmit")?.addEventListener("click", handleSubmit);

    const cancelBtn = document.getElementById("btnCancel");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            if (!boardState.boardId) {
                history.back();
            } else {
                location.href = `/skin/board/list.html?id=${boardState.boardId}`;
            }
        });
    }

    document.addEventListener("click", handleGlobalClick);
    document.getElementById("fileContainer")?.addEventListener("change", handleFileContainerChange);
}

/* --------------------------------------------------
전역 클릭 핸들러
-------------------------------------------------- */
function handleGlobalClick(e) {
    if (e.target.classList.contains("multi-remove")) {
        const item = e.target.closest(".multi-item");
        if (!item) return;
        const fileId = item.dataset.fileId;

        boardState.uploadedFiles = boardState.uploadedFiles.filter((f) => f.id !== fileId);
        boardState.existingFiles = boardState.existingFiles.filter((f) => f.id !== fileId);

        item.remove();
    }

    if (e.target.classList.contains("file-name")) {
        const input = e.target.closest(".file-input-wrapper")?.querySelector(".file-input");
        if (input) input.click();
    }
}

/* --------------------------------------------------
파일 컨테이너 변경 핸들러
-------------------------------------------------- */
function handleFileContainerChange(e) {
    if (e.target.classList.contains("file-input")) {
        handleFileSelect(e.target);
    }
}

/* --------------------------------------------------
파일 선택 핸들러
-------------------------------------------------- */
async function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const fileItem = input.closest(".multi-item");
    const fileNameElement = fileItem.querySelector(".file-name");
    const progressElement = fileItem.querySelector(".file-upload-progress");

    fileNameElement.textContent = file.name;
    progressElement.textContent = "업로드 중...";
    progressElement.className = "file-upload-progress";

    try {
        const fileId =
            input.getAttribute("data-file-id") ||
            fileItem.getAttribute("data-file-id") ||
            `file_${Date.now()}_${++boardState.fileCounter}`;

        fileItem.setAttribute("data-file-id", fileId);
        input.setAttribute("data-file-id", fileId);

        const uploaded = await uploadFile(file, fileId);

        const existingIndex = boardState.uploadedFiles.findIndex((f) => f.id === fileId);
        if (existingIndex === -1) {
            boardState.uploadedFiles.push(uploaded);
        } else {
            boardState.uploadedFiles[existingIndex] = uploaded;
        }

        progressElement.textContent = "업로드 완료";
        progressElement.classList.add("file-success");
    } catch (err) {
        progressElement.textContent = "업로드 실패";
        progressElement.classList.add("file-error");
        input.value = "";
        fileNameElement.textContent = "파일을 선택하세요";
        alert("파일 업로드 실패: " + err.message);
    }
}

/* --------------------------------------------------
파일 업로드
-------------------------------------------------- */
async function uploadFile(file, fileId) {
    const ext = file.name.split(".").pop();
    const ts = Date.now();
    const safeName = `file_${ts}_${fileId}.${ext}`;
    const filePath = `board-files/${safeName}`;

    const {error} = await supabaseClient.storage.from("post-files").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
    });

    if (error) throw new Error(error.message);

    const {data: urlData} = supabaseClient.storage.from("post-files").getPublicUrl(filePath);

    return {
        id: fileId,
        name: file.name,
        path: filePath,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
        safeName,
    };
}

/* --------------------------------------------------
수정 데이터 로드
-------------------------------------------------- */
async function loadEditData() {
    if (!boardState.editId) return;

    console.log("📥 수정 데이터 로딩 시작");

    try {
        const {data: post, error} = await supabaseClient
        .from("posts")
        .select("*")
        .eq("id", boardState.editId)
        .maybeSingle();

        if (error || !post) {
            alert("게시글을 불러올 수 없습니다.");
            window.location.href = `/skin/board/list.html?id=${boardState.boardId}`;
            return;
        }

        document.getElementById("title").value = post.title || "";
        document.getElementById("notice").checked = !!post.notice;

        if (editor) {
            editor.setContents(post.content || "");
        }

        const linkContainer = document.getElementById("linkContainer");
        linkContainer.innerHTML = "";

        if (post.links?.length > 0) {
            post.links.forEach((url) => {
                linkContainer.insertAdjacentHTML("beforeend", createLinkRow(url));
            });
        } else {
            linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
        }

        const fileContainer = document.getElementById("fileContainer");
        fileContainer.innerHTML = "";
        boardState.existingFiles = [];

        if (post.files?.length > 0) {
            post.files.forEach((fileInfo, index) => {
                const fileId = `existing_${index}_${Date.now()}`;
                boardState.existingFiles.push({
                    ...fileInfo,
                    id: fileId,
                    keep: true,
                });
                fileContainer.insertAdjacentHTML(
                    "beforeend",
                    createFileRow({
                        id: fileId,
                        name: fileInfo.name,
                    })
                );
            });
        } else {
            fileContainer.insertAdjacentHTML("beforeend", createFileRow());
        }

        console.log("✅ 수정 데이터 로딩 완료");
    } catch (err) {
        console.error("❌ 수정 데이터 로드 실패:", err);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

/* --------------------------------------------------
제출 핸들러
-------------------------------------------------- */
async function handleSubmit() {
    if (boardState.isLoading) return;

    boardState.isLoading = true;

    try {
        const title = document.getElementById("title").value.trim();
        const content = editor ? editor.getContents() : "";
        const notice = document.getElementById("notice")?.checked ?? false;

        if (!title) {
            alert("제목을 입력하세요.");
            boardState.isLoading = false;
            return;
        }

        if (!content || content.trim() === "<p><br></p>") {
            alert("내용을 입력하세요.");
            boardState.isLoading = false;
            return;
        }

        const links = [...document.querySelectorAll(".link-input")].map((input) => input.value.trim()).filter(Boolean);

        let finalFiles = [];
        const fileItems = document.querySelectorAll("#fileContainer .multi-item");

        fileItems.forEach((item) => {
            const fileId = item.dataset.fileId;
            const uploaded = boardState.uploadedFiles.find((f) => f.id === fileId);
            const existing = boardState.existingFiles.find((f) => f.id === fileId);

            if (uploaded) {
                finalFiles.push(uploaded);
            } else if (existing) {
                finalFiles.push(existing);
            }
        });

        const payload = {
            board_id: boardState.boardId,
            title: escapeHtml(title),
            content,
            links,
            files: finalFiles,
            notice,
            author_id: boardState.currentUserId,
            updated_at: new Date().toISOString(),
        };

        if (!boardState.editId) {
            payload.created_at = new Date().toISOString();
            payload.views = 0;
        }

        let supaResult;

        if (boardState.editId) {
            supaResult = await supabaseClient.from("posts").update(payload).eq("id", boardState.editId);
        } else {
            supaResult = await supabaseClient.from("posts").insert(payload);
        }

        if (supaResult.error) throw supaResult.error;

        alert(boardState.editId ? "게시글이 수정되었습니다." : "게시글이 작성되었습니다.");
        window.location.href = `/skin/board/list.html?id=${boardState.boardId}`;
    } catch (error) {
        console.error("❌ 저장 실패:", error);
        alert("저장 실패: " + error.message);
    } finally {
        boardState.isLoading = false;
    }
}

/* --------------------------------------------------
HTML 이스케이프
-------------------------------------------------- */
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
