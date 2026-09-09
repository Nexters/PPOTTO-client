type NativeBridgeWindow = Window & {
  ReactNativeWebView?: unknown;
  WebViewBridgeKit?: unknown;
  webkit?: { messageHandlers?: { webviewBridgeKit?: unknown } };
};

// 네이티브 호스트 없이 열린 개발 브라우저. 앱 안(WebView)에서는 항상 false다.
export function isDevelopmentBrowser() {
  if (
    (process.env.NODE_ENV !== 'development' &&
      process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== 'true') ||
    typeof window === 'undefined'
  )
    return false;
  const host = window as NativeBridgeWindow;
  return !(
    host.ReactNativeWebView ||
    host.webkit?.messageHandlers?.webviewBridgeKit ||
    host.WebViewBridgeKit
  );
}
