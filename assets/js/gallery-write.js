/*
======================================================
Gallery Write/Edit - FIXED VERSION
- 수정 데이터 로딩 버그 수정
- 에디터 준비 대기 로직 개선
======================================================
*/

let editor;
let editorReady = false; // 에디터 준비 상태 플래그
let galleryState = {
    isAdmin: false,
    isLoading: false,
    editId: null,
    uploadedThumbnail: null,
    uploadedFiles: [],
    existingFiles: [],
    fileCounter: 0,
    currentUserId: null,
    galleryId: null,
};

/* --------------------------------------------------
즉시 초기화
-------------------------------------------------- */
(function init() {
    if (!window.supabaseClient) {
        let attempts = 0;
        const check = () => {
            if (window.supabaseClient || attempts++ > 20) {
                initGalleryWrite();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    } else {
        initGalleryWrite();
    }
})();

/* --------------------------------------------------
메인 초기화
-------------------------------------------------- */
async function initGalleryWrite() {
    try {
        console.log("⚡ 초기화 시작");

        // URL 파라미터 파싱
        const params = new URLSearchParams(window.location.search);
        galleryState.galleryId = Number(params.get("id"));
        galleryState.editId = params.get("post");

        console.log("📋 파라미터:", {
            galleryId: galleryState.galleryId,
            editId: galleryState.editId,
        });

        if (!galleryState.galleryId) {
            alert("잘못된 경로입니다.");
            window.location.href = "/";
            return;
        }

        // UI 먼저 설정
        setupEventListeners();
        ensureDefaultRows();

        // 병렬 처리
        const [authResult] = await Promise.all([checkUserPermission(), initEditorAsync()]);

        if (!authResult.isAdmin) {
            alert("관리자만 접근할 수 있습니다.");
            window.location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
            return;
        }

        galleryState.isAdmin = true;
        galleryState.currentUserId = authResult.userId;

        // 수정 모드
        if (galleryState.editId) {
            const title = document.querySelector(".sub-hero__title");
            const btn = document.getElementById("btnSubmit");
            if (title) title.innerText = "갤러리 수정";
            if (btn) btn.innerText = "수정 완료";

            console.log("📝 수정 모드 - 데이터 로딩 시작");

            // 🔥 에디터 준비 대기 후 데이터 로드
            await waitForEditor();
            await loadEditData();
        }

        console.log("✅ 초기화 완료");
    } catch (error) {
        console.error("❌ 초기화 실패:", error);
        alert("초기화 실패: " + error.message);
    }
}

/* --------------------------------------------------
사용자 권한 체크
-------------------------------------------------- */
async function checkUserPermission() {
    const {data: sessionData} = await supabaseClient.auth.getSession();

    if (!sessionData?.session?.user) {
        throw new Error("로그인이 필요합니다.");
    }

    const userId = sessionData.session.user.id;
    const {data: profile} = await supabaseClient.from("profiles").select("role").eq("id", userId).maybeSingle();

    return {
        isAdmin: profile?.role === "admin",
        userId: userId,
    };
}

/* --------------------------------------------------
에디터 초기화
-------------------------------------------------- */
async function initEditorAsync() {
    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            if (typeof SUNEDITOR !== "undefined") {
                try {
                    editor = SUNEDITOR.create("editorContent", {
                        height: 300,
                        lang: SUNEDITOR_LANG["ko"],
                        buttonList: [
                            ["undo", "redo"],
                            ["formatBlock", "bold", "underline", "italic", "strike"],
                            ["fontColor", "align", "list", "table"],
                            ["image", "link"],
                        ],
                        placeholder: "갤러리에 대한 설명을 입력하세요...",
                    });
                    editorReady = true;
                    console.log("✅ 에디터 초기화 완료");
                    resolve();
                } catch (err) {
                    console.error("에디터 생성 실패:", err);
                    editorReady = false;
                    resolve();
                }
            } else if (attempts++ < 50) {
                // 5초 대기
                setTimeout(check, 100);
            } else {
                console.warn("SUNEDITOR 로드 실패");
                editorReady = false;
                resolve();
            }
        };
        check();
    });
}

/* --------------------------------------------------
에디터 준비 대기 (수정 모드용)
-------------------------------------------------- */
async function waitForEditor() {
    if (editorReady && editor) {
        console.log("✅ 에디터 준비됨");
        return Promise.resolve();
    }

    console.log("⏳ 에디터 대기 중...");

    return new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
            if (editorReady && editor) {
                console.log("✅ 에디터 준비 완료");
                resolve();
            } else if (attempts++ < 50) {
                setTimeout(check, 100);
            } else {
                console.warn("⚠️ 에디터 대기 타임아웃");
                resolve();
            }
        };
        check();
    });
}

/* --------------------------------------------------
이벤트 리스너 설정
-------------------------------------------------- */
function setupEventListeners() {
    // 썸네일
    const thumbnailInput = document.getElementById("thumbnail");
    thumbnailInput?.addEventListener("change", handleThumbnailSelect);

    const removeBtn = document.getElementById("btnRemoveThumbnail");
    removeBtn?.addEventListener("click", removeThumbnail);

    const thumbnailPreview = document.getElementById("thumbnailPreview");
    thumbnailPreview?.addEventListener("click", () => thumbnailInput?.click());

    // 추가 버튼
    document.getElementById("btnAddLink")?.addEventListener("click", () => {
        document.getElementById("linkContainer").insertAdjacentHTML("beforeend", createLinkRow());
    });

    document.getElementById("btnAddFile")?.addEventListener("click", () => {
        document.getElementById("fileContainer").insertAdjacentHTML("beforeend", createFileRow());
    });

    // 제출
    document.getElementById("btnSubmit")?.addEventListener("click", handleSubmit);

    // 위임 이벤트
    document.addEventListener("click", handleGlobalClick);
    document.getElementById("fileContainer")?.addEventListener("change", handleFileContainerChange);
}

/* --------------------------------------------------
기본 행 보장
-------------------------------------------------- */
function ensureDefaultRows() {
    const linkContainer = document.getElementById("linkContainer");
    const fileContainer = document.getElementById("fileContainer");

    if (linkContainer?.children.length === 0) {
        linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
    }
    if (fileContainer?.children.length === 0) {
        fileContainer.insertAdjacentHTML("beforeend", createFileRow());
    }
}

/* --------------------------------------------------
행 생성 함수들
-------------------------------------------------- */
function createLinkRow(value = "") {
    return `
        <div class="multi-item">
            <input type="text" class="link-input" placeholder="https://..." value="${escapeHtml(value)}">
            <button type="button" class="multi-remove">삭제</button>
        </div>
    `;
}

function createFileRow(fileData = null) {
    const fileId = fileData?.id || `file_${Date.now()}_${++galleryState.fileCounter}`;
    const fileName = fileData?.name || "파일을 선택하세요";

    return `
        <div class="multi-item" data-file-id="${fileId}">
            <div class="file-input-wrapper">
                <div class="file-name">${escapeHtml(fileName)}</div>
                <input type="file" class="file-input" data-file-id="${fileId}" accept="*" style="display:none;">
            </div>
            <button type="button" class="multi-remove" data-file-id="${fileId}">삭제</button>
            <div class="file-upload-progress"></div>
        </div>
    `;
}

/* --------------------------------------------------
전역 클릭 핸들러
-------------------------------------------------- */
function handleGlobalClick(e) {
    // 삭제
    if (e.target.classList.contains("multi-remove")) {
        const item = e.target.closest(".multi-item");
        const fileId = item?.dataset.fileId;

        if (fileId) {
            galleryState.uploadedFiles = galleryState.uploadedFiles.filter((f) => f.id !== fileId);
            galleryState.existingFiles = galleryState.existingFiles.filter((f) => f.id !== fileId);
        }
        item?.remove();
    }

    // 파일명 클릭
    if (e.target.classList.contains("file-name")) {
        e.preventDefault();
        e.stopPropagation();
        e.target.closest(".file-input-wrapper")?.querySelector(".file-input")?.click();
    }
}

function handleFileContainerChange(e) {
    if (e.target.classList.contains("file-input")) {
        handleFileSelect(e);
    }
}

/* --------------------------------------------------
썸네일 핸들러
-------------------------------------------------- */
async function handleThumbnailSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        if (!file.type.startsWith("image/")) {
            throw new Error("이미지 파일만 업로드 가능합니다.");
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error("썸네일은 10MB 이하만 가능합니다.");
        }

        const uploaded = await uploadThumbnail(file);
        galleryState.uploadedThumbnail = uploaded;

        updateThumbnailPreview(uploaded.url);
        document.getElementById("thumbnail_url").value = uploaded.url;
        document.getElementById("btnRemoveThumbnail").style.display = "inline-block";
    } catch (error) {
        alert("썸네일 업로드 실패: " + error.message);
        event.target.value = "";
    }
}

async function uploadThumbnail(file) {
    const ext = file.name.split(".").pop();
    const name = `thumbnail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `gallery-thumbnails/${name}`;

    const {error} = await supabaseClient.storage
    .from("gallery-files")
    .upload(path, file, {cacheControl: "3600", upsert: false});

    if (error) throw new Error(error.message);

    const {data} = supabaseClient.storage.from("gallery-files").getPublicUrl(path);

    return {
        name: file.name,
        path: path,
        url: data.publicUrl,
        size: file.size,
        type: file.type,
        safeName: name,
    };
}

function updateThumbnailPreview(url) {
    const img = document.getElementById("thumbnailImage");
    const placeholder = document.getElementById("thumbnailPlaceholder");

    if (img && placeholder) {
        img.src = url;
        img.style.display = "block";
        placeholder.style.display = "none";
    }
}

function removeThumbnail() {
    const img = document.getElementById("thumbnailImage");
    const placeholder = document.getElementById("thumbnailPlaceholder");

    if (img) {
        img.style.display = "none";
        img.src = "";
    }
    if (placeholder) {
        placeholder.style.display = "flex";
    }

    document.getElementById("thumbnail").value = "";
    document.getElementById("thumbnail_url").value = "";
    document.getElementById("btnRemoveThumbnail").style.display = "none";
    galleryState.uploadedThumbnail = null;
}

/* --------------------------------------------------
파일 핸들러
-------------------------------------------------- */
async function handleFileSelect(event) {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;

    const fileItem = input.closest(".multi-item");
    const nameEl = fileItem?.querySelector(".file-name");
    const progressEl = fileItem?.querySelector(".file-upload-progress");

    if (!nameEl || !progressEl) return;

    nameEl.textContent = file.name;
    progressEl.textContent = "업로드 중...";
    progressEl.className = "file-upload-progress";

    try {
        const fileId =
            input.dataset.fileId || fileItem.dataset.fileId || `file_${Date.now()}_${++galleryState.fileCounter}`;

        fileItem.setAttribute("data-file-id", fileId);
        input.setAttribute("data-file-id", fileId);

        const uploaded = await uploadFile(file, fileId);

        const idx = galleryState.uploadedFiles.findIndex((f) => f.id === fileId);
        if (idx === -1) {
            galleryState.uploadedFiles.push(uploaded);
        } else {
            galleryState.uploadedFiles[idx] = uploaded;
        }

        progressEl.textContent = "완료";
        progressEl.classList.add("file-success");
    } catch (err) {
        progressEl.textContent = "실패";
        progressEl.classList.add("file-error");
        input.value = "";
        nameEl.textContent = "파일을 선택하세요";
        alert("파일 업로드 실패: " + err.message);
    }
}

async function uploadFile(file, fileId) {
    if (file.size > 500 * 1024 * 1024) {
        throw new Error("파일은 500MB 이하만 가능합니다.");
    }

    const ext = file.name.split(".").pop();
    const name = `file_${Date.now()}_${fileId}.${ext}`;
    const path = `gallery-files/${name}`;

    const {error} = await supabaseClient.storage
    .from("gallery-files")
    .upload(path, file, {cacheControl: "3600", upsert: false});

    if (error) throw new Error(error.message);

    const {data} = supabaseClient.storage.from("gallery-files").getPublicUrl(path);

    return {
        id: fileId,
        name: file.name,
        path: path,
        url: data.publicUrl,
        size: file.size,
        type: file.type,
        safeName: name,
    };
}

/* --------------------------------------------------
수정 데이터 로드 (수정 버전)
-------------------------------------------------- */
async function loadEditData() {
    if (!galleryState.editId) {
        console.warn("⚠️ editId 없음");
        return;
    }

    console.log("📥 수정 데이터 로딩 시작", {
        editId: galleryState.editId,
        galleryId: galleryState.galleryId,
    });

    try {
        const {data: gallery, error} = await supabaseClient
        .from("gallery")
        .select("*")
        .eq("id", galleryState.editId)
        .maybeSingle();

        console.log("📦 DB 응답:", {gallery, error});

        if (error) {
            console.error("❌ DB 오류:", error);
            throw error;
        }

        if (!gallery) {
            console.error("❌ 갤러리 없음");
            alert("갤러리를 찾을 수 없습니다.");
            window.location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
            return;
        }

        // 🔥 gallery_id 확인 (선택사항)
        if (gallery.gallery_id !== galleryState.galleryId) {
            console.warn("⚠️ gallery_id 불일치", {
                expected: galleryState.galleryId,
                actual: gallery.gallery_id,
            });
        }

        console.log("✅ 갤러리 데이터:", gallery);

        // 🎯 데이터 렌더링
        const titleInput = document.getElementById("title");
        const noticeCheck = document.getElementById("notice");

        if (titleInput) {
            titleInput.value = gallery.title || "";
            console.log("📝 제목 설정:", titleInput.value);
        }

        if (noticeCheck) {
            noticeCheck.checked = !!gallery.notice;
            console.log("📌 공지 설정:", noticeCheck.checked);
        }

        // 에디터 (준비 확인)
        if (editor && editorReady) {
            editor.setContents(gallery.description || "");
            console.log("📄 내용 설정 완료");
        } else {
            console.warn("⚠️ 에디터 준비 안됨");
        }

        // 썸네일
        if (gallery.image_url) {
            updateThumbnailPreview(gallery.image_url);
            document.getElementById("thumbnail_url").value = gallery.image_url;
            document.getElementById("btnRemoveThumbnail").style.display = "inline-block";
            console.log("🖼️ 썸네일 설정:", gallery.image_url);
        }

        // 링크
        const linkContainer = document.getElementById("linkContainer");
        if (linkContainer) {
            linkContainer.innerHTML = "";

            if (gallery.links?.length > 0) {
                gallery.links.forEach((url) => {
                    if (url?.trim()) {
                        linkContainer.insertAdjacentHTML("beforeend", createLinkRow(url));
                    }
                });
                console.log("🔗 링크 설정:", gallery.links.length);
            } else {
                linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
            }
        }

        // 파일
        const fileContainer = document.getElementById("fileContainer");
        if (fileContainer) {
            fileContainer.innerHTML = "";
            galleryState.existingFiles = [];

            if (gallery.files?.length > 0) {
                gallery.files.forEach((fileInfo, index) => {
                    if (fileInfo?.name || fileInfo?.url) {
                        const fileId = `existing_${index}_${Date.now()}_${++galleryState.fileCounter}`;
                        galleryState.existingFiles.push({
                            ...fileInfo,
                            id: fileId,
                            keep: true,
                        });
                        fileContainer.insertAdjacentHTML(
                            "beforeend",
                            createFileRow({
                                id: fileId,
                                name: fileInfo.name || `파일_${index + 1}`,
                            })
                        );
                    }
                });
                console.log("📎 파일 설정:", gallery.files.length);
            } else {
                fileContainer.insertAdjacentHTML("beforeend", createFileRow());
            }
        }

        console.log("✅ 수정 데이터 로딩 완료");
    } catch (error) {
        console.error("❌ 로드 실패:", error);
        alert("데이터 로드 실패: " + error.message);
    }
}

/* --------------------------------------------------
제출 핸들러
-------------------------------------------------- */
async function handleSubmit() {
    if (galleryState.isLoading) return;

    galleryState.isLoading = true;

    try {
        const title = document.getElementById("title").value.trim();
        const notice = document.getElementById("notice").checked;
        const description = editor?.getContents() || "";
        const thumbnailUrl = document.getElementById("thumbnail_url").value.trim();

        // 유효성 검사
        if (!title) {
            alert("제목을 입력하세요.");
            document.getElementById("title").focus();
            return;
        }

        if (!thumbnailUrl) {
            alert("썸네일을 업로드하세요.");
            return;
        }

        if (!description || description.trim() === "<p><br></p>") {
            alert("내용을 입력하세요.");
            editor?.focus();
            return;
        }

        // 링크 수집
        const links = [...document.querySelectorAll(".link-input")].map((input) => input.value.trim()).filter(Boolean);

        // 파일 수집
        const finalFiles = [];
        document.querySelectorAll("#fileContainer .multi-item").forEach((item) => {
            const fileId = item.dataset.fileId;
            const uploaded = galleryState.uploadedFiles.find((f) => f.id === fileId);
            const existing = galleryState.existingFiles.find((f) => f.id === fileId);

            if (uploaded) finalFiles.push(uploaded);
            else if (existing) finalFiles.push(existing);
        });

        // 페이로드
        const payload = {
            gallery_id: galleryState.galleryId,
            title: escapeHtml(title),
            description: description,
            image_url: thumbnailUrl,
            notice: notice,
            links: links,
            files: finalFiles,
            author_id: galleryState.currentUserId,
            updated_at: new Date().toISOString(),
        };

        if (!galleryState.editId) {
            payload.created_at = new Date().toISOString();
            payload.views = 0;
        }

        console.log("💾 저장 페이로드:", payload);

        // DB 저장
        let result;
        if (galleryState.editId) {
            result = await supabaseClient.from("gallery").update(payload).eq("id", galleryState.editId);
        } else {
            result = await supabaseClient.from("gallery").insert(payload);
        }

        console.log("💾 저장 결과:", result);

        if (result.error) throw result.error;

        alert(galleryState.editId ? "수정 완료" : "등록 완료");
        window.location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
    } catch (error) {
        console.error("❌ 저장 실패:", error);
        alert("저장 실패: " + error.message);
    } finally {
        galleryState.isLoading = false;
    }
}

/* --------------------------------------------------
유틸리티
-------------------------------------------------- */
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
