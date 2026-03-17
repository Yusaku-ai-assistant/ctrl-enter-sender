/**
 * bridge.js - ISOLATED world
 * chrome.storage にアクセスし、設定を MAIN world (injected.js) に伝える。
 * MAIN world とは CustomEvent を使って通信する。
 */

(function () {
  "use strict";

  const HOSTNAME = location.hostname;

  function getEnabled(callback) {
    chrome.storage.sync.get(["sites", "globalEnabled"], (data) => {
      const globalEnabled = data.globalEnabled !== false;
      const sites = data.sites || {};
      const siteEntry = sites[HOSTNAME];
      const enabled = siteEntry !== undefined ? siteEntry : globalEnabled;
      callback(enabled);
    });
  }

  // 設定を MAIN world に送信
  function sendSettings() {
    getEnabled((enabled) => {
      window.dispatchEvent(
        new CustomEvent("__ctrl_enter_sender_settings__", {
          detail: { enabled },
        })
      );
    });
  }

  // 初期設定を送信（MAIN world がリクエストしたタイミング）
  window.addEventListener("__ctrl_enter_sender_request__", () => {
    sendSettings();
  });

  // storage 変更時にも再送信
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.sites || changes.globalEnabled) {
      sendSettings();
    }
  });

  // DOM ready 時にも念のため送信
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendSettings);
  } else {
    sendSettings();
  }
})();
