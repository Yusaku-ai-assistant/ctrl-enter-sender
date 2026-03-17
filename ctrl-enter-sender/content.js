/**
 * Ctrl+Enter Sender - Content Script v3.1
 *
 * 修正: "Extension context invalidated" エラー対策
 * - chrome.storage呼び出しをtry-catchで囲む
 * - enabled のデフォルトを true に（storage読み込み失敗時も動作する）
 *
 * 動作原理:
 * 1. capture phaseでkeydownを最優先にハンドル
 * 2. event.isTrusted === false なら無視（自分がdispatchしたイベント除外）
 * 3. 素のEnter → ブロック → shiftKey:true のEnterをdispatch（= 改行）
 * 4. Ctrl+Enter → ブロック → shiftKey:false のEnterをdispatch（= 送信）
 * 5. Shift+Enter → そのまま通す（= 改行）
 */

(function () {
  "use strict";

  const HOSTNAME = location.hostname;

  // デフォルトを true にする（storageアクセス失敗時もブロックが効く）
  let enabled = true;

  // ─── 設定読み込み（エラー耐性あり） ───
  function loadSettings() {
    try {
      if (!chrome?.storage?.sync) return;
      chrome.storage.sync.get(["sites", "globalEnabled"], (data) => {
        if (chrome.runtime.lastError) {
          // Extension context invalidated等のエラー → デフォルト(true)のまま
          return;
        }
        const globalEnabled = data.globalEnabled !== false;
        const sites = data.sites || {};
        const siteEntry = sites[HOSTNAME];
        enabled = siteEntry !== undefined ? siteEntry : globalEnabled;
      });
    } catch (e) {
      // "Extension context invalidated" → 無視してデフォルトで動作
    }
  }

  loadSettings();

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sites || changes.globalEnabled) {
        loadSettings();
      }
    });
  } catch (e) {
    // 無視
  }

  // ─── テキスト入力要素の判定 ───
  function isTextInput(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "DIV" && el.contentEditable === "true") return true;
    if (el.isContentEditable) return true;
    if (tag === "INPUT") {
      const type = (el.type || "text").toLowerCase();
      return ["text", "search", "url", "email"].includes(type);
    }
    return false;
  }

  // ─── メインハンドラ ───
  function handleKeyDown(event) {
    if (!enabled) return;

    // 自分がdispatchしたイベント（isTrusted: false）は無視
    // → これが無限ループ防止の鍵
    if (!event.isTrusted) return;

    if (event.code !== "Enter") return;
    if (event.isComposing) return;
    if (!isTextInput(event.target)) return;

    // Shift+Enter → そのまま通す（改行）
    if (event.shiftKey && !event.ctrlKey && !event.metaKey) return;

    // Alt+Enter → そのまま通す
    if (event.altKey) return;

    const isCtrlEnter = event.ctrlKey || event.metaKey;

    // ── 元のイベントを完全ブロック ──
    event.preventDefault();
    event.stopImmediatePropagation();

    // ── 新しいキーイベントを構築してdispatch ──
    // 素のEnter → shiftKey: true（サイトが改行として処理）
    // Ctrl+Enter → shiftKey: false（サイトが送信として処理）
    const newEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
      shiftKey: !isCtrlEnter,
    });
    event.target.dispatchEvent(newEvent);

    // ── TEXTAREAの場合は手動改行（編集モード等） ──
    if (!isCtrlEnter && event.target.tagName === "TEXTAREA") {
      const textarea = event.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.substring(0, start) + "\n" + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // ── トースト（素のEnterのみ） ──
    if (!isCtrlEnter) {
      showBlockedToast();
    }
  }

  // capture phase で最優先
  document.addEventListener("keydown", handleKeyDown, { capture: true });

  // ─── トースト ───
  let toastTimeout = null;
  function showBlockedToast() {
    try {
      let toast = document.getElementById("ctrl-enter-sender-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "ctrl-enter-sender-toast";
        toast.style.cssText =
          "position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,.8);color:#fff;" +
          "padding:8px 16px;border-radius:8px;font-size:13px;font-family:system-ui,sans-serif;" +
          "z-index:999999;pointer-events:none;opacity:0;transition:opacity .2s;backdrop-filter:blur(8px)";
        document.body.appendChild(toast);
      }
      toast.textContent = "⌨️ 送信は Ctrl+Enter";
      toast.style.opacity = "1";
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.style.opacity = "0"; }, 1500);
    } catch (e) {
      // DOMまだ準備できてない場合等 → 無視
    }
  }
})();
