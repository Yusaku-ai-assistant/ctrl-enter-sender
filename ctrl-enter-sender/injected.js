/**
 * injected.js - MAIN world
 * ページと同じJavaScript実行環境で動くため、
 * Reactの合成イベントやサイト独自のイベントハンドラを確実にインターセプトできる。
 *
 * 戦略:
 * - 素のEnter → preventDefault + stopImmediatePropagation でブロック
 *                → execCommand("insertLineBreak") or Shift+Enterを再dispatch
 * - Ctrl+Enter → ctrlKey/metaKeyを除去した素のEnterとして再dispatch（= 送信）
 * - Shift+Enter → そのまま通す（= 改行）
 */

(function () {
  "use strict";

  let enabled = false;
  let processingCtrlEnter = false;

  // ─── ISOLATED world から設定を受信 ───
  window.addEventListener("__ctrl_enter_sender_settings__", (e) => {
    enabled = e.detail.enabled;
  });

  // 設定をリクエスト
  window.dispatchEvent(new CustomEvent("__ctrl_enter_sender_request__"));

  // ─── テキスト入力要素の判定 ───
  function isTextInput(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (el.isContentEditable) return true;
    // contentEditable な親を持つ要素も対象
    if (el.closest && el.closest("[contenteditable='true']")) return true;
    if (tag === "INPUT") {
      const type = (el.type || "text").toLowerCase();
      return ["text", "search", "url", "email"].includes(type);
    }
    return false;
  }

  // ─── 改行挿入 ───
  function insertNewLine(target) {
    if (target.tagName === "TEXTAREA") {
      // textarea: カーソル位置に \n を挿入
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      // React の setState に対応するため nativeInputValueSetter を使う
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      const newValue =
        value.substring(0, start) + "\n" + value.substring(end);

      if (nativeSetter) {
        nativeSetter.call(target, newValue);
      } else {
        target.value = newValue;
      }
      target.selectionStart = target.selectionEnd = start + 1;

      // React に変更を通知
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // contentEditable: execCommand で改行挿入
      // MAIN world なのでページと同じ環境 → execCommand が正しく動作する
      document.execCommand("insertLineBreak", false, null);
    }
  }

  // ─── Enterキー制御 ───
  function handleKeyDown(e) {
    if (!enabled) return;
    if (e.key !== "Enter") return;

    // 自分が再dispatch したイベントは無視
    if (processingCtrlEnter) return;

    // IME 変換中は無視
    if (e.isComposing || e.keyCode === 229) return;

    // テキスト入力要素でない場合は無視
    const target = e.target;
    if (!isTextInput(target)) return;

    // Shift+Enter → そのまま通す（改行）
    if (e.shiftKey && !e.ctrlKey && !e.metaKey) return;

    // Alt+Enter → そのまま通す
    if (e.altKey) return;

    // ── Ctrl+Enter / Cmd+Enter → 送信 ──
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();

      // ctrlKey/metaKey なしの素の Enter を再dispatch
      processingCtrlEnter = true;
      const fakeEnter = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        // ctrlKey, metaKey は指定しない = false
      });
      target.dispatchEvent(fakeEnter);
      processingCtrlEnter = false;
      return;
    }

    // ── 素の Enter → ブロックして改行挿入 ──
    e.preventDefault();
    e.stopImmediatePropagation();
    insertNewLine(target);

    // トースト表示
    showBlockedToast();
  }

  // capture phase で最優先にハンドルする
  document.addEventListener("keydown", handleKeyDown, true);

  // ─── トースト表示 ───
  let toastTimeout = null;

  function showBlockedToast() {
    let toast = document.getElementById("ctrl-enter-sender-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ctrl-enter-sender-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 999999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        backdrop-filter: blur(8px);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = "⌨️ 送信は Ctrl+Enter";
    toast.style.opacity = "1";
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
    }, 1500);
  }
})();
