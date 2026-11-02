---
name: sanarkit-integration
description: "Integrates the SanarKit SDK (Sanar telemedicine: booking, appointments, consultations and video calls) into a client's React Native, iOS or Android app. It detects the app type, installs the SDK, adds the camera and microphone permissions, connects a member without hardcoding the client ID, and adds the SanarKit component or screen the developer chooses. Use when the developer asks to add, integrate, set up or check Sanar or SanarKit, or to add Sanar booking, appointments, consultations or video calls, in a React Native, iOS (Swift) or Android (Kotlin) app. Does not cover the Web SDK."
metadata:
  sdk-versions: "react-native 3.0.1; ios 2.1.1; android 2.1.1"
---

# SanarKit integration

Add a SanarKit SDK to a developer's app and put one Sanar component on screen. This skill covers three separate SDKs: React Native, iOS and Android. They are different products with different APIs, so never carry code or names from one SDK over to another.

Work through the nine steps below in order. The rules in the Rules section below apply to every step, so read that section first. The reference files hold the exact commands, code and API tables. Read only the references for the SDK you detected, and only when a step points you to them (they are listed in the Reference files table at the end).

## Workflow

### 1. Detect the app type

Look at the project the developer opened. Check `git status` first and tell the developer if the working tree already has uncommitted changes, so you do not mix your changes with theirs.

- **React Native:** a `package.json` that lists `react-native` in `dependencies`. Having `ios/` and `android/` folders does not make a project native: if it is React Native, use the React Native SDK for both platforms.
- **iOS:** an `.xcodeproj`, an `.xcworkspace` or a `Package.swift`, and no React Native.
- **Android:** a `build.gradle(.kts)` or `settings.gradle(.kts)`, and no React Native.
- **Monorepo:** the root `package.json` often does not list `react-native`. Look for `react-native` in nested `apps/*/package.json` and `packages/*/package.json` (also check `workspaces`, `pnpm-workspace.yaml`, `turbo.json` and `nx.json`), and skip `node_modules` when you search for nested `package.json` files. A repo can also hold several apps, or a native iOS app next to an Android app. List the candidates you found and ask which app to integrate. Do the rest of the work from that app's folder, and treat that folder as the app root.
- **Expo:** if `package.json` has an `expo` dependency, often with no `ios/` or `android/` folder, SanarKit will not run in Expo Go because it needs native modules. It needs a development build or a prebuild (`npx expo prebuild` generates the native folders). Explain this and ask before you run either. `references/rn-installation.md` has the details.
- **Anything else** (Web, Flutter, Kotlin Multiplatform, and so on): say that this skill does not cover it, and stop.
- **Ambiguous** (for example a project that matches more than one of the above): ask. Do not guess.

Tell the developer what you detected, then read only that SDK's references.

### 2. Check the SDK version

Find out whether SanarKit is already installed and which version.

- **React Native:** `node_modules/@maren-sa/react-native-sanarkit/package.json` (`version`) in the app, or hoisted to the monorepo root, or the entry in the app's `package.json`. A `sanar-rtc` dependency means an older SDK (2.x).
- **iOS:** the SanarKit entry in `Package.resolved` (inside the `.xcodeproj` or `.xcworkspace`), or the package requirement in `Package.swift`. If you cannot tell whether the installed version is older than the covered one, ask the developer.
- **Android:** the version in the `.aar` file name under the app module's `libs/` folder, for example `sanarkit-release-2.1.1.aar`.

Compare it with the versions in the Versions covered section.

- **Not installed:** carry on to step 3.
- **Installed version is older than the covered version:** report both versions, say what could differ, and **ask before upgrading**. Do not upgrade unasked, and do not remove the old SDK unasked. If the developer says to keep the old version, check each name you use against the installed package, and tell them where the references may not match.
- **Installed version is newer:** proceed, and say so. Check each name you use against the installed package.
- **Same version:** proceed.

React Native pre-flight, before you install anything:

- Read the installed `react-native` version. SanarKit 3.0.1 supports React Native 0.71 to 0.81. On 0.68 to 0.70 the matching SDK is SanarKit 2.1.x, which this skill does not cover: tell the developer, do not install 3.0.1, and ask how they want to go on. Outside 0.68 to 0.81, tell the developer that SanarKit 3.0.1 does not support that version, suggest they contact Sanar, and ask whether to continue.
- If the New Architecture is on, **tell the developer and ask before you go on**. SanarKit 3.0.1 targets React Native's legacy architecture, so tell them to contact Sanar before they integrate. Do not say that SanarKit supports the New Architecture. Never turn `newArchEnabled` off yourself. React Native 0.76 and later turns it on by default, so also check for an explicit setting. `references/rn-installation.md` says where to look.

### 3. Install

- **React Native:** install `@maren-sa/react-native-sanarkit` from the npm registry with the app's own package manager, picked from its lockfile (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`). Never install it from GitHub, such as `github:MarenTech/react-native-sanarkit`, or from a git URL. **Install it in the same command as Reanimated**, with the `recommended` version from the compatibility table for the app's React Native minor (for example `npm install @maren-sa/react-native-sanarkit "react-native-reanimated@~3.19.0"` on 0.81), because a plain install can fail with `ERESOLVE` on npm 7 and later when the newest Reanimated needs a newer React Native. Two exceptions: if the app **already lists** `react-native-reanimated`, leave it out of the command and leave its version alone; and if the table has **no row** for the app's React Native, do not guess, **ask the developer** which Reanimated version to install. Never use `--force` or `--legacy-peer-deps`. Then run `npx sanarkit-setup` from the app root, and do not repeat by hand what it does. If the app has the New Architecture off, start it with `RCT_NEW_ARCH_ENABLED=0` (it runs `pod install`). It only knows npm and yarn. On pnpm, or any other manager, it would use npm and create a second lockfile, so install the missing peer dependencies yourself with the app's manager instead. `references/rn-installation.md` lists the peers, the versions and the commands for each manager. Expect some changes you did not make: CocoaPods may rewrite `ios/<App>/PrivacyInfo.xcprivacy`, and npm may re-sort `package.json`. Report them and do not revert them.
- **iOS:** add the SanarKit Swift Package from GitHub to the app target. SanarKit requires iOS 17.5 or later and Xcode 16.4 or later. **Ask before changing the deployment target.** Xcode has no command-line way to add a package to an `.xcodeproj`, so adding it needs Xcode or an edit of `project.pbxproj`: ask which the developer wants. See `references/ios-installation.md`.
- **Android:** add the `.aar` file to the app module and the Gradle dependency, as `references/android-installation.md` describes.

Change only what the SDK needs. Do not bump React Native, Gradle, the Android Gradle Plugin, Xcode settings or other dependencies beyond what the SDK requires without asking.

### 4. Permissions

Video consultations need the camera and the microphone. Add them as the SDK's reference says, then rebuild, because a JavaScript reload is not enough.

- **iOS** (native and React Native): `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` in `Info.plist`. Use wording that suits the app.
- **Android** (native and React Native): the permissions in `AndroidManifest.xml`. For the native SDK, the `.aar` does not declare `CAMERA` or `RECORD_AUDIO`, so the host app must.
- **React Native** also needs the `react-native-permissions` Podfile setup for iOS. See `references/rn-permissions.md`.

### 5. Environment and connect

1. Call `setEnvironment` once, before `connect`. Choose the environment and the client ID together, from the app's build configuration (debug and release, or its own environments), because each environment has its own client ID. Use development while integrating. Never hardcode `development` in a way that ships in release builds: tell the developer that release builds need production and a production client ID.
2. **Find out where the client ID lives. Ask the developer.** Use the app's existing secret or environment mechanism (for example a git-ignored `.env`, an `.xcconfig` or `local.properties`). If the app has none, create a small config file as the SDK's connect reference describes, add it to `.gitignore`, and check it with its **real path**, as it is from where you run the commands (`<path>/<file>`, not a bare name, because the file is usually in a subfolder and a bare name makes the tracked check say `not tracked` even when the file is tracked): first that it exists (`test -f <path>/<file>`), then that it is ignored (`git check-ignore -v <path>/<file>`) and not tracked (`git ls-files --error-unmatch -- <path>/<file> 2>/dev/null && echo TRACKED || echo "not tracked"`). `--error-unmatch` fails for an untracked file, which is why the `||` prints `not tracked`, and a wrong path fails the same way, so count `not tracked` only once `test -f` has confirmed that the path is real. Also add a committed example file that holds a placeholder, with its own header (the example is committed, so it must not say "do not commit"). Leave a clearly marked placeholder where the value goes and tell the developer to fill it in. Never ask them to paste the client ID into the chat. **If the developer already gave you the client ID, in the request or later, still confirm where it should live (this same question), write it only to the git-ignored file, and never repeat it.** Never print the config file's contents.
3. **Map the app's signed-in user to the SDK's member fields.** Ask which of the app's fields go into which SDK fields. Never invent personal data. The values in the references are demo data: never copy them in as a user's real data. If the app's own placeholder or test user happens to hold the same values, that is the app's data and is fine. Do not log the member object.
4. Connect after the user signs in, and show a Sanar component only after `connect` has succeeded. Call `disconnect` when the user signs out. Handle both a refusal and a failure.

How `connect` looks in each SDK (the connect references have the full code):

- **React Native:** `SanarKit.connect(cid, info, lang?)` returns a promise of `{ status, message }`. `status: false` is a refusal, and the promise does not reject, so check both. Do not call `disconnect` when a screen unmounts, because it ends the session for every Sanar component.
- **iOS:** `SKManager.connect(cid:bundleId:clientInfo:lang:) async throws -> String`. Call it with `try await`. The `clientData` and `requestBody` forms in the SDK's README do not compile.
- **Android:** `SanarKit(activity)` needs an Activity. Keep the `SanarSession` object (created `by lazy` in the Activity), and read `sanar.kit` from it at the moment you call a `goto*` method; never keep your own copy of the SanarKit instance. `connect(userInfo, authToken, bundleId, lang, onSuccess, onError)` returns at once (`authToken` is the client ID, so it is a secret and comes from config like the client ID on the other SDKs), and the callbacks run on a background thread, so wrap UI work in `runOnUiThread`. Open every screen from the instance that connected.

References: `references/rn-connect.md`, `references/ios-connect.md`, `references/android-connect.md`.

### 6. Choose the experience

Ask the developer which experience they want. Offer only what the detected SDK has. A dash means that SDK has no separate component for it. On iOS and Android, the dashboard and the other Sanar screens already include teleconsultation and calls with the provider, so tell the developer that and ask what they want. Do not substitute a different component yourself.

| Experience | React Native | iOS | Android |
| --- | --- | --- | --- |
| Everything in one entry point (recommended for a first integration) | `SKDashboard` | `DashboardView` | `gotoDashboardView` |
| One service, or the booking flow | `SKService` (also ask which service type) | `ServiceView` | `gotoBookingView` |
| Instant teleconsultation booking | `ITCBooking` | `InstantConsultationView` | - |
| Appointments | `SKAppointments` | `BookingListView` | `gotoAppointmentListView` |
| A consultation for one appointment | `SKConsultation` | `ConsultationView` | `gotoConsultationView` |
| Video calls | `SanarRTC` | - | - |

On iOS, `DashboardView` replaces `ServiceView`, `InstantConsultationView` and `BookingListView`, which remain for backward compatibility, so prefer `DashboardView` unless the developer asks for one of the others.

Then read that component's reference from the table at the end.

### 7. Add the component

Add it to the app's navigation. Follow the navigation library, the code style and the folder layout the app already uses. Do not introduce a new navigation library. Put the entry point where the developer asked (for example the home screen), and keep the change small.

- **React Native:** every component except `SanarRTC` takes `enable` and `onEndFlow`. Keep it closed until `connect` has succeeded, and close it in `onEndFlow`. For `SKDashboard`, `SKAppointments` and `ITCBooking`, `navigationOption` defaults to `false`, so leaving it out hides the navigation bar. Pass `navigationOption={true}` where the developer wants Sanar's bar. `SKService` has no `navigationOption`. For `SKConsultation`, the SDK does not read `navigationOption`, so do not rely on it until the Sanar team confirms what it does. `SanarRTC` renders once at the app root, and with `enable={false}` it calls `SanarKit.disconnect()`, so tie its `enable` to your own connected flag.
- **iOS:** each view is a SwiftUI view that takes an `isNavigationActive` `Bool` binding and is shown from one of the app's own screens inside a navigation container. `NavigationStack` needs an iOS 16 deployment target. Do not raise the deployment target for it: the view's reference has the variant for older targets, and also shows the UIKit hosting pattern. If the project lists its files explicitly in `project.pbxproj` (it has no synchronized folders), every new Swift file needs a project-file entry and the xcconfig has to be attached to the target: ask whether you may edit `project.pbxproj` or whether the developer adds the files in Xcode.
- **Android:** the `goto*` methods need an Activity context. Call them on the instance that connected. Each one starts its own full-screen Activity on top of the app, so it cannot be embedded in a screen, a tab or a Fragment. If the developer asks to "show the dashboard on the home screen", say so and add a button on that screen that calls `gotoDashboardView()`.

The consultation entries take extra parameters. React Native `SKConsultation` needs `appointmentId` and `empId`. iOS `ConsultationView` needs `consultationData` as well as `isNavigationActive` (a dictionary with the doctor ID and appointment ID, keys `dId` and `aId`). Android `gotoConsultationView(aId, dId)` takes the appointment ID and the doctor ID. Ask the developer where those IDs come from, and never invent them.

For a consultation, always use `SKConsultation` on React Native.

### 8. Build

- **React Native:** run `pod install` if native dependencies changed (with `RCT_NEW_ARCH_ENABLED=0` in front when the app has the New Architecture off, and plain `pod install` is fine if `bundle exec` or the `Gemfile` cannot run), then build the platforms the app targets with the app's own scripts (`npx react-native run-ios` and `run-android` in a bare project, the development build in an Expo project).
- **iOS:** `xcodebuild` with the app's scheme, for example against the iOS Simulator.
- **Android:** `./gradlew assembleDebug` from the project root.

Fix the errors your integration caused. Do not fix unrelated failures that were already there; tell the developer about them. If you cannot run a build (no Xcode, no Android SDK, no simulator), say exactly what you could not verify. If a build fails, read the troubleshooting reference for the SDK before you change anything: `references/rn-troubleshooting.md`, `references/ios-troubleshooting.md` or `references/android-troubleshooting.md`.

### 9. Report

Give the developer a short report:

- the files you changed or added (from `git status`), and confirmation that no client ID or other credential is in any tracked file or in your output
- the values they still have to fill in, such as the client ID in the git-ignored file, the user-field mapping and the permission wording
- what you could not verify, such as a build you could not run, or that `connect` succeeds, which needs a real client ID for the right environment
- for React Native: that a fresh clone and CI must create the git-ignored `sanar.config.ts` from the example before `tsc`, Jest, Metro or a Release build can run, and that an existing Jest test that imports the SDK now fails because native modules load at import (do not add mocks unless the developer asks; `references/rn-troubleshooting.md` has a minimal one)
- any place where the docs and the installed package disagreed, and any SDK requirement the app does not meet, such as an iOS deployment target below 17.5 or a React Native version outside 0.71 to 0.81
- next steps: fill in the config, run the app and confirm `connect` succeeds, then work through the Go-live checklist before release (the Go-live checklist page in the Sanar developer docs, under Get started, path `/docs/get-started/go-live`)

Leave the changes uncommitted for the developer to review.

## Rules

- **Credentials:** never hardcode, commit or print the client ID, tokens or other credentials. The client ID is a per-client secret. On Android the `authToken` argument of `connect` is the client ID. Keep it in config that is not committed: the app's existing secret or environment mechanism, or a new file you add to `.gitignore`. Never read it back into the chat or a log.
- **Consultations on React Native:** use `SKConsultation`, never `SKChat`, and never call `setIsChatEnabled`.
- **Scope:** only touch the files the integration needs. Do not reformat, rename or upgrade unrelated code.
- **Upgrades:** do not upgrade React Native, Gradle, the Android Gradle Plugin, Xcode settings or other dependencies beyond what the SDK requires without asking first.
- **Trust the installed package:** if the references and the installed package disagree, trust the installed package and tell the developer.
- **Ask, do not guess:** when a choice changes behavior, ask. That covers where config lives, which experience to show, which app in a monorepo, how user fields map, and whether to upgrade an older SDK or change a deployment target.
- **Personal data:** never invent member details, and never log them.
- **React Native install source:** npm only. Never install from GitHub.

## Versions covered

The references were written against these SDK versions, checked against the shipped packages:

- **React Native:** `@maren-sa/react-native-sanarkit` **3.0.1**, for React Native 0.71 to 0.81 (0.68 to 0.70 use SanarKit 2.1.x, which this skill does not cover). It targets React Native's legacy architecture. Node.js 16 or higher.
- **iOS:** the SanarKit Swift Package, tag **2.1.1**, and its README dated 2025-09-02. iOS 17.5 or later, Xcode 16.4 or later.
- **Android:** the `.aar` **2.1.1**. Minimum SDK 24.
- **Web:** not covered.

When an SDK releases a new version, its references are updated together with the docs. Step 2 says what to do when the installed version differs.

## Reference files

Each file is linked here directly. Read only the ones for the detected SDK, and only when a step points to them.

### React Native

| File | Read it when |
| --- | --- |
| [rn-installation.md](references/rn-installation.md) | Installing: requirements, Expo, monorepos, package managers, peer dependencies, New Architecture |
| [rn-connect.md](references/rn-connect.md) | Setting the environment and calling `connect`, and the member fields |
| [rn-permissions.md](references/rn-permissions.md) | Adding the iOS and Android camera and microphone permissions |
| [rn-troubleshooting.md](references/rn-troubleshooting.md) | The install, build or `connect` fails |
| [rn-sharing.md](references/rn-sharing.md) | The app needs to share a link from its own screens |
| [rn-component-skdashboard.md](references/rn-component-skdashboard.md) | Adding `SKDashboard` |
| [rn-component-skservice.md](references/rn-component-skservice.md) | Adding `SKService` for one service |
| [rn-component-skappointments.md](references/rn-component-skappointments.md) | Adding `SKAppointments` |
| [rn-component-skconsultation.md](references/rn-component-skconsultation.md) | Adding `SKConsultation` |
| [rn-component-itcbooking.md](references/rn-component-itcbooking.md) | Adding `ITCBooking` |
| [rn-component-sanarrtc.md](references/rn-component-sanarrtc.md) | Adding `SanarRTC` for video calls |

### iOS

| File | Read it when |
| --- | --- |
| [ios-installation.md](references/ios-installation.md) | Adding the Swift Package, the minimum iOS version and the permission strings |
| [ios-connect.md](references/ios-connect.md) | Setting the environment and calling `SKManager.connect` |
| [ios-troubleshooting.md](references/ios-troubleshooting.md) | The build or `connect` fails |
| [ios-view-dashboardview.md](references/ios-view-dashboardview.md) | Adding `DashboardView` |
| [ios-view-serviceview.md](references/ios-view-serviceview.md) | Adding `ServiceView` |
| [ios-view-instantconsultationview.md](references/ios-view-instantconsultationview.md) | Adding `InstantConsultationView` |
| [ios-view-bookinglistview.md](references/ios-view-bookinglistview.md) | Adding `BookingListView` |
| [ios-view-consultationview.md](references/ios-view-consultationview.md) | Adding `ConsultationView` |

### Android

| File | Read it when |
| --- | --- |
| [android-installation.md](references/android-installation.md) | Adding the `.aar`, the Gradle dependency and the permissions |
| [android-connect.md](references/android-connect.md) | Creating the `SanarKit` instance and calling `connect` |
| [android-troubleshooting.md](references/android-troubleshooting.md) | The build or `connect` fails |
| [android-screen-gotodashboardview.md](references/android-screen-gotodashboardview.md) | Calling `gotoDashboardView` |
| [android-screen-gotobookingview.md](references/android-screen-gotobookingview.md) | Calling `gotoBookingView` |
| [android-screen-gotoappointmentlistview.md](references/android-screen-gotoappointmentlistview.md) | Calling `gotoAppointmentListView` |
| [android-screen-gotoconsultationview.md](references/android-screen-gotoconsultationview.md) | Calling `gotoConsultationView` |
