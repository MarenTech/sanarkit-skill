# End-to-end results: React Native

Date: 2026-11-02. Skill: `sanarkit-integration`, written against `@maren-sa/react-native-sanarkit` 3.0.1. Apps: two blank React Native 0.81.6 apps, one with the New Architecture off (`RnPaper`) and one with it on (`RnNewarch`). Each ran the test prompt with the fake test client ID and the development environment. How to repeat this is in [README.md](README.md).

Who verified what: the integration agents reported their own results. A separate checker re-ran every check below. Statements marked "agent-reported" were not reproduced by the checker.

## The New Architecture answer

**SanarKit 3.0.1 builds on iOS and Android with the New Architecture on, and starts on iOS under it (Bridgeless and Fabric, confirmed). Rendering of the SanarKit components under the New Architecture, Android at runtime, and a real connect are not verified.** Do not read this as "supported".

Builds (checked by the checker):

- iOS: BUILD SUCCEEDED with the New Architecture on, using the default pods (the pod build settings carry `RCT_NEW_ARCH_ENABLED=1`).
- Android: BUILD SUCCESSFUL. The APK has the New Architecture's `libappmodules.so` for all four ABIs. The Old Architecture app has none.
- Both builds needed two workarounds (below). **Neither workaround is specific to the New Architecture**: the Old Architecture app needed both.

Runtime on iOS (checker, iPhone 17 simulator, iOS 26.5, Debug build, Metro on port 8081):

| Check | RnNewarch (New Architecture on) | RnPaper (off) |
| --- | --- | --- |
| Architecture really running | `Debugger integration: iOS Bridgeless (RCTHost)`, inspector target "React Native Bridgeless", `Running "RnNewarch" with {... "fabric":true}`, `RCTNewArchEnabled` true | `iOS Bridge (RCTBridge)`, "React Native Bridge", no `fabric` flag, `RCTNewArchEnabled` false |
| Starts | Yes | Yes |
| Red-box or crash | None | None |
| "Open Sanar" button | Visible, disabled (greyed out) | Visible, disabled |
| Error line on screen | `Invalid Authorisation` | `Sanar: Invalid Authorisation` (red text) |
| JavaScript console | `Connected failed :  false` (written by the SDK) and nothing else | The same line, plus React Native's own Legacy Architecture deprecation warning (a yellow "Open debugger to view warnings" toast) |
| Metro | Bundled `index.js`, "Connection established", no warnings | The same |
| Native log (`log show` for the app's process, a few minutes after launch) | Zero lines mentioning SanarKit, RNSVG, RNPermissions, Agora or TurboModule, and no fatal, crash or exception lines | The same |

What this shows. `Invalid Authorisation` is not a string in the SDK package, so it is the Sanar development server's answer to the fake client ID. The SDK's JavaScript loaded (its import chain reaches `TurboModuleRegistry.getEnforcing` for react-native-permissions, and the same chain is what crashes Jest), the connect call left the app, got an answer, and the SDK reported it. Under the New Architecture that means the modules the SDK imports at startup load without a TurboModule error (react-native-permissions is confirmed by the import chain above), and no log line mentions a problem with the others (device info, webview, Agora, svg 15.16.0, Reanimated 3.19.5). The checker did not call into those modules.

What it does not show:

- No SanarKit component was ever shown. The button is disabled because the connect failed, so `SKDashboard` (a WebView) was never turned on, and the call screens (the only users of react-native-svg in the SDK) were never rendered under Fabric.
- Reanimated is installed as a peer, but no file under the SDK's `lib/` mentions it, so the SDK does not exercise it.
- Android was built and its APK inspected, but never launched. No emulator was started.
- No real connect: there is no real client ID.

Screenshots (checker's machine): `shots/rn-newarch-ios265-home-bridgeless.png`, `shots/rn-paper-ios265-home.png`.

A launch problem that is not SanarKit's: on the **iOS 27.0 simulator runtime**, both blank apps (`RnNewarch` and `RnPaper`, and so both architectures) die at launch with `Application failed to launch: UIScene life cycle is required for apps built with this SDK`, before any JavaScript runs. The checker saw it on RnNewarch (with SanarKit) and on RnPaper (with SanarKit). The integration changes touch neither `AppDelegate.swift` nor the scene manifest: the React Native 0.81.6 template has no `UIApplicationSceneManifest`, and Xcode 27 builds against the iOS 27 SDK. Neither the baseline apps nor a SanarKit-free copy were launched there, so this is inferred from the message and the diff, not from a SanarKit-free run. The native SwiftUI app, which has a scene manifest, runs on iOS 27.0 (see [results-ios.md](results-ios.md)). The runtime checks above therefore use the iOS 26.5 runtime.

## Versions

| Item | Value | Source |
| --- | --- | --- |
| React Native | 0.81.6 (both apps), React 19.1.4 | read from `node_modules` |
| SanarKit | `@maren-sa/react-native-sanarkit` 3.0.1 | read from `node_modules` |
| Peers installed | react-native-agora 4.6.4, react-native-device-info 15.0.2, react-native-permissions 5.6.3, react-native-reanimated 3.19.5 (`~3.19.0`), react-native-svg 15.16.0, react-native-webview 14.0.1, react-native-safe-area-context 5.11.0 | read from `node_modules` |
| Xcode | 27.0 (27A266a), iphonesimulator SDK 27.0, Swift 6.4 | `xcodebuild -version` |
| CocoaPods | 1.16.2 (system Ruby 2.6.10, so `bundle exec pod install` does not run) | `pod --version`; Ruby and Bundler versions copied from the setup report |
| iOS deployment target | 15.1 | template |
| Gradle | 8.14.3 (wrapper) | `gradle-wrapper.properties` |
| Android Gradle Plugin | 8.11.0 (from React Native's version catalog) | `node_modules/react-native/gradle/libs.versions.toml` |
| Kotlin | 2.1.20 | `android/build.gradle` |
| compileSdk, targetSdk, minSdk | 36, 36, 24 | `android/build.gradle` |
| Build tools, NDK | 36.0.0, 27.1.12297006 | `android/build.gradle` |
| JDK | JetBrains Runtime 17.0.14 (`java_home -v 17`) | path from `java_home`; version number from the setup report (copied) |
| Node, npm | 22.22.3, 10.9.8 (npm version copied from the setup report) | `node -v` |
| Simulators | iPhone 17 on iOS 26.5 (runtime check); iOS 27.0 also tried | `simctl` |

## Toolchain

| Tool | Status |
| --- | --- |
| `xcodebuild` 27.0 | Verified. iOS builds ran. |
| `pod` 1.16.2 | Verified (used by the agents). Plain `pod install` works. `bundle exec pod install` does not run on this machine (system Ruby 2.6.10 and Bundler 1.17.2 cannot install the template Gemfile's gems; from the setup report, not re-run). |
| `adb` | Verified: version 1.0.41, 34.0.5-10900879. No device or emulator was used. |
| JDK 17 | Verified. Android builds ran. |
| Android SDK | Verified at `~/Library/Android/sdk` (platforms 35 and 36, build-tools 36.0.0). |
| iOS simulator | Verified, with the runtime caveat above. |
| Android emulator | Not used. |

Baseline tweaks, made before the agents started, so they do not show in the integration diff: a Podfile `post_install` block that builds the `fmt` pod as C++17 (Xcode 27's compiler rejects `fmt` 11.0.2's `consteval` use), and the Gradle 8.14.3 distribution installed by hand because the wrapper's download timed out.

## Criteria

### RnPaper (New Architecture off)

| # | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | iOS: `xcodebuild` Debug for the simulator, `** BUILD SUCCEEDED **` (27 s, incremental). Android: `./gradlew assembleDebug`, `BUILD SUCCESSFUL` (up to date apart from 9 tasks). Also `npx tsc --noEmit` clean, `npx eslint .` clean, `npx jest` passes (1 test, after the agent added a mock; see criterion 4). |
| 2 | PASS | `App.tsx` imports `SKDashboard` and renders it as the last child of the home screen's root view, `enable={dashboardOpen} navigationOption={true} onEndFlow={() => setDashboardOpen(false)}`. A button "Open Sanar" sets `dashboardOpen`, disabled until `connect` has succeeded. The button is on screen in the runtime check (disabled, because the fake client ID fails). The dashboard itself was never opened. |
| 3 | PASS | The scan prints nothing. `git grep --cached` finds 0 files. The ignored `sanar.config.ts` contains the value (count 1). `.gitignore` lists `sanar.config.ts`. The committed `sanar.config.example.ts` has placeholders. |
| 4 | PASS, with notes | See the file table below. |

### RnNewarch (New Architecture on)

| # | Result | Evidence |
| --- | --- | --- |
| 1 | PASS | iOS: `** BUILD SUCCEEDED **` (32 s, incremental). Android: `BUILD SUCCESSFUL` (17 tasks run, rest up to date). `npx tsc --noEmit` clean, `npx eslint .` clean. **`npx jest` fails**: the template's `App` test cannot import the SDK (`TurboModuleRegistry.getEnforcing` for react-native-permissions finds no native module under Jest). The agent left it failing and reported it. |
| 2 | PASS | The same code as RnPaper. The runtime check shows the "Open Sanar" button (disabled, because of the fake client ID). |
| 3 | PASS | The scan prints nothing, `git grep --cached` finds 0 files, the ignored `sanar.config.ts` has the value (count 1). |
| 4 | PASS | See the file table below. |

### Criterion 4: every changed or untracked path

`git status --short -uall` and `git diff --stat`, same list in both apps unless noted. Nothing outside the app's scope.

| Path | Judgment |
| --- | --- |
| `App.tsx` | Needed (provider, button, `SKDashboard`). |
| `SanarSession.tsx`, `toSanarUserInfo.ts` (new) | Needed (connect, disconnect, field mapping). |
| `sanar.config.example.ts` (new) | Needed (committed example with placeholders). |
| `.gitignore` (+3 lines) | Needed (ignores `sanar.config.ts`). |
| `package.json` | Needed (SanarKit, five peers, `overrides`). Also re-sorted the dependency keys and added a final newline. That is a side effect of `sanarkit-setup`: unnecessary but harmless. |
| `package-lock.json` | Expected. |
| `android/app/src/main/AndroidManifest.xml` | Needed: CAMERA, RECORD_AUDIO, WRITE_EXTERNAL_STORAGE, READ_EXTERNAL_STORAGE, BLUETOOTH_CONNECT, the set `rn-permissions.md` lists. |
| `ios/Podfile` | Needed: `setup_permissions(['Camera','Microphone'])` and the developer-approved deployment-target workaround. |
| `ios/Podfile.lock` | Expected. |
| `ios/<App>/Info.plist` | Needed: camera and microphone usage strings. |
| `ios/<App>/PrivacyInfo.xcprivacy` | Expected side effect of `sanarkit-setup` (it re-orders the entries and adds the disk-space category with reason 85F4.1). The agent noted the skill does not say this. Not harmful. |
| `__tests__/App.test.tsx` (RnPaper only) | Acceptable, not needed: see below. |
| No change | Android Gradle files (`build.gradle`, `settings.gradle`, `gradle.properties`), `index.js`, `babel.config.js`, `metro.config.js`. Autolinking did everything. The SDK's `lib/` does not use Reanimated, so no Babel plugin is needed. |

RnPaper's `__tests__/App.test.tsx` gained a 12-line `jest.mock` that stubs the SDK. No pass criterion needs it, and the skill does not tell the agent to do it. It does fix a failure the integration caused (the template's own test cannot import the SDK), it is small, and the agent reported it. Judged acceptable. The two agents behaved differently on the same failure (RnNewarch left it, RnPaper fixed it), so the skill needs one rule: see "Problems found in the skill".

The two apps also differ in where `overrides` goes. RnNewarch: `"overrides": {"react-native-svg": "$react-native-svg"}`. RnPaper: the same entry scoped under `@maren-sa/react-native-sanarkit`. Both resolve to svg 15.16.0.

## Questions the agents asked, and the answers

The New Architecture ask-gate worked. RnNewarch stopped at the pre-flight, as the skill says to: it detected `newArchEnabled=true` and `RCTNewArchEnabled`, quoted the skill's "(Paper)" note, and refused to turn it off. RnPaper detected the setting explicitly off (`gradle.properties` and `Info.plist`) and went on.

RnNewarch:

| Question | Answer |
| --- | --- |
| New Architecture is on: continue, pause, or turn it off? | Continue with it on and report the findings (this is the experiment). |
| Client ID in a git-ignored `sanar.config.ts` at the root, with an example file and three checks? | Yes. |
| Map `__DEV__` to the environment, and warn about the production ID? | Yes, flag the production ID. |
| The field mapping; nationality case; what `documentType` means; where the provider goes? | Confirmed. Pass as is. Unchanged. `App.tsx`. |
| Button, auto-open or replace the home screen; the navigation bar? | A button, `navigationOption={true}`. |
| After install and wiring, both native builds failed (round 2): bump the Podfile deployment target for pods below the app's minimum? | Approved. |
| Use react-native-svg 15.x through `overrides`, which is outside the SDK's `^12.1.0` peer range, or report as is? | Try 15.x through `overrides` as an experiment, and report the build results and where the SDK uses svg. |

RnPaper:

| Question | Answer |
| --- | --- |
| Config location | Yes. |
| `__DEV__` to environment | Yes. |
| Field mapping | Confirmed, as is. |
| `navigationOption` | `true`. |
| Button placement | Yes. |
| Wording | Fine. |
| Podfile deployment-target `post_install` | Approved. |
| svg 15 through `overrides` | Approved as an experiment. |

## Workarounds needed

1. **Install order (both apps).** A plain `npm install @maren-sa/react-native-sanarkit` fails with `ERESOLVE`: npm picks Reanimated 4.7.1, whose React Native peer range excludes 0.81. Naming `react-native-reanimated@~3.19.0` in the same command, the value in the skill's own table, fixes it. Agent-reported by both agents.
2. **iOS deployment target (both apps, developer-approved).** The react-native-device-info 15.0.2 privacy-bundle target declares iOS 9.0, and Xcode 27 rejects deployment targets below 15.0. A Podfile `post_install` block raises any pod target below the app's minimum. Without it the iOS build fails (agent-reported; with a command-line override of 15.1 the build passed). With it the build passes (checker). The checker did not rebuild without it.
3. **react-native-svg 15.16.0 (both apps, developer-approved).** The SDK's peer range is `^12.1.0`. svg 12.5.1 does not compile for Android on React Native 0.81 (`StandardCharsets` missing, `setPointerEvents` access), and it is the only failing module in the Android build. The agents forced 15.16.0 with `overrides`. Agent-reported for the failure; the checker built both apps with 15.16.0. Not specific to the New Architecture.
4. `RCT_NEW_ARCH_ENABLED=0` at `pod install` time for the Old Architecture app, as in the baseline. Any `npm install` that runs `setup_permissions` rewrites a podspec in `node_modules`, so the pods have to be installed again afterwards (agent-reported).

## Problems found in the skill

The skill's working tree was edited after these runs (uncommitted). The right-hand column says whether the current text already covers the finding, by search only. The checker did not repeat the runs against the edited skill.

| Problem | Found by | Covered in the current text? |
| --- | --- | --- |
| The install command, as written, hits the Reanimated `ERESOLVE`. | both agents | Yes (`SKILL.md`, `rn-installation.md`, `rn-troubleshooting.md` say to install it in the same command). |
| No troubleshooting entry for the iOS 9.0 deployment target under Xcode 27. | both agents | Yes (`rn-troubleshooting.md`). |
| No entry for svg 12.5.1 failing on React Native 0.81, and "which svg version for new React Native" was "to confirm". | both agents | Yes for the failure. The result here is that 15.16.0 builds on both architectures. |
| `SKILL.md` step 5 checks the client ID with `--error-unmatch` while `rn-connect.md` says "`git ls-files` must print nothing". | RnNewarch agent | Not checked. |
| `sanarkit-setup` rewrites `PrivacyInfo.xcprivacy` and re-sorts `package.json`, which the skill does not say. | both agents; checker saw it in the diff | Partly (`PrivacyInfo` is mentioned in `SKILL.md` and `rn-installation.md`). |
| Detect the iOS architecture setting through `RCTNewArchEnabled` in `Info.plist`. `sanarkit-setup`'s own `pod install` needs `RCT_NEW_ARCH_ENABLED=0` on an Old Architecture app. | RnPaper agent | Yes (`RCT_NEW_ARCH_ENABLED=0` appears in four files). |
| `bundle exec pod install` fails where Bundler cannot run. | RnPaper agent | Yes (a fallback is described). |
| No Jest guidance. The SDK loads native modules at import, so the template's Jest test fails. One agent left it failing, the other added a mock. | both agents; checker reproduced both outcomes | Yes in part (`jest` appears in `rn-troubleshooting.md`). The skill should say whether the agent fixes it or only reports it. |
| The git-ignored `sanar.config.ts` breaks `tsc`, Jest and Metro on a fresh clone, because `SanarSession.tsx` imports it. | RnPaper agent | Not reproduced by the checker. |
| `overrides` is written two different ways. | checker | Partly (`overrides` appears in `rn-installation.md`). Pick one form. |
| The example-file header text was misleading. | RnNewarch agent | Not checked. |
| The New Architecture rule says "to confirm". | skill plan | Needs the answer above. The stop-and-ask gate itself worked. |

## Not verified

- A real connect. There is no real client ID, so the server answers "Invalid Authorisation" and the entry point stays disabled.
- Opening the dashboard, and any other Sanar component, at runtime, on either architecture.
- SanarKit under the New Architecture with a component showing: SKDashboard's WebView, the call UI with svg 15.16.0, Agora.
- Android at runtime (no emulator), on either architecture.
- Release builds (`assembleRelease`, an iOS Release build) and a production client ID.
- The iOS 27.0 runtime for React Native (blocked by the UIScene launch failure, which is in the template).
- A fresh-clone build of the React Native apps (the git-ignored `sanar.config.ts` is missing there).
- That the skill's current text, edited after these runs, makes a fresh agent succeed.
