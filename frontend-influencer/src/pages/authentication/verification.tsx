import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function VerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get("email")
  }, [location.search])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">メールを確認してね</CardTitle>
          <CardDescription>
            {email
              ? `${email} に確認リンクを送ったよ。`
              : "メールに確認リンクを送ったよ。"}
            {" "}リンクをクリックして登録を完了してね。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            確認できたら戻ってログインしてね。
          </p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => navigate("/login")}>
              ログインへ
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
