# システムアーキテクチャ

## 全体構成

### フロントエンド
- **Firebase Hosting**: 静的ホスティング
- **Shadcn UI**: UIコンポーネントライブラリ

### バックエンド
- **Supabase**: メインバックエンドサービス
- **Supabase Storage**: ファイルストレージ
- **Supabase Edge Functions**: サーバーレス関数
- **Supabase PostgreSQL**: データベース

## アーキテクチャ概要
フロントエンドはFirebase Hostingで配信し、UIはShadcn UIで構築。バックエンドはSupabaseエコシステムを活用し、PostgreSQLでデータ管理、Edge Functionsでビジネスロジック処理、Storageでファイル管理を行う統合アーキテクチャ。