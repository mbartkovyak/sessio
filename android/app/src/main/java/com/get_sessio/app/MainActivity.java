package com.get_sessio.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Enables edge-to-edge display and forwards the system-nav insets to the
 * WebView as CSS custom properties. Without this, Android 15+ (compileSdk 35+)
 * draws the WebView under the system navigation bar, causing our fixed
 * bottom nav to overlap the gesture indicator / nav buttons. The React side
 * reads `var(--safe-area-inset-bottom)` (and top) in layout components that
 * previously relied on `env(safe-area-inset-*)` — which iOS populates natively
 * via WKWebView but Android does not.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin — must be registered BEFORE super.onCreate() which
        // builds the Capacitor bridge and finalizes the plugin list.
        registerPlugin(GoogleSignInPlugin.class);

        super.onCreate(savedInstanceState);

        // Explicit edge-to-edge. API 35+ enforces this by default; calling it
        // explicitly is a no-op on those versions and correctly enables it on
        // older devices so the inset listener below runs on every version.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View root = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insetsCompat) -> {
            Insets bars = insetsCompat.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            float density = getResources().getDisplayMetrics().density;
            int top = Math.round(bars.top / density);
            int right = Math.round(bars.right / density);
            int bottom = Math.round(bars.bottom / density);
            int left = Math.round(bars.left / density);

            android.util.Log.d("SessioInsets",
                "top=" + top + " right=" + right + " bottom=" + bottom + " left=" + left);

            // Skip injection when the listener fires with zero bottom — that
            // happens on the first pass before the window is attached and
            // would clobber the safe fallback values set by main.tsx. A real
            // device will always report a non-zero bottom inset in portrait.
            if (bottom <= 0) {
                return insetsCompat;
            }

            // Inject into <html> so CSS can read them via var(--safe-area-inset-*).
            // Wrapped in an IIFE + try/catch so a race with the initial document
            // load doesn't swallow a later re-fire.
            String js = "(function(){try{" +
                "var s=document.documentElement&&document.documentElement.style;" +
                "if(!s)return;" +
                "s.setProperty('--safe-area-inset-top','" + top + "px');" +
                "s.setProperty('--safe-area-inset-right','" + right + "px');" +
                "s.setProperty('--safe-area-inset-bottom','" + bottom + "px');" +
                "s.setProperty('--safe-area-inset-left','" + left + "px');" +
                "}catch(e){}})();";

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() ->
                    getBridge().getWebView().evaluateJavascript(js, null)
                );
            }
            return insetsCompat;
        });

        // Force the listener to fire at least once now that the activity is
        // laid out. Without this, on some devices it would only fire on the
        // next insets-change event (e.g. rotation), leaving the CSS vars
        // unset at first paint.
        ViewCompat.requestApplyInsets(root);
    }
}
