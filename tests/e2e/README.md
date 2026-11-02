# End-to-end tests for the sanarkit-integration skill

These checks prove that an AI coding agent, using only the skill, can integrate SanarKit into a blank app. They are run by hand. `npm test` in the repository root checks the skill's format and wording, and does not run any of this.

Recorded results: [results-react-native.md](results-react-native.md), [results-ios.md](results-ios.md), [results-android.md](results-android.md).

## The test prompt

Used word for word for every app:

```text
Integrate SanarKit into this app and show the dashboard on the home screen. Use client ID E2E_FAKE_CLIENT_ID_123 and the development environment. My user's details come from the placeholder user object in App.tsx.
```

For the native apps, "the placeholder user object in App.tsx" refers to the placeholder user in the app's own source (`DemoUser.swift`, `DemoUser.kt`). The client ID is a fake value, so a connect call is expected to fail. Never use a real client ID in a test, and never write the fake value into a results file: write "the fake test client ID".

## Roles

- **The integration agent** is a fresh agent that gets only three things: the path of the skill folder, the path of the app, and the test prompt, plus the instruction "Follow the skill's SKILL.md exactly. You may run builds." It gets no other context, and it is not told it is in a test.
- **The main session** answers the integration agent's developer questions (the skill's ask-gates), the way a developer would. Record every question and answer. When the agent stops to ask, answer it and let it continue.
- **The checker** is a separate session that does not trust the agent's report. It re-runs the builds, reads the code, runs the git checks and the runtime check, and writes the results files.

## The blank apps

Each app is created outside the skill repository and outside any other git repository. Everything is set up before the agent starts, and the baseline is **staged, never committed**: `git init && git add -A`. Then `git status` and `git diff` show exactly what the integration changed. Nothing is ever committed, not even in the scratch apps.

Every app has the same placeholder user: id `demo-member-001`, name Demo User, date of birth `1990-01-01`, gender `M`, nationality Saudi Arabia, document id `1234567890`, document type `1` (an Int), phone code `966`, phone number `500000000`, marital status `"0"`. The home screen shows the user's name, so the checker can see the app is the blank app.

| App | How it is made |
| --- | --- |
| React Native, New Architecture off | `npx @react-native-community/cli@latest init <Name> --version 0.81.<latest patch> --skip-git-init --install-pods false`. Set `newArchEnabled=false` in `android/gradle.properties`. Install pods with `RCT_NEW_ARCH_ENABLED=0 pod install` (on iOS the setting is not stored in the Podfile, so a later plain `pod install` turns it on again). |
| React Native, New Architecture on | The same command with the defaults (`newArchEnabled=true`, plain `pod install`). |
| iOS | A SwiftUI Xcode project written by hand (no project generator): a classic `project.pbxproj` with an explicit file list, a real `Info.plist` (`GENERATE_INFOPLIST_FILE = NO`), iOS 17.5 deployment target, no signing, no packages. One scheme, shared. |
| Android | A minimal single-module Kotlin app written by hand: `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`, a manifest, a `MainActivity` (`AppCompatActivity`, XML layout), a Gradle wrapper, `minSdk 24`, no Compose. `settings.gradle.kts` uses `RepositoriesMode.FAIL_ON_PROJECT_REPOS`, which is the Android Studio default, so a module-level `flatDir` fails the build. |

Before the agent starts, build every app once and fix toolchain-only problems in the baseline, so a later failure is the integration's. Keep each app's build output inside the app folder (`-derivedDataPath <app>/DerivedData`), and use a project-local npm cache (`npm_config_cache=<folder>/.npm-cache`) when the home npm cache is not writable. Record each baseline tweak. For example, on Xcode 27 the React Native `fmt` pod needs a Podfile post_install tweak (build `fmt` as C++17), and the Gradle wrapper download can time out.

## Pass criteria

Check each app. Run these yourself, in the app folder.

1. **The app builds.** Re-run the build with the caches warm. The build must end in `BUILD SUCCEEDED` or `BUILD SUCCESSFUL`.

   ```sh
   # React Native, iOS
   xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Debug -sdk iphonesimulator \
     -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData build
   # React Native, Android (JDK 17)
   export JAVA_HOME=$(/usr/libexec/java_home -v 17); cd android && ./gradlew assembleDebug
   # native iOS
   xcodebuild -project <App>.xcodeproj -scheme <App> -configuration Debug \
     -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData build
   # native Android (JDK 17)
   export JAVA_HOME=$(/usr/libexec/java_home -v 17); ./gradlew assembleDebug --offline
   ```

   An up-to-date build proves little, so also run `clean build` on the small native apps. For React Native, also run `npx tsc --noEmit`, `npx eslint .` and `npx jest`, and report what each says.

2. **The dashboard component is reachable from the home screen.** Read the code. React Native: `SKDashboard` is rendered from `App.tsx` and a button turns it on. iOS: `SanarKit.DashboardView` is pushed from `ContentView`. Android: `gotoDashboardView()` is called from the `MainActivity` button. With the fake client ID the entry point stays disabled, so this criterion is judged from the code, and the runtime check below shows the entry point on screen.

3. **The fake client ID appears only in git-ignored files.** In the app folder, with `FAKE_CLIENT_ID` set to the fake value from the test prompt:

   ```sh
   git ls-files -co --exclude-standard | xargs grep -l "$FAKE_CLIENT_ID"     # must print nothing
   git grep --cached -l "$FAKE_CLIENT_ID" | wc -l                             # must print 0
   grep -c "$FAKE_CLIENT_ID" <the git-ignored config file>                    # must be at least 1
   ```

   `git ls-files -co --exclude-standard` lists tracked files and new untracked files, and skips ignored ones, so it covers everything that would be committed next. The last command confirms the value is in the expected ignored file (`sanar.config.ts`, `Sanar.xcconfig`, `local.properties`). Print counts only, never the file. Do not rely on `grep -r --exclude-dir` sweeps: they can miss files.

4. **Only the files the integration needs changed.**

   ```sh
   git status --short -uall      # -uall lists the files inside new folders
   git diff --stat
   ```

   List every changed or untracked path and judge each one as needed, an expected side effect, or unnecessary. Expected side effects are lockfiles, `Podfile.lock`, `PrivacyInfo.xcprivacy` written by the SDK's setup, and `Package.resolved`. Flag anything outside the app's scope, and anything the developer did not approve (for example a change to a test file).

Also check that the agent's own checks did not leave files behind: run `git status --short -uall` again after your builds and tests. It must show the same files as before.

## Runtime check (React Native)

Criterion 1 only proves the app compiles. To find out whether the SDK starts, run it on a simulator.

1. Pick the simulator runtime. Xcode 27 builds apps against the iOS 27 SDK, and the iOS 27 runtime refuses to launch any such app that does not adopt the UIScene life cycle (`Application failed to launch: UIScene life cycle is required for apps built with this SDK`). The React Native 0.81.6 template does not adopt it, so on the iOS 27 runtime a blank React Native app dies at launch with or without SanarKit. Use an older runtime (iOS 26.5 worked) for React Native. The native SwiftUI app has a scene manifest and runs on both.
2. Boot a simulator: `xcrun simctl list devices available`, then `xcrun simctl boot <udid>`.
3. Start Metro from the app folder, one app at a time on port 8081: `npx react-native start --port 8081`.
4. Install the built app and launch it: `xcrun simctl install booted <app>/DerivedData/Build/Products/Debug-iphonesimulator/<App>.app`, then `xcrun simctl launch booted <bundle id>` (the id is in the app's `Info.plist`).
5. Wait about 30 seconds, then take a screenshot: `xcrun simctl io booted screenshot <file>`. If this fails with "Operation not permitted", write to a temporary folder and copy it.
6. Read the logs. Metro prints bundling and connection lines. Native logs: `xcrun simctl spawn booted log show --last 2m --predicate 'process == "<App>"'` (search for SanarKit, RNSVG, RNPermissions, Agora, TurboModule and `UIScene`). JavaScript console output is no longer in Metro, so read it from Hermes through the inspector (with Metro running and the app open):

   ```js
   // node cdp-logs.js "<webSocketDebuggerUrl from http://localhost:8081/json/list>" <app>/node_modules/ws
   const WebSocket = require(process.argv[3]);
   const ws = new WebSocket(process.argv[2]);
   ws.on('open', () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' })));
   ws.on('message', (m) => {
     const j = JSON.parse(m.toString());
     if (j.method === 'Runtime.consoleAPICalled') {
       console.log(j.params.type, (j.params.args || []).map((a) => a.value ?? a.description).join(' '));
     }
   });
   setTimeout(() => process.exit(0), 6000);
   ```

   The inspector's description (`React Native Bridgeless [C++ connection]` or `React Native Bridge [C++ connection]`) and the `fabric` field of the `Running "<App>"` line show which architecture is really running. Lines about port 8097 being refused are the React DevTools standalone port, and are not errors.
7. Record: does it start without a red-box or crash, is the entry-point button visible (disabled is expected with a fake client ID), what error line shows, and what the logs say. Then terminate the app and stop Metro.

Optionally launch the native iOS app the same way, without Metro. It needs no JavaScript.

## Writing the results

One results file per SDK, with the date, the versions, the toolchain (verified or not), criteria 1 to 4 each marked PASS or FAIL with evidence, the questions the agent asked and the answers, the workarounds needed, the problems found in the skill, and what was not verified. Never mark something verified that was not run, and never write the fake client ID into a results file. If a criterion fails because of the skill, fix the skill and repeat the run (at most twice), recording each attempt.
