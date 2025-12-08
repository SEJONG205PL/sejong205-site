// /admin/js/menu.core.js
console.log("🔥 menu.core.js loaded");

// ===========================
// 공통 상수 / 상태
// ===========================
let isLoading = false;

const MENU_TYPES = {
    STATIC: "static",
    BOARD: "board",
    GALLERY: "gallery",
    LINK: "link",
};

const depthText = {
    1: "중메뉴 추가",
    2: "소메뉴 추가",
    3: "",
};

// 게시판/갤러리 select 옵션 캐시
let boardOptions = [];
let galleryOptions = [];

// 삭제 예정 메뉴 id 모음
window.deletedMenuIds = window.deletedMenuIds || [];

// ===========================
// 유효성 검사
// ===========================
function validateMenuType(type, link) {
    switch (type) {
        case MENU_TYPES.STATIC:
            if (!link || (!link.startsWith("/") && !link.startsWith("#"))) {
                return {valid: false, message: "정적 메뉴 링크는 / 또는 # 로 시작해야 합니다."};
            }
            return {valid: true};

        case MENU_TYPES.BOARD:
        case MENU_TYPES.GALLERY:
            return {valid: true};

        case MENU_TYPES.LINK:
            if (!link || (!link.startsWith("http://") && !link.startsWith("https://"))) {
                return {valid: false, message: "외부 링크는 http:// 또는 https:// 로 시작해야 합니다."};
            }
            return {valid: true};

        default:
            return {valid: false, message: "유효하지 않은 메뉴 타입입니다."};
    }
}

// ===========================
// 링크 입력칸 상태 업데이트
// ===========================
function updateLinkFieldState(row, type) {
    const linkInput = row.querySelector(".link-input");
    if (!linkInput) return;

    if (type === MENU_TYPES.BOARD) {
        linkInput.disabled = true;
        linkInput.placeholder = "자동 생성 (/skin/board/list.html?id=ID)";
    } else if (type === MENU_TYPES.GALLERY) {
        linkInput.disabled = true;
        linkInput.placeholder = "자동 생성 (/skin/gallery/list.html?id=ID)";
    } else if (type === MENU_TYPES.STATIC) {
        linkInput.disabled = false;
        linkInput.placeholder = "/path 또는 #";
    } else if (type === MENU_TYPES.LINK) {
        linkInput.disabled = false;
        linkInput.placeholder = "https://example.com";
    } else {
        linkInput.disabled = false;
        linkInput.placeholder = "#";
    }
}

// ===========================
// connect-row 유틸
// ===========================
function getConnectRow(menuRow) {
    if (!menuRow) return null;
    const next = menuRow.nextElementSibling;
    return next && next.classList.contains("connect-row") ? next : null;
}

function resetConnectionRow(row) {
    const connectRow = getConnectRow(row);
    if (!connectRow) return;

    connectRow.style.display = "none";

    const boardBox = connectRow.querySelector(".board-connect");
    const galleryBox = connectRow.querySelector(".gallery-connect");
    const boardSelect = connectRow.querySelector(".board-existing-select");
    const gallerySelect = connectRow.querySelector(".gallery-existing-select");

    if (boardBox) boardBox.style.display = "none";
    if (galleryBox) galleryBox.style.display = "none";
    if (boardSelect) boardSelect.style.display = "none";
    if (gallerySelect) gallerySelect.style.display = "none";
}

// ===========================
// 게시판 / 갤러리 옵션 채우기
// ===========================
function populateBoardSelect(selectEl, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    const def = document.createElement("option");
    def.value = "";
    def.textContent = "게시판 선택";
    selectEl.appendChild(def);

    if (!boardOptions.length) {
        const no = document.createElement("option");
        no.value = "";
        no.textContent = "게시판 없음";
        no.disabled = true;
        selectEl.appendChild(no);
        return;
    }

    boardOptions.forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.board_id;
        opt.textContent = `${b.board_id} - ${b.title}`;
        if (selectedId && Number(selectedId) === Number(b.board_id)) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

function populateGallerySelect(selectEl, selectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    const def = document.createElement("option");
    def.value = "";
    def.textContent = "갤러리 선택";
    selectEl.appendChild(def);

    if (!galleryOptions.length) {
        const no = document.createElement("option");
        no.value = "";
        no.textContent = "갤러리 없음";
        no.disabled = true;
        selectEl.appendChild(no);
        return;
    }

    galleryOptions.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.gallery_id;
        opt.textContent = `${g.gallery_id} - ${g.title}`;
        if (selectedId && Number(selectedId) === Number(g.gallery_id)) opt.selected = true;
        selectEl.appendChild(opt);
    });
}

// ===========================
// 연결 모드 핸들러
// ===========================
function handleBoardModeChange(row) {
    const connectRow = getConnectRow(row);
    if (!connectRow) return;
    const select = connectRow.querySelector(".board-existing-select");
    const checked = connectRow.querySelector(".board-mode:checked");

    if (!select || !checked) return;

    if (checked.value === "existing") {
        select.style.display = "";
        populateBoardSelect(select, row.dataset.boardId || null);
    } else {
        select.style.display = "none";
    }
}

function handleGalleryModeChange(row) {
    const connectRow = getConnectRow(row);
    if (!connectRow) return;
    const select = connectRow.querySelector(".gallery-existing-select");
    const checked = connectRow.querySelector(".gallery-mode:checked");

    if (!select || !checked) return;

    if (checked.value === "existing") {
        select.style.display = "";
        populateGallerySelect(select, row.dataset.galleryId || null);
    } else {
        select.style.display = "none";
    }
}

// ===========================
// 타입에 따른 connect-row 표시
// ===========================
function syncConnectionRowVisibility(row, type) {
    const connectRow = getConnectRow(row);
    if (!connectRow) return;

    const boardBox = connectRow.querySelector(".board-connect");
    const galleryBox = connectRow.querySelector(".gallery-connect");

    if (!boardBox || !galleryBox) return;

    if (type === MENU_TYPES.BOARD) {
        connectRow.style.display = "table-row";
        boardBox.style.display = "block";
        galleryBox.style.display = "none";

        const select = connectRow.querySelector(".board-existing-select");
        populateBoardSelect(select, row.dataset.boardId || null);

        const hasBoard = !!row.dataset.boardId;
        const modeNew = connectRow.querySelector('.board-mode[value="new"]');
        const modeExisting = connectRow.querySelector('.board-mode[value="existing"]');
        if (hasBoard && modeExisting) modeExisting.checked = true;
        else if (modeNew) modeNew.checked = true;

        handleBoardModeChange(row);
    } else if (type === MENU_TYPES.GALLERY) {
        connectRow.style.display = "table-row";
        boardBox.style.display = "none";
        galleryBox.style.display = "block";

        const select = connectRow.querySelector(".gallery-existing-select");
        populateGallerySelect(select, row.dataset.galleryId || null);

        const hasGallery = !!row.dataset.galleryId;
        const modeNew = connectRow.querySelector('.gallery-mode[value="new"]');
        const modeExisting = connectRow.querySelector('.gallery-mode[value="existing"]');
        if (hasGallery && modeExisting) modeExisting.checked = true;
        else if (modeNew) modeNew.checked = true;

        handleGalleryModeChange(row);
    } else {
        resetConnectionRow(row);
    }
}

// ===========================
// order_num 계산
// ===========================
function calculateOrderNumber(allRows, currentRow) {
    const depth = Number(currentRow.dataset.depth) || 1;
    const rows = Array.from(allRows);
    const currentIndex = rows.indexOf(currentRow);

    let currentParentIndex = null;
    if (depth > 1) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            const prevDepth = Number(rows[i].dataset.depth);
            if (prevDepth < depth) {
                currentParentIndex = i;
                break;
            }
        }
    }

    let order = 0;
    for (let i = 0; i < currentIndex; i++) {
        const row = rows[i];
        const rowDepth = Number(row.dataset.depth) || 1;
        if (rowDepth !== depth) continue;

        let parentIndex = null;
        if (depth > 1) {
            for (let j = i - 1; j >= 0; j--) {
                const prevDepth = Number(rows[j].dataset.depth);
                if (prevDepth < depth) {
                    parentIndex = j;
                    break;
                }
            }
        }
        if (parentIndex === currentParentIndex) order++;
    }
    return order;
}

// ===========================
// menu-row + connect-row 생성
// ===========================
function createMenuRow(depth = 1) {
    const boardName = `boardMode_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const galleryName = `galleryMode_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return `
<tr class="menu-row depth-${depth}" data-depth="${depth}">
  <td style="position: relative;">
      <span class="depth-arrow"></span>
      <div class="menu-input-wrapper">
          <input type="text" class="menu-input" placeholder="메뉴명">
      </div>
  </td>
  <td><input type="text" class="link-input" placeholder="/경로 또는 #"></td>
  <td>
      <select class="type-select">
          <option value="${MENU_TYPES.STATIC}">정적</option>
          <option value="${MENU_TYPES.BOARD}">게시판</option>
          <option value="${MENU_TYPES.GALLERY}">갤러리</option>
          <option value="${MENU_TYPES.LINK}">외부링크</option>
      </select>
  </td>
  <td>
      <select class="target-select">
          <option value="_self">기본창</option>
          <option value="_blank">새창</option>
      </select>
  </td>
  <td><input type="checkbox" class="pc-check" checked></td>
  <td><input type="checkbox" class="mobile-check" checked></td>
  <td><input type="number" class="order-input" style="width:50px;" value="0" readonly></td>
  <td>
      <div class="btn-group">
          ${depth < 3 ? `<button class="child-btn row-btn" data-depth="${depth + 1}">${depthText[depth]}</button>` : ""}
          <button class="del-btn row-btn">삭제</button>
      </div>
  </td>
</tr>
<tr class="connect-row depth-${depth}" data-depth="${depth}" style="display:none;">
  <td colspan="8">
      <div class="connect-wrapper" style="padding:10px 16px; background:#f8f9fa; border-top:1px solid #e9ecef;">
          <div class="board-connect" style="display:none; margin-bottom:10px;">
              <div style="font-weight:600; margin-bottom:4px;">게시판 연결 방식</div>
              <label style="margin-right:12px;">
                  <input type="radio" class="board-mode" name="${boardName}" value="new" checked> 새 게시판 생성
              </label>
              <label>
                  <input type="radio" class="board-mode" name="${boardName}" value="existing"> 기존 게시판 연결
              </label>
              <div style="margin-top:6px;">
                  <select class="board-existing-select" style="min-width:260px; display:none;"></select>
              </div>
          </div>

          <div class="gallery-connect" style="display:none;">
              <div style="font-weight:600; margin-bottom:4px;">갤러리 연결 방식</div>
              <label style="margin-right:12px;">
                  <input type="radio" class="gallery-mode" name="${galleryName}" value="new" checked> 새 갤러리 생성
              </label>
              <label>
                  <input type="radio" class="gallery-mode" name="${galleryName}" value="existing"> 기존 갤러리 연결
              </label>
              <div style="margin-top:6px;">
                  <select class="gallery-existing-select" style="min-width:260px; display:none;"></select>
              </div>
          </div>
      </div>
  </td>
</tr>
`;
}

// ===========================
// 대메뉴 추가
// ===========================
function addMainMenu() {
    const tbody = document.getElementById("menuTableBody");
    if (!tbody) return;

    tbody.insertAdjacentHTML("beforeend", createMenuRow(1));

    const rows = Array.from(tbody.querySelectorAll(".menu-row"));
    const newRow = rows[rows.length - 1];

    updateOrderInputValues();

    const type = newRow.querySelector(".type-select").value;
    newRow.dataset.menuType = type;
    updateLinkFieldState(newRow, type);
    attachTypeChangeListener(newRow);
    attachConnectionModeListeners(newRow);
    resetConnectionRow(newRow);
}
window.addMainMenu = addMainMenu;

// ===========================
// order 입력값 동기화
// ===========================
function updateOrderInputValues() {
    const menuRows = Array.from(document.querySelectorAll(".menu-row"));
    const depthGroups = {1: [], 2: [], 3: []};

    menuRows.forEach((row) => {
        const depth = Number(row.dataset.depth) || 1;
        if (!depthGroups[depth]) depthGroups[depth] = [];
        depthGroups[depth].push(row);
    });

    Object.keys(depthGroups).forEach((d) => {
        depthGroups[d].forEach((row, idx) => {
            const input = row.querySelector(".order-input");
            if (input) input.value = idx;
        });
    });
}

// ===========================
// 타입 변경 리스너
// ===========================
function attachTypeChangeListener(row) {
    const typeSelect = row.querySelector(".type-select");
    if (!typeSelect) return;

    if (!row.dataset.menuType) {
        row.dataset.menuType = typeSelect.value;
    }

    typeSelect.addEventListener("change", (e) => {
        const newType = e.target.value;
        row.dataset.menuType = newType;
        updateLinkFieldState(row, newType);

        if (newType === MENU_TYPES.BOARD || newType === MENU_TYPES.GALLERY) {
            syncConnectionRowVisibility(row, newType);
        } else {
            resetConnectionRow(row);
        }
    });
}

// ===========================
// connect-row 라디오 리스너
// ===========================
function attachConnectionModeListeners(row) {
    const connectRow = getConnectRow(row);
    if (!connectRow) return;

    connectRow.querySelectorAll(".board-mode").forEach((r) => {
        r.addEventListener("change", () => handleBoardModeChange(row));
    });
    connectRow.querySelectorAll(".gallery-mode").forEach((r) => {
        r.addEventListener("change", () => handleGalleryModeChange(row));
    });
}

// ===========================
// 중메뉴 / 소메뉴 추가
// ===========================
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("child-btn")) return;

    const parentRow = e.target.closest("tr.menu-row");
    const targetDepth = Number(e.target.dataset.depth);

    const menuRows = Array.from(document.querySelectorAll(".menu-row"));
    const parentIndex = menuRows.indexOf(parentRow);

    let insertIndex = parentIndex;
    for (let i = parentIndex + 1; i < menuRows.length; i++) {
        const nextDepth = Number(menuRows[i].dataset.depth);
        if (nextDepth >= targetDepth) {
            insertIndex = i;
            continue;
        }
        break;
    }

    const refMenuRow = menuRows[insertIndex];
    const refConnectRow = getConnectRow(refMenuRow) || refMenuRow;

    refConnectRow.insertAdjacentHTML("afterend", createMenuRow(targetDepth));

    const tbody = document.getElementById("menuTableBody");
    const newMenuRows = Array.from(tbody.querySelectorAll(".menu-row"));
    const newRow = newMenuRows[newMenuRows.indexOf(refMenuRow) + 1];

    updateOrderInputValues();

    const type = newRow.querySelector(".type-select").value;
    newRow.dataset.menuType = type;
    updateLinkFieldState(newRow, type);
    attachTypeChangeListener(newRow);
    attachConnectionModeListeners(newRow);
    resetConnectionRow(newRow);
});

// ===========================
// 게시판/갤러리 ID 생성
// ===========================
async function generateUniqueId(kind) {
    try {
        const table = kind === "board" ? "board_list" : "gallery_list";
        const idField = kind === "board" ? "board_id" : "gallery_id";

        const {data, error} = await supabaseClient
        .from(table)
        .select(idField)
        .order(idField, {ascending: false})
        .limit(1);

        if (error) {
            console.error(`❌ ${table} 조회 실패:`, error);
            return null;
        }

        const maxId = data && data.length ? Number(data[0][idField]) || 0 : 0;
        return maxId + 1;
    } catch (e) {
        console.error("❌ generateUniqueId 예외:", e);
        return null;
    }
}
async function getNextBoardId() {
    return await generateUniqueId("board");
}
async function getNextGalleryId() {
    return await generateUniqueId("gallery");
}

// ===========================
// board_list / gallery_list 생성
// ===========================
async function createBoardList(boardId, menuName) {
    const insertData = {
        board_id: boardId,
        title: menuName,
        link: `/skin/board/list.html?id=${boardId}`,
        created_at: new Date().toISOString(),
    };
    const {data, error} = await supabaseClient.from("board_list").insert([insertData]).select().single();
    if (error) throw error;
    return data;
}

async function createGalleryList(galleryId, menuName) {
    const insertData = {
        gallery_id: galleryId,
        title: menuName,
        link: `/skin/gallery/list.html?id=${galleryId}`,
        created_at: new Date().toISOString(),
    };
    const {data, error} = await supabaseClient.from("gallery_list").insert([insertData]).select().single();
    if (error) throw error;
    return data;
}

// ===========================
// 게시판/갤러리 목록 로딩
// ===========================
async function loadBoardAndGalleryOptions() {
    try {
        if (!window.supabaseClient) return;

        const [boardRes, galleryRes] = await Promise.all([
            supabaseClient.from("board_list").select("board_id,title").order("board_id", {ascending: true}),
            supabaseClient.from("gallery_list").select("gallery_id,title").order("gallery_id", {ascending: true}),
        ]);

        if (boardRes.error) {
            console.error("❌ board_list 조회 실패:", boardRes.error);
            boardOptions = [];
        } else {
            boardOptions = boardRes.data || [];
        }

        if (galleryRes.error) {
            console.error("❌ gallery_list 조회 실패:", galleryRes.error);
            galleryOptions = [];
        } else {
            galleryOptions = galleryRes.data || [];
        }
    } catch (err) {
        console.error("❌ loadBoardAndGalleryOptions 오류:", err);
        boardOptions = [];
        galleryOptions = [];
    }
}

// ===========================
// 메뉴 불러오기
// ===========================
async function loadMenu() {
    try {
        const tbody = document.getElementById("menuTableBody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const {data, error} = await supabaseClient.from("menu_items").select("*");

        if (error) {
            console.error("❌ 메뉴 조회 실패:", error);
            showError("메뉴 조회 실패", [error.message]);
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;padding:40px;">
                        저장된 메뉴가 없습니다. 대메뉴를 추가하세요.
                    </td>
                </tr>`;
            return;
        }

        // id → node 매핑
        const map = {};
        data.forEach((item) => {
            map[item.id] = {...item, children: []};
        });

        // 트리 구성
        const roots = [];
        data.forEach((item) => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });

        // 정렬
        function sortNodes(list) {
            list.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
            list.forEach((n) => sortNodes(n.children));
        }
        sortNodes(roots);

        // 트리 → 순차 리스트
        const ordered = [];
        (function flat(list) {
            list.forEach((n) => {
                ordered.push(n);
                if (n.children.length > 0) flat(n.children);
            });
        })(roots);

        // UI 렌더링
        let html = "";
        ordered.forEach((node) => {
            html += createMenuRow(node.depth || 1);
        });
        tbody.innerHTML = html;

        const rows = tbody.querySelectorAll(".menu-row");
        ordered.forEach((item, index) => {
            const row = rows[index];
            const connectRow = getConnectRow(row);

            row.dataset.id = item.id;
            row.dataset.realId = item.id;
            row.dataset.depth = item.depth;
            row.dataset.menuType = item.type;

            // ✅ board_id, gallery_id를 명확하게 저장
            row.dataset.boardId = item.board_id ? String(item.board_id) : "";
            row.dataset.galleryId = item.gallery_id ? String(item.gallery_id) : "";

            row.querySelector(".menu-input").value = item.name || "";
            row.querySelector(".link-input").value = item.link || "";
            row.querySelector(".type-select").value = item.type || "static";
            row.querySelector(".target-select").value = item.target || "_self";
            row.querySelector(".pc-check").checked = item.pc_view ?? true;
            row.querySelector(".mobile-check").checked = item.mobile_view ?? true;
            row.querySelector(".order-input").value = item.order_num ?? 0;

            updateLinkFieldState(row, item.type);
            attachTypeChangeListener(row);
            attachConnectionModeListeners(row);

            // 저장 후 로딩 시 connect-row는 항상 닫기
            resetConnectionRow(row);
            if (connectRow) connectRow.dataset.depth = item.depth;
        });

        updateOrderInputValues();
    } catch (err) {
        console.error("❌ loadMenu 오류:", err);
        showError("메뉴 로드 오류", [err.message]);
    }
}

// ===========================
// 행 삭제
// ===========================
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("del-btn")) return;

    const row = e.target.closest("tr.menu-row");
    const depth = Number(row.dataset.depth);
    const menuName = row.querySelector(".menu-input").value || "이 메뉴";

    if (!confirm(`"${menuName}"와 하위 메뉴를 모두 삭제하시겠습니까?`)) return;

    const menuRows = Array.from(document.querySelectorAll(".menu-row"));
    const startIndex = menuRows.indexOf(row);

    function collectDeleteMenuId(targetRow) {
        const menuId = targetRow.dataset.id ? Number(targetRow.dataset.id) : null;
        if (menuId && menuId > 0) {
            window.deletedMenuIds.push(menuId);
        }
    }

    collectDeleteMenuId(row);
    const currentConnect = getConnectRow(row);
    if (currentConnect) currentConnect.remove();
    row.remove();

    for (let i = startIndex + 1; i < menuRows.length; i++) {
        const next = menuRows[i];
        const nextDepth = Number(next.dataset.depth);
        if (nextDepth > depth) {
            collectDeleteMenuId(next);
            const conn = getConnectRow(next);
            if (conn) conn.remove();
            next.remove();
        } else {
            break;
        }
    }

    window.deletedMenuIds = Array.from(new Set(window.deletedMenuIds));
    setTimeout(updateOrderInputValues, 100);
});

// ===========================
// 연결 모드 읽기 헬퍼
// ===========================
function getConnectionMode(connectRow, kind) {
    if (!connectRow) return {mode: "keep", selectedId: null};

    if (connectRow.style.display === "none") {
        return {mode: "keep", selectedId: null};
    }

    let mode = "keep";
    let selectedId = null;

    if (kind === "board") {
        const modeChecked = connectRow.querySelector(".board-mode:checked");
        const select = connectRow.querySelector(".board-existing-select");
        if (modeChecked) mode = modeChecked.value;
        if (select && select.value) selectedId = Number(select.value) || null;
    } else if (kind === "gallery") {
        const modeChecked = connectRow.querySelector(".gallery-mode:checked");
        const select = connectRow.querySelector(".gallery-existing-select");
        if (modeChecked) mode = modeChecked.value;
        if (select && select.value) selectedId = Number(select.value) || null;
    }

    return {mode, selectedId};
}

// ===========================
// 전체 저장 (saveAll)
// ===========================
async function saveAll() {
    console.log("💾 ========== saveAll 시작 ==========");

    try {
        if (!window.supabaseClient) {
            showError("저장 오류", ["Supabase 연결이 없습니다."]);
            return;
        }

        showLoading();
        updateProgress(10, "메뉴 데이터 준비 중...");

        const menuRows = Array.from(document.querySelectorAll("#menuTableBody .menu-row"));

        // 1) 삭제 처리
        let menuIds = Array.isArray(window.deletedMenuIds) ? window.deletedMenuIds : [];
        menuIds = Array.from(new Set(menuIds.map((v) => Number(v)).filter((v) => v > 0)));

        if (menuIds.length) {
            updateProgress(20, "삭제된 메뉴 반영 중...");
            await supabaseClient.from("menu_items").delete().in("id", menuIds);
            window.deletedMenuIds = [];
        }

        updateProgress(40, "메뉴 처리 중...");

        // 2) 모든 메뉴를 순차적으로 처리
        for (let i = 0; i < menuRows.length; i++) {
            // 진행률 업데이트 (40% ~ 90%)
            const progress = 40 + Math.floor((i / menuRows.length) * 50);
            updateProgress(progress, `메뉴 처리 중... (${i + 1}/${menuRows.length})`);

            const row = menuRows[i];
            const menuId = row.dataset.id ? Number(row.dataset.id) : null;
            const depth = Number(row.dataset.depth) || 1;
            const type = row.querySelector(".type-select").value;
            const name = row.querySelector(".menu-input").value.trim();
            const target = row.querySelector(".target-select").value || "_self";
            const pc_view = row.querySelector(".pc-check").checked ?? true;
            const mobile_view = row.querySelector(".mobile-check").checked ?? true;
            const order_num = calculateOrderNumber(menuRows, row);

            // parent_id 계산
            let parent_id = null;
            if (depth > 1) {
                for (let j = i - 1; j >= 0; j--) {
                    const prevDepth = Number(menuRows[j].dataset.depth);
                    if (prevDepth < depth) {
                        parent_id = Number(menuRows[j].dataset.realId || menuRows[j].dataset.id);
                        break;
                    }
                }
            }

            const connectRow = getConnectRow(row);
            let FINAL_BOARD_ID = null; // ✅ 완전히 다른 변수명
            let FINAL_GALLERY_ID = null; // ✅ 완전히 다른 변수명
            let link = row.querySelector(".link-input").value.trim() || "#";

            console.log(`\n📝 [${i}] 메뉴 처리:`, {
                menuId,
                name,
                type,
                depth,
                parent_id,
            });

            // 게시판 타입
            if (type === MENU_TYPES.BOARD) {
                const {mode, selectedId} = getConnectionMode(connectRow, "board");

                console.log(`  🔹 connect-row 모드: ${mode}, selectedId: ${selectedId}`);

                // 1. 먼저 기존 메뉴의 board_id와 link 조회
                if (menuId) {
                    const {data: existing} = await supabaseClient
                    .from("menu_items")
                    .select("board_id, link")
                    .eq("id", menuId)
                    .single();

                    console.log(`  📋 DB 조회:`, existing);

                    if (existing && existing.board_id) {
                        const candidateId = Number(existing.board_id);
                        console.log(`  📋 board_id 후보: ${candidateId}`);

                        // ✅ board_list에 실제로 존재하는지 검증
                        const {data: boardExists} = await supabaseClient
                        .from("board_list")
                        .select("board_id")
                        .eq("board_id", candidateId)
                        .single();

                        if (boardExists) {
                            FINAL_BOARD_ID = candidateId;
                            console.log(`  ✅ board_list 검증 통과 - FINAL_BOARD_ID=${FINAL_BOARD_ID}`);
                        } else {
                            console.log(`  ⚠️ board_list 검증 실패 - ${candidateId}는 무효`);

                            // link에서 복구 시도
                            if (existing.link) {
                                const match = existing.link.match(/[?&]id=(\d+)/);
                                if (match) {
                                    const linkId = Number(match[1]);
                                    console.log(`  🔍 link에서 추출: ${linkId}`);

                                    const {data: linkBoardExists} = await supabaseClient
                                    .from("board_list")
                                    .select("board_id")
                                    .eq("board_id", linkId)
                                    .single();

                                    if (linkBoardExists) {
                                        FINAL_BOARD_ID = linkId;
                                        console.log(`  ✅ link에서 복구: FINAL_BOARD_ID=${FINAL_BOARD_ID}`);
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. 라디오 버튼으로 명시적 선택
                if (mode === "existing" && selectedId) {
                    FINAL_BOARD_ID = Number(selectedId);
                    console.log(`  ✅ [라디오] 기존 게시판: FINAL_BOARD_ID=${FINAL_BOARD_ID}`);
                } else if (mode === "new") {
                    FINAL_BOARD_ID = await getNextBoardId();
                    await createBoardList(FINAL_BOARD_ID, name);
                    console.log(`  ✅ [라디오] 새 게시판: FINAL_BOARD_ID=${FINAL_BOARD_ID}`);
                }

                // 3. 여전히 없으면 새로 생성
                if (!FINAL_BOARD_ID) {
                    FINAL_BOARD_ID = await getNextBoardId();
                    await createBoardList(FINAL_BOARD_ID, name);
                    console.log(`  ✅ [신규] 게시판: FINAL_BOARD_ID=${FINAL_BOARD_ID}`);
                }

                link = `/skin/board/list.html?id=${FINAL_BOARD_ID}`;
                FINAL_GALLERY_ID = null;

                // 타이틀 갱신
                await supabaseClient.from("board_list").update({title: name}).eq("board_id", FINAL_BOARD_ID);

                console.log(`  💾 최종 FINAL_BOARD_ID: ${FINAL_BOARD_ID}`);
            }
            // 갤러리 타입
            else if (type === MENU_TYPES.GALLERY) {
                const {mode, selectedId} = getConnectionMode(connectRow, "gallery");

                console.log(`  🔹 connect-row 모드: ${mode}, selectedId: ${selectedId}`);

                // 1. 먼저 기존 메뉴의 gallery_id와 link 조회
                if (menuId) {
                    const {data: existing} = await supabaseClient
                    .from("menu_items")
                    .select("gallery_id, link")
                    .eq("id", menuId)
                    .single();

                    console.log(`  📋 DB 조회:`, existing);

                    if (existing && existing.gallery_id) {
                        const candidateId = Number(existing.gallery_id);
                        console.log(`  📋 gallery_id 후보: ${candidateId}`);

                        // ✅ gallery_list에 실제로 존재하는지 검증
                        const {data: galleryExists} = await supabaseClient
                        .from("gallery_list")
                        .select("gallery_id")
                        .eq("gallery_id", candidateId)
                        .single();

                        if (galleryExists) {
                            FINAL_GALLERY_ID = candidateId;
                            console.log(`  ✅ gallery_list 검증 통과 - FINAL_GALLERY_ID=${FINAL_GALLERY_ID}`);
                        } else {
                            console.log(`  ⚠️ gallery_list 검증 실패 - ${candidateId}는 무효`);

                            // link에서 복구 시도
                            if (existing.link) {
                                const match = existing.link.match(/[?&]id=(\d+)/);
                                if (match) {
                                    const linkId = Number(match[1]);
                                    console.log(`  🔍 link에서 추출: ${linkId}`);

                                    const {data: linkGalleryExists} = await supabaseClient
                                    .from("gallery_list")
                                    .select("gallery_id")
                                    .eq("gallery_id", linkId)
                                    .single();

                                    if (linkGalleryExists) {
                                        FINAL_GALLERY_ID = linkId;
                                        console.log(`  ✅ link에서 복구: FINAL_GALLERY_ID=${FINAL_GALLERY_ID}`);
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. 라디오 버튼으로 명시적 선택
                if (mode === "existing" && selectedId) {
                    FINAL_GALLERY_ID = Number(selectedId);
                    console.log(`  ✅ [라디오] 기존 갤러리: FINAL_GALLERY_ID=${FINAL_GALLERY_ID}`);
                } else if (mode === "new") {
                    FINAL_GALLERY_ID = await getNextGalleryId();
                    await createGalleryList(FINAL_GALLERY_ID, name);
                    console.log(`  ✅ [라디오] 새 갤러리: FINAL_GALLERY_ID=${FINAL_GALLERY_ID}`);
                }

                // 3. 여전히 없으면 새로 생성
                if (!FINAL_GALLERY_ID) {
                    FINAL_GALLERY_ID = await getNextGalleryId();
                    await createGalleryList(FINAL_GALLERY_ID, name);
                    console.log(`  ✅ [신규] 갤러리: FINAL_GALLERY_ID=${FINAL_GALLERY_ID}`);
                }

                link = `/skin/gallery/list.html?id=${FINAL_GALLERY_ID}`;
                FINAL_BOARD_ID = null;

                await supabaseClient.from("gallery_list").update({title: name}).eq("gallery_id", FINAL_GALLERY_ID);

                console.log(`  💾 최종 FINAL_GALLERY_ID: ${FINAL_GALLERY_ID}`);
            }
            // 정적/외부 링크
            else {
                const validation = validateMenuType(type, link);
                if (!validation.valid) throw new Error(validation.message);
                FINAL_BOARD_ID = null;
                FINAL_GALLERY_ID = null;
            }

            const saveData = {
                name,
                link,
                type,
                target,
                pc_view,
                mobile_view,
                order_num,
                depth,
                parent_id,
                board_id: FINAL_BOARD_ID, // ✅ 명시적으로 대문자 변수 사용
                gallery_id: FINAL_GALLERY_ID, // ✅ 명시적으로 대문자 변수 사용
                updated_at: new Date().toISOString(),
            };

            console.log(`  💾 저장: board_id=${FINAL_BOARD_ID}, gallery_id=${FINAL_GALLERY_ID}`);

            // INSERT or UPDATE
            if (menuId) {
                // UPDATE
                await supabaseClient.from("menu_items").update(saveData).eq("id", menuId);
                row.dataset.realId = menuId;
                console.log(
                    `  ✅ UPDATE 완료: menu_id=${menuId}, board_id=${saveData.board_id}, gallery_id=${saveData.gallery_id}`
                );
            } else {
                // INSERT
                saveData.created_at = new Date().toISOString();

                const {data: inserted, error: insertError} = await supabaseClient
                .from("menu_items")
                .insert([saveData])
                .select()
                .single();

                if (insertError) {
                    console.error(`  ❌ INSERT 에러:`, insertError);
                    throw insertError;
                }

                row.dataset.id = inserted.id;
                row.dataset.realId = inserted.id;
                console.log(
                    `  ✅ INSERT 완료: menu_id=${inserted.id}, board_id=${inserted.board_id}, gallery_id=${inserted.gallery_id}`
                );
            }

            // dataset 업데이트
            row.dataset.boardId = FINAL_BOARD_ID ? String(FINAL_BOARD_ID) : "";
            row.dataset.galleryId = FINAL_GALLERY_ID ? String(FINAL_GALLERY_ID) : "";
        }

        updateProgress(100, "저장 완료");
        console.log("💾 ========== saveAll 완료 ==========\n");

        hideLoading();
        alert("저장되었습니다.");

        // 새로고침
        await loadBoardAndGalleryOptions();
        await loadMenu();
    } catch (error) {
        console.error("❌ saveAll 오류:", error);
        hideLoading();
        showError("저장 실패", [error.message]);
    }
}
window.saveAll = saveAll;

// ===========================
// 전체 삭제
// ===========================
async function dellAll() {
    if (!window.supabaseClient) {
        showError("Supabase 초기화 오류", ["Supabase 클라이언트가 없습니다."]);
        return;
    }

    const ok = confirm(
        "⚠ [전체 삭제] 안내\n\n" +
            "- 메뉴(menu_items)가 전부 삭제됩니다.\n" +
            "- 모든 게시판 설정(board_list) / 갤러리 설정(gallery_list)\n" +
            "- 게시글(posts) / 갤러리(gallery)\n" +
            "⚠ 모든 데이터가 완전히 삭제됩니다.\n\n" +
            "정말 초기화하시겠습니까?"
    );
    if (!ok) return;

    try {
        showLoading();
        updateProgress(0, "전체 삭제 준비 중...");

        const deleteSteps = [
            {progress: 20, message: "메뉴(menu_items) 삭제 중...", table: "menu_items"},
            {progress: 40, message: "게시판 설정(board_list) 삭제 중...", table: "board_list"},
            {progress: 60, message: "갤러리 설정(gallery_list) 삭제 중...", table: "gallery_list"},
            {progress: 80, message: "게시글(posts) 삭제 중...", table: "posts"},
            {progress: 90, message: "갤러리(gallery) 삭제 중...", table: "gallery"},
        ];

        for (const step of deleteSteps) {
            updateProgress(step.progress, step.message);
            const {error} = await supabaseClient.from(step.table).delete().neq("id", 0);
            if (error) console.error(`❌ ${step.table} 삭제 실패:`, error);
        }

        boardOptions = [];
        galleryOptions = [];
        window.deletedMenuIds = [];

        const tbody = document.getElementById("menuTableBody");
        if (tbody) {
            tbody.innerHTML = `
<tr>
  <td colspan="8" style="text-align:center;padding:40px;background:#f8f9fa;">
      <div style="color:#6c757d;margin-bottom:10px;"><strong>📝 저장된 메뉴가 없습니다</strong></div>
      <div style="color:#868e96;font-size:14px;">[대메뉴 추가] 버튼을 클릭하여 메뉴를 생성하세요</div>
  </td>
</tr>`;
        }

        await loadBoardAndGalleryOptions();

        updateProgress(100, "전체 삭제 완료");
        setTimeout(() => {
            hideLoading();
            alert("✅ 모든 데이터가 완전히 초기화되었습니다.");
        }, 200);
    } catch (err) {
        console.error("❌ 전체 삭제 예외:", err);
        hideLoading();
        showError("전체 삭제 중 오류가 발생했습니다.", [err.message]);
    }
}
window.dellAll = dellAll;

// ===========================
// 로딩창 / 알림
// ===========================
function showLoading() {
    if (isLoading) return;
    isLoading = true;
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    document.body.classList.add("loading-active");
}
function hideLoading() {
    if (!isLoading) return;
    isLoading = false;
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "none";
    document.body.classList.remove("loading-active");
}
function updateProgress(percent, text) {
    const progressBar = document.getElementById("progressBar");
    const progressPercent = document.getElementById("progressPercent");
    const loadingText = document.getElementById("loadingText");

    if (progressBar) progressBar.style.width = percent + "%";
    if (progressPercent) progressPercent.textContent = percent + "%";
    if (loadingText && text) loadingText.textContent = text;
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.updateProgress = updateProgress;

function showError(message, details = []) {
    console.error("❌ 에러 발생:", message, details);
    alert(message + (details && details.length ? "\n\n- " + details.join("\n- ") : ""));
}
window.showError = showError;

// ===========================
// 옵션 강제 리로드
// ===========================
function forceReloadOptions() {
    if (window.supabaseClient) {
        loadBoardAndGalleryOptions().then(() => {
            const openConnectRows = document.querySelectorAll(
                '.connect-row[style*="table-row"], .connect-row:not([style*="none"])'
            );
            openConnectRows.forEach((connectRow) => {
                if (connectRow && connectRow.style.display !== "none") {
                    const menuRow = connectRow.previousElementSibling;
                    if (menuRow) {
                        const type = menuRow.querySelector(".type-select").value;
                        syncConnectionRowVisibility(menuRow, type);
                    }
                }
            });
        });
    }
}
window.forceReloadOptions = forceReloadOptions;

// ===========================
// 초기화
// ===========================
document.addEventListener("DOMContentLoaded", async () => {
    window.deletedMenuIds = [];

    if (window.supabaseClient) {
        await loadBoardAndGalleryOptions();
        await loadMenu();
    } else {
        console.error("❌ Supabase 클라이언트를 찾을 수 없음");
        setTimeout(async () => {
            if (window.supabaseClient) {
                await loadBoardAndGalleryOptions();
                await loadMenu();
            }
        }, 1000);
    }
});
