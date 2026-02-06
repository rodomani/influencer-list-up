# 環境構築手順

## ディレクトリ構造
docs/ mdファイルを格納
frontend/ フロントエンド側のコードを格納
supabase/functions バックエンド側のコードを格納
supabase/functions/hoge/index.ts 関数hogeのコード
supabase/functions/_shared/*.ts 共通利用のコード

## フロントエンド環境の構築
### Viteプロジェクトの作成
```bash
cd frontend

npm create vite@latest
# Need to install the following packages:
# create-vite@******
# Ok to proceed? ※yを入力
#
# Project name:
# ※プロジェクトに沿った適当な名前をつける
#
# Select a framework:
# ⚫︎ React
# 
# Select a variant:
# ⚫︎ Typescript
# 
# Use rolldown-vite (Experimental)?:
# ⚫︎ No
#
# Install with npm and start now?
# ⚫︎ Yes
```
### Shadcnの環境構築 (https://ui.shadcn.com/docs/installation/vite)


### firebaseとの紐付け
```bash
# ブラウザを使ってfirebaseアカウントでログイン
firebase login

cd frontend
firebase init
# 必要ファイルの一括作成
# ? Which Firebase features do you want to set up for this directory?
#       ⚪︎ Hosting ※これのみをスペースキーで選択 → エンタキー
#
# === Project Setup
# ? Please select an option: 
# > Use an existing project ※すでにfirebase consoleでプロジェクトを作成している場合
# Create a new project ※その場で作成
# 
# ? Select a default Firebase project for this directory ※Use an existing projectを選択した場合はここでプロジェクトと紐付けする
# 
# === Hosting Setup
# ? What do you want to use as your public directory ※distを入力
#
# Configure as a single-page app (rewrite all urls to /index.html)? 
# Set up automatic builds and deploys with GitHub? (Y/n) ※nを入力
```
npm run buildをするとviteの標準であるdistにビルド結果が格納される。firebase deploy時のデフォルトはpublicであるため、修正する。
```json:firebase.json
{
  "hosting": {
    "public": "dist",
  }
}}
```


## フロントエンドのテスト
```bash
cd frontend
npm run dev
```
1. npm run dev を実行 → package.jsonで定義されたviteコマンドが実行される
2. Viteは frontend/index.html をエントリーポイントとして読み込む
3. index.html:11 の<script type="module" src="/src/main.tsx"></script>でmain.tsxが読み込まれる
4. main.tsx → App.tsx という流れで呼び出される


## バックエンドの構築

### Supabaseとの紐付け
```bash
# supabase projectとリンクする。deployを実行した際にこのプロジェクトにデプロイされる。
supabase link --project-ref hoge 
```

### Supabaseプロジェクトの設定
Project Settings -> API Keys
Project Settings -> JWT Keys
でlegacyを使わないように変更する

API Keys -> create new key で
publishable keyとsecret keyを取得。

Edge functionsを使う場合には
Edge Functions -> Secretsにこれらのkeyを追加しておく

### Edge Functionsのデプロイ
```bash
ls # supabase, frontend, docsが表示されればOK
supabase functions deploy HOGEHOGE --no-verify-jwt
```
従来は自動でJWT検証されていたが、JWT Signing Keyに移行すると、自動JWT検証では検証できなくなる。
そのため、--no-verify-jwtにして、Edge Functions側でjwt検証する方向で実装する。
supabaseAdmin.auth.getClaimsやsupabaseAdmin.auth.getUser