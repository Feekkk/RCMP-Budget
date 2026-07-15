import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <DotLottieReact src="/receipt.json" loop autoplay className="h-48 w-48" />
    </div>
  );
}
