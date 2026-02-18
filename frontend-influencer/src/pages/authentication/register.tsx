import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function RegisterPage() {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    company: "",
    role: "",
    timezone: "",
    language: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleChange = (field: keyof typeof formValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { email, password, confirmPassword, name, company, role, timezone, language } = formValues

    if (!password) {
      setError("パスワードは必須だよ。")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致してないよ。")
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company, role, timezone, language },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    navigate(`/verify?email=${encodeURIComponent(email)}`)


    setSuccess("アカウント作成完了！メールを確認してね。")
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">新規登録</CardTitle>
          <CardDescription>まずはアカウントを作ろう。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange("email")}
                  required
                  placeholder="mail@example.com"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={formValues.name}
                  onChange={handleChange("name")}
                  required
                  placeholder="山田 花子"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={formValues.password}
                  onChange={handleChange("password")}
                  required
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formValues.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  required
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">会社名</Label>
                <Input
                  id="company"
                  value={formValues.company}
                  onChange={handleChange("company")}
                  placeholder="株式会社サンプル"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">役職</Label>
                <Input
                  id="role"
                  value={formValues.role}
                  onChange={handleChange("role")}
                  placeholder="マーケ担当"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">タイムゾーン</Label>
                <Input
                  id="timezone"
                  value={formValues.timezone}
                  onChange={handleChange("timezone")}
                  placeholder="UTC+9"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">言語</Label>
                <Input
                  id="language"
                  value={formValues.language}
                  onChange={handleChange("language")}
                  placeholder="日本語"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                {success}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "作成中..." : "アカウント作成"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                ログインに戻る
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
