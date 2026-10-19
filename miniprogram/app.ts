// App entry: global lifecycle only. Feature logic lives in core/ and pages/.
import { PrivacyGate } from './core/privacy/PrivacyGate';

App({
  onLaunch() {
    // Registered once for the whole app; pages attach a presenter that shows the sheet.
    PrivacyGate.install();
  },
});
