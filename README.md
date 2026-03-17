# Ctrl+Enter Sender

Enterキーの誤送信を防止するChrome拡張機能です。  
送信は **Ctrl+Enter**（Macは **Cmd+Enter**）のみ、素のEnterは改行になります。

## セキュリティ

- **外部通信一切なし** — ネットワークリクエストを送信しません
- **最小権限** — `storage`（設定保存）と `activeTab`（現在のタブのURL取得）のみ
- **コード完全公開** — すべてのソースを自分で確認できます
- **自動更新なし** — ローカルインストールなのでコードが勝手に変わりません

## インストール方法

1. このリポジトリをダウンロード（Code → Download ZIP）または `git clone`
2. ブラウザで `chrome://extensions` を開く
3. 右上の「**デベロッパーモード**」をONにする
4. 「**パッケージ化されていない拡張機能を読み込む**」をクリック
5. ダウンロードしたフォルダ（`manifest.json` があるフォルダ）を選択
6. 完了！

## 使い方

| キー操作 | 動作 |
|---------|------|
| Enter | **改行**（送信しない） |
| Ctrl+Enter / Cmd+Enter | **送信** |
| Shift+Enter | **改行**（従来通り） |

アイコンをクリックするとポップアップが開き、サイトごとにON/OFFを切り替えられます。

## 動作原理

1. `keydown` イベントを capture phase で最優先にリスニング
2. `event.isTrusted === false`（自身がdispatchしたイベント）は無視 → 無限ループ防止
3. 素の Enter → ブロック → `shiftKey: true` の Enter を dispatch → サイトが改行として処理
4. Ctrl+Enter → ブロック → `shiftKey: false` の Enter を dispatch → サイトが送信として処理

## 動作確認済み

- **ブラウザ**: Comet（Chromium系）、Chrome、Edge 等
- **サイト**: Claude (claude.ai)、ChatGPT (chatgpt.com) 他
- **想定対応**: Shift+Enter で改行できるすべての Web サイト

## ファイル構成

```
ctrl-enter-sender/
├── manifest.json      # 拡張機能の設定（Manifest V3）
├── content.js         # キーイベント制御（メインロジック）
├── popup/
│   ├── popup.html     # ポップアップUI
│   └── popup.js       # ポップアップのロジック
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 参考

- [masachika-kamada/ChatGPT-Ctrl-Enter-Sender](https://github.com/masachika-kamada/ChatGPT-Ctrl-Enter-Sender) — 動作原理の参考にしました

## ライセンス

MIT License — 自由に改変・再配布可能です。
