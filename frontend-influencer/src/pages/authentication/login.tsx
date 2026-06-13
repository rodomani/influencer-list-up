import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'ログインに失敗しました');
      } else {
        navigate('/home');
      }
    } catch {
      setError('予期しないエラーが発生しました');
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
              <label htmlFor="email" className="deco-label">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="mail@example.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="deco-label">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
