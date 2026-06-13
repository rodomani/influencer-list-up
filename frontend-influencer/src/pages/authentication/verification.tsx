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
    <div className="art-shell flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="deco-motion w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="deco-kicker">メール確認</div>
          <CardTitle className="mt-3 text-3xl">メールを確認してね</CardTitle>
          <CardDescription>
            {email
              ? `${email} に確認リンクを送ったよ。`
              : "メールに確認リンクを送ったよ。"}
            {" "}リンクをクリックして登録を完了してね。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="deco-rule" />
          <p className="deco-copy text-center text-sm">
            確認できたら戻ってログインしてね。
          </p>
          <div className="deco-action-row">
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
