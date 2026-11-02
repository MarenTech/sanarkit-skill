# End-to-end results: iOS (native)

Date: 2026-11-02. Skill: `sanarkit-integration`, written against SanarKit for iOS 2.1.1. App: a blank SwiftUI app (`SanarDemo`, one target, a hand-written Xcode project with an explicit file list and a real `Info.plist`, iOS 17.5). The agent ran the test prompt with the fake test client ID and the development environment. How to repeat this is in [README.md](README.md).

Who verified what: the integration agent reported its own results. A separate checker re-ran every check below. Statements marked "agent-reported" were not reproduced by the checker.

## Result

| # | Criterion | Result |
| --- | --- | --- |
| 1 | The app builds | PASS (Debug, simulator). A fresh clone does not build: see "Problems found in the skill". |
| 2 | The dashboard is reachable from the home screen | PASS (by code, and the entry point shows on the running app) |
| 3 | The fake client ID is only in git-ignored files | PASS |
| 4 | Only the files the integration needs changed | PASS |

## Versions

| Item | Value | Source |
| --- | --- | --- |
| Xcode | 27.0 (27A266a) | `xcodebuild -version` |
| iOS SDK, deployment target | iphonesimulator SDK 27.0, iOS 17.5 | build log, app `Info.plist` |
| Swift | compiler 6.4 (the project sets `SWIFT_VERSION = 5.0`) | `swiftc --version` |
| SanarKit | 2.1.1 through Swift Package Manager, `upToNextMajorVersion` from 2.1.1, pinned at revision `628953b` | `Package.resolved` |
| Simulators | iPhone 17 on iOS 26.5, and iPhone 17 on iOS 27.0 | `simctl` |
| Bundle id | `com.example.sanardemo` | built `Info.plist` |

## Toolchain

| Tool | Status |
| --- | --- |
| `xcodebuild` 27.0 | Verified. |
| Swift Package Manager | Verified: the package was already resolved by the agent (in `DerivedData/SourcePackages`), and the checker's clean build used it. The checker did not test a cold resolve. |
| iOS simulator | Verified: the app was installed and launched on iOS 26.5 and 27.0. |
| CocoaPods | Not used. |

## Criteria

**1. The app builds: PASS.** `xcodebuild -project SanarDemo.xcodeproj -scheme SanarDemo -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath DerivedData clean build` ended in `** BUILD SUCCEEDED **` (22 Swift compile steps, about 5 seconds with the cached package resolve). The built app's `Info.plist` has `SANAR_ENVIRONMENT` set to `development`, the two permission strings, and the client ID key filled in (the value is in the ignored build output only). The agent also reported a Release simulator build that succeeded and a `production` environment value there. The checker did not build Release.

Not a criterion-1 failure, but a skill problem the checker reproduced: the build needs the git-ignored `Sanar.xcconfig`. The agent made it the project's **base configuration** for Debug and Release, and the file is not in git. A copy of the working tree containing only tracked and non-ignored files (what a fresh clone has) fails with `error: Unable to open base configuration reference file '.../SanarDemo/Sanar.xcconfig'` and `** BUILD FAILED **`, exit 65. Copying the example to `Sanar.xcconfig` fixes it, but a developer or CI machine that has not done that cannot build.

**2. The dashboard is reachable from the home screen: PASS.** `ContentView` is wrapped in a `NavigationStack`. A button labelled "Sanar Services" sets `isSKDashboard = true` and is disabled until the session is connected. `.navigationDestination(isPresented: $isSKDashboard)` shows `SanarKit.DashboardView(isNavigationActive: $isSKDashboard)`, which matches the skill's `ios-view-dashboardview.md`. The app connects at launch with the placeholder user (`SanarSession.signIn`), and `signOut()` is there to call where the app signs out.

Runtime (checker): launched on iOS 26.5 and on iOS 27.0. The screen shows "Welcome", "Demo User", a greyed-out "Sanar Services" button and the line `The operation couldn't be completed. (NSURLErrorDomain error -1017.)`. So the connect at launch failed (as it must with a fake client ID) and the button stays disabled, as designed. The dashboard itself was never opened. The `-1017` error is `NSURLErrorCannotParseResponse`, presumably the server's rejection of the fake ID in a form the SDK cannot decode. The checker did not confirm what the server sent. The React Native SDK, for the same fake ID, reports the readable message `Invalid Authorisation`. Screenshots (checker's machine): `shots/ios-blank-ios265-home.png`, `shots/ios-blank-ios270-home.png`.

**3. The fake client ID only in git-ignored files: PASS.** `git ls-files -co --exclude-standard | xargs grep -l <fake id>` printed nothing. `git grep --cached` found 0 files. `SanarDemo/Sanar.xcconfig` (ignored by the `.gitignore` the agent edited) contains the value, count 1. `Sanar.xcconfig.example` is committed with placeholders, and the Release lines hold a placeholder too.

**4. Only the files the integration needs changed: PASS.** `git status --short -uall`, after the checker's builds and launches (same list as before them):

| Path | Judgment |
| --- | --- |
| `SanarDemo.xcodeproj/project.pbxproj` | Needed. The developer allowed the edit. It adds the package reference and product, two file references, a build-file entry each, and the xcconfig as the base configuration of both configurations. The file list is explicit, so new Swift files need entries. |
| `SanarDemo.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` (new) | Expected side effect. |
| `SanarDemo/SanarDemoApp.swift` | Needed: environment set at launch, session created, connect with the placeholder user. |
| `SanarDemo/ContentView.swift` | Needed: the button and the navigation to `DashboardView`. |
| `SanarDemo/SanarSession.swift` (new) | Needed: connect, sign out, the field mapping. |
| `SanarDemo/SanarConfig.swift` (new) | Needed: reads the client ID and environment from `Info.plist`. |
| `SanarDemo/Info.plist` | Needed: camera and microphone usage strings, and the two `$(SANAR_...)` keys. |
| `SanarDemo/Sanar.xcconfig.example` (new) | Needed. |
| `.gitignore` | Needed: ignores `Sanar.xcconfig`. |

Nothing outside the app. No Podfile, no `Package.swift`, no entitlements or other files were touched.

## Questions the agent asked, and the answers

The agent stopped before any change, after detecting a native SwiftUI app, one target, no packages or Pods, a clean tree, SanarKit not installed, a deployment target of 17.5, Xcode 27 and a real `Info.plist`. It refused to repeat the client ID back.

| Question | Answer |
| --- | --- |
| Add the package, and edit `project.pbxproj` (the skill forbids hand-editing it unless asked)? | Allowed to edit `project.pbxproj` (package, new files, xcconfig). |
| Where does the client ID live: a git-ignored `Sanar.xcconfig` with an example and `Info.plist` keys, Debug is development and Release is production? | Yes. No other configurations. Release gets a placeholder. |
| The user field mapping (11 fields; `documentType` meaning unconfirmed)? | Confirmed. No `ipc` or `isDependent`. |
| Connect at launch, and `signOut()` for sign-out? | Yes. |
| A button, or the dashboard embedded in the home screen? | A button that pushes the dashboard. |
| Camera and microphone wording? | The skill's defaults. |

## Workarounds needed

None for the toolchain. The one decision was the `project.pbxproj` edit, which the developer approved.

## Problems found in the skill

The skill's working tree was edited after this run (uncommitted). The right-hand column says whether the current text already covers the finding, by search only. The checker did not repeat the run against the edited skill.

| Problem | Found by | Covered in the current text? |
| --- | --- | --- |
| The skill's earlier text said the build succeeds without `Sanar.xcconfig`. It does not, when the file is the base configuration (exit 65). The agent suggested a committed wrapper file with `#include? "Sanar.xcconfig"`. | agent; reproduced by the checker | Yes. `ios-connect.md` now says not to use `Sanar.xcconfig` as the base configuration and gives a committed `SanarBase.xcconfig` wrapper. |
| Projects with an explicit file list need `project.pbxproj` entries for new Swift files. | agent | Yes (question 5 in `ios-connect.md`). |
| The "demo data does not belong in the app" warning fires when the app's own placeholder user holds the same values. | agent | Yes (`ios-connect.md` now covers an app placeholder that matches). |
| The build commands could mention `-derivedDataPath` as optional. | agent | Not found. |
| A rejected client ID shows up as the generic `NSURLErrorDomain error -1017`, with no hint in the skill's troubleshooting. | checker | Not found (no `-1017` in the skill). |

## Not verified

- A real connect, and everything after it: the dashboard opening, the camera and microphone prompts, a call. There is no real client ID.
- A Release build (agent-reported only).
- A fresh-clone build after the skill's wrapper-file fix.
- Whether the server really answered the fake ID with something the SDK cannot decode, which is why the error is `-1017`.
