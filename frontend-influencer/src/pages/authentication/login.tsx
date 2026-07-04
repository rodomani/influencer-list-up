import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { readableSupabaseError } from "@/lib/supabaseErrors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const toLoginErrorMessage = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error
          ? readableSupabaseError(error as Record<string, string>)
          : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("please verify your email")
  ) {
    return "メール確認がまだ完了していません。確認メールのリンクを開いてください。";
  }

  if (normalized.includes("too many requests")) {
    return "試行回数が多すぎます。少し待ってからもう一度お試しください。";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "通信に失敗しました。接続を確認してからもう一度お試しください。";
  }

  return "ログインに失敗しました。入力内容を確認してもう一度お試しください。";
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      setError("メールアドレスとパスワードを入力してください。");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(normalizedEmail, normalizedPassword);
      if (error) {
        setError(toLoginErrorMessage(error));
      } else {
        navigate("/home");
      }
    } catch {
      setError("予期しないエラーが発生しました。しばらくしてからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="art-shell flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="deco-motion w-full max-w-md">
        <CardHeader className="text-center">
          <div className="deco-kicker">インフルエンサー管理</div>
          <CardTitle className="mt-3 text-3xl">ログイン</CardTitle>
          <CardDescription>静かな分析空間へ戻りましょう。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="deco-rule mb-6" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="mail@example.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/register")}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              新規登録
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
