/* ======================================================
 Gallery Write / Edit - Final Stable Version
  - 링크·파일 UI 게시판 동일
  - 파일 개수 제한 제거
  - 수정 모드에서도 파일/링크 완전 유지
====================================================== */

let editor;
let editorReady = false;

const galleryState = {
    isAdmin: false,
    isLoading: false,
    editId: null,
    fileCounter: 0,
    currentUserId: null,
    galleryId: null,
};

/* ---------------- 초기 실행 ---------------- */
(function init() {
    const wait = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(wait);
            initGalleryWrite();
        }
    }, 50);
})();

/* ---------------- 메인 초기화 ---------------- */
async function initGalleryWrite() {
    const params = new URLSearchParams(location.search);
    galleryState.galleryId = Number(params.get("id"));
    galleryState.editId = params.get("post");

    if (!galleryState.galleryId) {
        alert("잘못된 접근입니다.");
        location.href = "/";
        return;
    }

    setupEventListeners();
    ensureDefaultRows();

    // 권한 + 에디터 병렬
    const [auth] = await Promise.all([checkUserPermission(), initEditorAsync()]);

    if (!auth.isAdmin) {
        alert("관리자만 접근 가능합니다.");
        location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
        return;
    }

    galleryState.isAdmin = true;
    galleryState.currentUserId = auth.userId;

    // 수정 모드
    if (galleryState.editId) {
        const titleEl = document.querySelector(".sub-hero__title");
        const submitBtn = document.getElementById("btnSubmit");
        if (titleEl) titleEl.textContent = "갤러리 수정";
        if (submitBtn) submitBtn.textContent = "수정 완료";

        await waitForEditor();
        await loadEditData();
    }
}

/* ---------------- 권한 확인 ---------------- */
async function checkUserPermission() {
    const {data} = await supabaseClient.auth.getSession();
    if (!data?.session?.user) return {isAdmin: false};

    const uid = data.session.user.id;
    const {data: profile} = await supabaseClient.from("profiles").select("role").eq("id", uid).maybeSingle();

    return {isAdmin: profile?.role === "admin", userId: uid};
}

/* ---------------- SunEditor ---------------- */
async function initEditorAsync() {
    return new Promise((resolve) => {
        let chk = 0;
        const load = setInterval(() => {
            if (typeof SUNEDITOR !== "undefined") {
                editor = SUNEDITOR.create("editorContent", {
                    height: 350,
                    lang: SUNEDITOR_LANG["ko"],
                    buttonList: [
                        ["undo", "redo"],
                        ["bold", "underline", "italic", "strike"],
                        ["align", "list", "fontColor", "table"],
                        ["image", "link"],
                    ],
                    placeholder: "갤러리 내용을 입력하세요...",
                });
                editorReady = true;
                clearInterval(load);
                resolve();
            }
            if (chk++ > 40) {
                // 4초 타임아웃
                clearInterval(load);
                resolve();
            }
        }, 100);
    });
}

function waitForEditor() {
    return new Promise((resolve) => {
        let chk = 0;
        const t = setInterval(() => {
            if (editorReady) {
                clearInterval(t);
                resolve();
            }
            if (chk++ > 50) {
                clearInterval(t);
                resolve();
            }
        }, 100);
    });
}

/* ---------------- 이벤트 ---------------- */
function setupEventListeners() {
    const thumbInput = document.getElementById("thumbnail");
    const thumbRemove = document.getElementById("btnRemoveThumbnail");
    const thumbPreview = document.getElementById("thumbnailPreview");

    thumbInput?.addEventListener("change", handleThumbnailSelect);
    thumbRemove?.addEventListener("click", removeThumbnail);
    // 썸네일 박스 클릭 → 파일 선택
    thumbPreview?.addEventListener("click", () => thumbInput?.click());

    const btnAddLink = document.getElementById("btnAddLink");
    const btnAddFile = document.getElementById("btnAddFile");

    btnAddLink?.addEventListener("click", () => {
        const linkContainer = document.getElementById("linkContainer");
        linkContainer?.insertAdjacentHTML("beforeend", createLinkRow());
    });

    btnAddFile?.addEventListener("click", () => {
        const fileContainer = document.getElementById("fileContainer");
        fileContainer?.insertAdjacentHTML("beforeend", createFileRow());
    });

    document.getElementById("btnSubmit")?.addEventListener("click", handleSubmit);

    // 삭제 / 파일 이름 클릭
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("multi-remove")) {
            e.target.closest(".multi-item")?.remove();
        }
        if (e.target.classList.contains("file-name")) {
            const wrap = e.target.closest(".file-row");
            wrap?.querySelector(".file-input")?.click();
        }
    });

    // 파일 선택
    document.getElementById("fileContainer")?.addEventListener("change", (e) => {
        if (e.target.classList.contains("file-input")) handleFileSelect(e);
    });
}

/* ---------------- 기본행 보장 ---------------- */
function ensureDefaultRows() {
    const linkContainer = document.getElementById("linkContainer");
    const fileContainer = document.getElementById("fileContainer");

    if (linkContainer && !linkContainer.children.length) {
        linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
    }
    if (fileContainer && !fileContainer.children.length) {
        fileContainer.insertAdjacentHTML("beforeend", createFileRow());
    }
}

/* ======================================================
🔹 링크 / 파일 UI
====================================================== */

function createLinkRow(value = "") {
    return `
    <div class="multi-item link-row">
        <input type="text" class="link-input" placeholder="https://" value="${escapeHtml(value)}">
        <button type="button" class="multi-remove btn-remove-link">삭제</button>
    </div>`;
}

/**
 * file: { id, name, url, size }
 */
function createFileRow(file = null) {
    const id = file?.id || `file_${Date.now()}_${++galleryState.fileCounter}`;
    const name = file?.name || "첨부파일 선택";
    const url = file?.url || "";
    const size = file?.size || "";

    return `
    <div class="multi-item file-row"
         data-file-id="${id}"
         data-file-url="${escapeHtml(url)}"
         data-file-name="${escapeHtml(name)}"
         data-file-size="${size}">
        <div class="file-name" data-file-id="${id}">${escapeHtml(name)}</div>
        <input type="file" class="file-input" data-file-id="${id}" style="display:none;">
        <button type="button" class="multi-remove btn-remove-file" data-file-id="${id}">삭제</button>
        <div class="file-upload-progress"></div>
    </div>`;
}

/* ======================================================
썸네일 처리
====================================================== */
async function handleThumbnailSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.");
        e.target.value = "";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert("썸네일은 10MB 이하만 가능합니다.");
        e.target.value = "";
        return;
    }

    const ext = file.name.split(".").pop();
    const name = `thumb_${Date.now()}.${ext}`;
    const path = `gallery-thumbnails/${name}`;

    const {error} = await supabaseClient.storage
    .from("gallery-files")
    .upload(path, file, {cacheControl: "3600", upsert: false});

    if (error) {
        alert("썸네일 업로드 실패: " + error.message);
        return;
    }

    const {data} = supabaseClient.storage.from("gallery-files").getPublicUrl(path);
    const url = data.publicUrl;

    const img = document.getElementById("thumbnailImage");
    const ph = document.getElementById("thumbnailPlaceholder");
    const hidden = document.getElementById("thumbnail_url");
    const btnRemove = document.getElementById("btnRemoveThumbnail");

    if (img && ph && hidden && btnRemove) {
        img.src = url;
        img.style.display = "block";
        ph.style.display = "none";
        hidden.value = url;
        btnRemove.style.display = "inline-block";
    }
}

function removeThumbnail() {
    const img = document.getElementById("thumbnailImage");
    const ph = document.getElementById("thumbnailPlaceholder");
    const hidden = document.getElementById("thumbnail_url");
    const btnRemove = document.getElementById("btnRemoveThumbnail");

    if (img) {
        img.src = "";
        img.style.display = "none";
    }
    if (ph) ph.style.display = "flex";
    if (hidden) hidden.value = "";
    if (btnRemove) btnRemove.style.display = "none";
}

/* ======================================================
파일 업로드 (data-*에 직접 저장)
====================================================== */
async function handleFileSelect(e) {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;

    const wrap = input.closest(".file-row");
    if (!wrap) return;

    const nameEl = wrap.querySelector(".file-name");
    const prog = wrap.querySelector(".file-upload-progress");

    if (nameEl) nameEl.textContent = file.name;
    if (prog) {
        prog.textContent = "Uploading...";
        prog.classList.remove("file-success", "file-error");
    }

    const ext = file.name.split(".").pop();
    const id = input.dataset.fileId || wrap.dataset.fileId;
    const name = `file_${Date.now()}_${id}.${ext}`;
    const path = `gallery-files/${name}`;

    const {error} = await supabaseClient.storage
    .from("gallery-files")
    .upload(path, file, {cacheControl: "3600", upsert: false});

    if (error) {
        if (prog) {
            prog.textContent = "Error";
            prog.classList.add("file-error");
        }
        alert("파일 업로드 실패: " + error.message);
        return;
    }

    const {data} = supabaseClient.storage.from("gallery-files").getPublicUrl(path);
    const url = data.publicUrl;

    // ✅ 이 행에 파일 정보 직접 저장 (상태 배열 필요 없음)
    wrap.dataset.fileUrl = url;
    wrap.dataset.fileName = file.name;
    wrap.dataset.fileSize = String(file.size);

    if (prog) {
        prog.textContent = "완료";
        prog.classList.add("file-success");
    }
}

/* ======================================================
수정모드 데이터 로드
====================================================== */
async function loadEditData() {
    const {data: post, error} = await supabaseClient
    .from("gallery")
    .select("*")
    .eq("id", galleryState.editId)
    .maybeSingle();

    if (error || !post) {
        alert("갤러리를 찾을 수 없습니다.");
        location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
        return;
    }

    const titleEl = document.getElementById("title");
    const noticeEl = document.getElementById("notice");
    const thumbImg = document.getElementById("thumbnailImage");
    const thumbPh = document.getElementById("thumbnailPlaceholder");
    const thumbHidden = document.getElementById("thumbnail_url");
    const thumbRemoveBtn = document.getElementById("btnRemoveThumbnail");
    const linkContainer = document.getElementById("linkContainer");
    const fileContainer = document.getElementById("fileContainer");

    if (titleEl) titleEl.value = post.title || "";
    if (noticeEl) noticeEl.checked = !!post.notice;
    if (editorReady && editor) editor.setContents(post.description || "");

    if (post.image_url && thumbImg && thumbPh && thumbHidden && thumbRemoveBtn) {
        thumbImg.src = post.image_url;
        thumbImg.style.display = "block";
        thumbPh.style.display = "none";
        thumbHidden.value = post.image_url;
        thumbRemoveBtn.style.display = "inline-block";
    }

    // 링크 로드 (문자열/JSON/배열 모두 처리)
    if (linkContainer) {
        linkContainer.innerHTML = "";
        const links = normalize(post.links);
        if (links.length) {
            links.forEach((url) => {
                linkContainer.insertAdjacentHTML("beforeend", createLinkRow(url));
            });
        } else {
            linkContainer.insertAdjacentHTML("beforeend", createLinkRow());
        }
    }

    // 파일 로드 (문자열/JSON/배열 → 통일 구조)
    if (fileContainer) {
        fileContainer.innerHTML = "";
        const files = normalize(post.files).map((f, idx) => {
            if (typeof f === "string") {
                return {id: `ex_${idx}`, url: f, name: `파일_${idx + 1}`, size: ""};
            }
            return {
                id: `ex_${idx}`,
                url: f.url || f.path || "",
                name: f.name || `파일_${idx + 1}`,
                size: f.size || "",
            };
        });

        if (files.length) {
            files.forEach((f) => {
                fileContainer.insertAdjacentHTML("beforeend", createFileRow(f));
            });
        } else {
            fileContainer.insertAdjacentHTML("beforeend", createFileRow());
        }
    }
}

/* ======================================================
저장
====================================================== */
async function handleSubmit() {
    if (galleryState.isLoading) return;
    galleryState.isLoading = true;

    try {
        const titleEl = document.getElementById("title");
        const noticeEl = document.getElementById("notice");
        const thumbHidden = document.getElementById("thumbnail_url");

        const titleTxt = titleEl?.value.trim() || "";
        const desc = editor?.getContents() || "";
        const thumb = thumbHidden?.value.trim() || "";

        if (!titleTxt) {
            alert("제목을 입력하세요.");
            titleEl?.focus();
            galleryState.isLoading = false;
            return;
        }
        if (!thumb) {
            alert("썸네일을 업로드하세요.");
            galleryState.isLoading = false;
            return;
        }
        if (!desc || desc === "<p><br></p>") {
            alert("내용을 입력하세요.");
            editor?.focus();
            galleryState.isLoading = false;
            return;
        }

        // 링크 수집
        const links = Array.from(document.querySelectorAll(".link-input"))
        .map((el) => el.value.trim())
        .filter((v) => v);

        // 파일 수집: DOM data-* 기반 (개수 제한 없음)
        const files = Array.from(document.querySelectorAll("#fileContainer .file-row"))
        .map((row, idx) => {
            const url = row.dataset.fileUrl;
            const name = row.dataset.fileName || row.querySelector(".file-name")?.textContent?.trim();
            const size = row.dataset.fileSize;

            if (!url) return null;
            return {
                url,
                name: name || `파일_${idx + 1}`,
                size: size ? Number(size) : null,
            };
        })
        .filter(Boolean);

        const payload = {
            gallery_id: galleryState.galleryId,
            title: titleTxt,
            description: desc,
            image_url: thumb,
            notice: !!(noticeEl && noticeEl.checked),
            links,
            files,
            author_id: galleryState.currentUserId,
            updated_at: new Date().toISOString(),
        };

        let result;
        if (galleryState.editId) {
            result = await supabaseClient.from("gallery").update(payload).eq("id", galleryState.editId);
        } else {
            payload.created_at = new Date().toISOString();
            payload.views = 0;
            result = await supabaseClient.from("gallery").insert(payload);
        }

        if (result.error) {
            console.error(result.error);
            alert("저장 실패: " + result.error.message);
        } else {
            alert(galleryState.editId ? "수정이 완료되었습니다." : "등록이 완료되었습니다.");
            location.href = `/skin/gallery/list.html?id=${galleryState.galleryId}`;
        }
    } catch (err) {
        console.error(err);
        alert("저장 중 오류 발생: " + err.message);
    } finally {
        galleryState.isLoading = false;
    }
}

/* -------------------------------------------------- */
function escapeHtml(txt) {
    if (!txt) return "";
    const div = document.createElement("div");
    div.textContent = txt;
    return div.innerHTML;
}

// 문자열 / JSON / 배열 모두 배열로 변환
function normalize(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        // JSON 문자열 가능성 체크
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [value];
        }
    }
    return [value];
}
