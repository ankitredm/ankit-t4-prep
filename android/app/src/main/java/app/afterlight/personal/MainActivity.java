package app.afterlight.personal;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * Afterlight launches directly into the bundled application at /app
 * (see server.appStartPath in capacitor.config.json). The marketing
 * website at / is never shown inside the APK.
 */
public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Dark system bars so the app feels native (ignored on edge-to-edge
    // systems, where CSS safe-area insets keep content clear instead).
    try {
      getWindow().setStatusBarColor(Color.parseColor("#07070C"));
      getWindow().setNavigationBarColor(Color.parseColor("#07070C"));
    } catch (Exception ignored) {
      // Very old WebView/chrome — theme colors still apply.
    }

    // Keep back navigation inside the app: React Router pushes one WebView
    // history entry per screen, so go back through history first and only
    // leave the app when there is nowhere left to go.
    getOnBackPressedDispatcher().addCallback(
      this,
      new OnBackPressedCallback(true) {
        @Override
        public void handleOnBackPressed() {
          if (
            bridge != null &&
            bridge.getWebView() != null &&
            bridge.getWebView().canGoBack()
          ) {
            bridge.getWebView().goBack();
            return;
          }
          setEnabled(false);
          getOnBackPressedDispatcher().onBackPressed();
        }
      }
    );
  }
}
