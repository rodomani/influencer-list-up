import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { readableSupabaseError } from "@/lib/supabaseErrors"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

const MIN_PASSWORD_LENGTH = 10
const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/

const TIMEZONE_OPTIONS = [
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "UTC", label: "UTC" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Europe/London", label: "Europe/London" },
] as const

const LANGUAGE_OPTIONS = [
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
] as const

const ALLOWED_TIMEZONES = new Set<string>(TIMEZONE_OPTIONS.map((option) => option.value))
const ALLOWED_LANGUAGES = new Set<string>(LANGUAGE_OPTIONS.map((option) => option.value))

const getRegisterErrorMessage = (error: unknown) => {
  if (!error) return "登録に失敗しました。時間をおいて再試行してください。"
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (typeof error === "object") return readableSupabaseError(error as Record<string, string>)
  return "登録に失敗しました。時間をおいて再試行してください。"
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    company: "",
    role: "",
    timezone: "Asia/Seoul",
    language: "ja",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange =
    (field: keyof typeof formValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSelectChange =
    (field: "timezone" | "language") =>
    (event: ChangeEvent<HTMLSelectElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    const email = formValues.email.trim().toLowerCase()
    const password = formValues.password
    const confirmPassword = formValues.confirmPassword
    const name = formValues.name.trim()
    const company = formValues.company.trim()
    const role = formValues.role.trim()
    const timezone = formValues.timezone
    const language = formValues.language

    if (!email || !name) {
      setError("メールアドレスと名前は必須だよ。")
      setLoading(false)
      return
    }

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

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてね。`)
      setLoading(false)
      return
    }

    if (!PASSWORD_STRENGTH_REGEX.test(password)) {
      setError("パスワードは英大文字・英小文字・数字・記号を1つ以上含めてね。")
      setLoading(false)
      return
    }

    if (!ALLOWED_TIMEZONES.has(timezone)) {
      setError("タイムゾーンの選択が不正です。")
      setLoading(false)
      return
    }

    if (!ALLOWED_LANGUAGES.has(language)) {
      setError("言語の選択が不正です。")
      setLoading(false)
      return
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company, role, timezone, language },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(getRegisterErrorMessage(signUpError))
      return
    }

    const accessToken = signUpData.session?.access_token

    if (accessToken) {
      const { error: profileError } = await supabase.functions.invoke("profile-upsert", {
        body: { name, company, role, timezone, language },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (profileError) {
        setLoading(false)
        setError(`アカウントは作成されましたが、プロフィール初期化に失敗しました。${getRegisterErrorMessage(profileError)}`)
        return
      }
    }

    navigate(`/verify?email=${encodeURIComponent(email)}`)
    return
  }

  return (
    <div className="art-shell flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="deco-motion w-full max-w-3xl">
        <CardHeader>
          <div className="deco-kicker">新規アクセス</div>
          <CardTitle className="mt-3 text-3xl">新規登録</CardTitle>
          <CardDescription>ブランド、役割、言語設定まで一度で整えます。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="deco-rule mb-6" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleInputChange("email")}
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
                  onChange={handleInputChange("name")}
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
                  onChange={handleInputChange("password")}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder="10文字以上 / 英大文字・小文字・数字・記号を含む"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  10文字以上で、英大文字・英小文字・数字・記号を1つ以上含めてください。
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formValues.confirmPassword}
                  onChange={handleInputChange("confirmPassword")}
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
                  onChange={handleInputChange("company")}
                  placeholder="株式会社サンプル"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">役職</Label>
                <Input
                  id="role"
                  value={formValues.role}
                  onChange={handleInputChange("role")}
                  placeholder="マーケ担当"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">タイムゾーン</Label>
                <select
                  id="timezone"
                  value={formValues.timezone}
                  onChange={handleSelectChange("timezone")}
                  disabled={loading}
                  className="h-11 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">言語</Label>
                <select
                  id="language"
                  value={formValues.language}
                  onChange={handleSelectChange("language")}
                  disabled={loading}
                  className="h-11 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="deco-action-row">
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
