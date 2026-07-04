import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AuthLoadingScreen = () => (
  <div className="art-shell flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <div className="deco-panel deco-page max-w-md text-center">
      <div className="deco-kicker">準備中</div>
      <div className="section-title mt-3 text-2xl">読み込み中</div>
      <div className="deco-rule my-5" />
      <p className="deco-copy text-sm">分析データとナビゲーションを整えています。</p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicOnlyRoute = ({ children }: { children?: ReactNode }) => {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <>
      {authError && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
          認証の初期化に失敗しました: {authError}
        </div>
      )}
      {children ? <>{children}</> : <Outlet />}
    </>
  );
};
