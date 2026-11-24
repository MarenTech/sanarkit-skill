# React Native troubleshooting

Fixes for the problems you meet when you install, build or connect SanarKit 3.2.0 in a React Native app, or when a video call does not work. Find the symptom, try the fix, and report what you changed. When you search the logs for a message, search for the exact text: the SDK writes its warnings to the console, and some of them contain typos that are part of the message.

Before you change anything that is not in the integration (dependencies, native settings, Gradle, Podfile), tell the developer and ask.

Every `pod install` in this file follows two rules. If the app has the New Architecture off, put `RCT_NEW_ARCH_ENABLED=0` in front of it. If the app has a `Gemfile`, the usual command is `bundle exec pod install`, but if Bundler or the `Gemfile` cannot run (for example an old system Ruby), plain `pod install` is acceptable. `rn-installation.md` has the details.

## Start here: the doctor and the SDK's own diagnostics

To check a whole integration that already exists, follow the diagnose reference (`rn-diagnose.md`) instead: it has the full procedure and the report layout. To move a misplaced `SanarRTC`, follow the fix-placement reference (`rn-fix-placement.md`).

SanarKit 3.1.0 can check an integration itself. Use these before you read code or guess. Earlier versions have neither.

### In the project: `npx sanarkit-setup --doctor`

Run it from the app root. It reads the project, installs and changes nothing, works with every package manager, and exits with code 1 when it finds an error, so it also fits a CI job. It prints its findings in groups, each with a fix where there is one:

- **Versions and Dependencies:** the React Native and React versions, every peer dependency against SanarKit's range, and a leftover `sanar-rtc`. A peer outside its range is a warning, except `react-native-agora`, which is an error. A warning about a version that the developer chose on purpose (for example `react-native-svg` 15, see "Build") is expected: report it, and do not change the version back.
- **iOS:** `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` in `Info.plist`, `setup_permissions` with `'Camera'` and `'Microphone'` in the `Podfile`, and the `react-native-agora` and `react-native-permissions` pods in `Podfile.lock`.
- **Android:** `CAMERA`, `RECORD_AUDIO`, `INTERNET` and `MODIFY_AUDIO_SETTINGS` are declared or come from `react-native-agora`'s manifest, none is removed with `tools:node="remove"`, and `BLUETOOTH_CONNECT` is declared.
- **New Architecture:** whether it is on, for each platform. This is information only. The rule in `rn-installation.md` still applies.
- **Placement:** whether `<SanarRTC />` is rendered not at all, more than once, or in what looks like a screen. "Not rendered" is expected when the developer did not ask for video calls.

Fix what your integration caused. For everything else, tell the developer the finding and its fix, and ask before you change it.

### In the running app: `SanarKit.setDebug` and `SanarKit.diagnose()`

- `SanarKit.setDebug(true)` (or `__DEV__`), called once at startup, prints the SDK's debug logs to the console. Warnings and errors are printed without it. The lines start with `[SanarKit][RTC]`, `[SanarKit][Agora]`, `[SanarKit][Socket]`, `[SanarKit][SDK]`, `[SanarKit][Permissions]`, `[SanarKit][Layout]` or `[SanarKit][Diagnose]`.
- `await SanarKit.diagnose()` checks the running app without prompting, logs each finding, and returns `{ ok, errors, warnings, checks: [{ id, status, message, fix? }], timestamp }`. `status` is `ok`, `info`, `warn` or `error`. With `setDebug(true)` called before `SanarRTC` is enabled, it also runs by itself about 3 seconds after `SanarRTC` is first enabled.

| Check `id` | What it tells you |
| --- | --- |
| `platform` | OS, React Native and React versions, and whether the New Architecture is on (information only) |
| `environment` | The SanarKit environment. A warning when a release build is not on `production` |
| `session` | Whether `SanarKit.connect()` succeeded |
| `socket` | Whether the messaging connection that delivers incoming calls is up |
| `sanar_rtc_mounted` | Whether `SanarRTC` is mounted exactly once |
| `sanar_rtc_listening` | Whether `SanarRTC` is enabled and listening on the current connection |
| `sanar_rtc_layout` | Whether `SanarRTC` covers the screen |
| `permission_microphone`, `permission_camera`, `permission_bluetooth` (Android) | The permission status. `unavailable` for the microphone or camera usually means a missing `Info.plist` key, `Podfile` entry or manifest permission, and the `fix` says which |

Neither check can verify the call token or the developer's backend. The log entries leave out the call token, the session token and the Agora app ID, so they can be shared with the Sanar team. Never add the client ID or member details to them.

## Install

### The install fails with a git or github.com error

SanarKit depends on `sanar-dynamic-components`, which the package manager fetches from a public GitHub repository. The machine needs `git` installed and access to github.com. A proxy, a firewall or a CI sandbox that blocks github.com is the usual cause. Do not work around it by installing SanarKit from GitHub.

### The install fails for the `@maren-sa` scope (authentication or not found)

The SDK's own guide says the scope is private and needs an npm token from Sanar. An anonymous lookup currently succeeds, so whether a token is needed is to confirm. Stop and ask the developer to get access from the Sanar team. Never write a token into a file that Git tracks.

### `npm install` fails with `ERESOLVE` and names `react-native-reanimated`

The command is installing SanarKit 3.1.1 or earlier. Those versions declared `react-native-reanimated` (`>=3.1.0`) as a peer, and npm 7 and later picks the newest Reanimated in that range, which can need a newer React Native than the app has. On React Native 0.79.5 and 0.81.6 it picked Reanimated 4.7.1 (peer React Native 0.86 to 0.88).

SanarKit 3.1.2 and later do not declare Reanimated. Install the current version by itself, then run `npx sanarkit-setup`. **Never use `--force` or `--legacy-peer-deps`.** If the developer has to stay on 3.1.1 or earlier, name a Reanimated version that fits the app's React Native in the same command, and ask the developer which.

### Another peer dependency conflict

Read which package the error names, and compare its installed version with the ranges in `rn-installation.md`. `npx sanarkit-setup` only installs peers that are missing. It never changes one the app already has. `react-native-svg` is the usual case: SanarKit declares `^12.1.0`, which does not compile on React Native 0.81 (see the entry under "Build"). **Never use `--force` or `--legacy-peer-deps`.** Add an `overrides` entry (or another manager's override) only after you have asked the developer.

### A second lockfile appeared (`package-lock.json` in a pnpm, yarn or bun project)

`npx sanarkit-setup` was run on a project that is not npm, or on yarn from a folder without `yarn.lock`. It only detects yarn from a `yarn.lock` in the folder where it runs, and otherwise uses npm. Tell the developer. Delete the stray untracked lockfile, check that `node_modules` still matches the real lockfile (reinstall with the project's own manager if needed), and install the peers with the project's manager as `rn-installation.md` describes.

### `sanarkit-setup` ends with an error because the `ios` folder is missing

The script ran `cd ios && pod install` and the shell reported that the `ios` folder does not exist (the wording depends on the shell). The project has no `ios/` folder. This is an Expo project without generated native folders. The peers were already installed before this step. Ask the developer before running `npx expo prebuild`, as `rn-installation.md` says.

### A native module is missing, or the app crashes at start in Expo Go

SanarKit and its peers need native code, and Expo Go does not contain it. The app must run from a development build. Explain this to the developer, and ask before you run `npx expo prebuild` or add `expo-dev-client`.

## Build

### The iOS build fails

1. Clean the build folder:

   ```sh
   cd ios && rm -rf build/
   ```

2. Remove the pods and install them again:

   ```sh
   cd ios && rm -rf Pods Podfile.lock && pod install
   ```

   Ask before you delete `Podfile.lock` in a project that tracks it, because the pod versions will change. With the New Architecture off, use `RCT_NEW_ARCH_ENABLED=0 pod install`.

3. Reset the Metro cache if the error remains:

   ```sh
   npx react-native start --reset-cache
   ```

### Xcode 27: `fmt` fails with `call to consteval function ... is not a constant expression`

**This is a toolchain issue, not a SanarKit one.** It breaks the iOS build of a fresh React Native 0.81 app on Xcode 27 (Apple clang 21) **before SanarKit is installed**, so check for it on the baseline build. Search the log for `is not a constant expression`: the error is in `Pods/fmt/include/fmt/format-inl.h` and the failing target is `fmt`. The `fmt` pod is version 11.0.2, which React Native 0.81.6 bundles. It was seen with the New Architecture off and on. Whether other Xcode versions are affected is to confirm.

Do not try to pass `-DFMT_USE_CONSTEVAL=0`: `fmt/base.h` defines that macro itself, without checking for an existing value, so the flag would be overridden (read in the header; not tried). Building the `fmt` target as C++17 does turn `consteval` off.

**Ask the developer first.** The fix is a change to the app's `Podfile`, outside the integration. If they agree, add this block inside the existing `post_install do |installer| ... end`, **after** the `react_native_post_install(...)` call, because that call sets the C++ standard to C++20 and would overwrite it if it ran later. It touches only the `fmt` target:

```ruby
    # TOOLCHAIN WORKAROUND: fmt 11.0.2 fails to compile with
    # Apple clang 21 (Xcode 27): "call to consteval function ... is not a constant expression".
    # Build fmt as C++17 so fmt disables consteval (FMT_USE_CONSTEVAL=0). Must run after
    # react_native_post_install, which sets CLANG_CXX_LANGUAGE_STANDARD to c++20.
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |config|
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
```

Then run `pod install` again (with `RCT_NEW_ARCH_ENABLED=0` in front if the app has the New Architecture off) and rebuild. This worked in the end-to-end runs (React Native 0.81.6, Xcode 27, iOS Simulator builds, New Architecture off and on): both blank apps failed without it and built with it. Tell the developer that the `Podfile` now has a workaround they may remove once React Native bundles a newer `fmt`. On Xcode 27 the `react-native-device-info` entry below is the second iOS error you may meet, and its block goes in the same `post_install`.

### Xcode 27: `IPHONEOS_DEPLOYMENT_TARGET is set to 9.0` (`react-native-device-info`)

Xcode 27 stops the build with an error that the iOS deployment target of a Pods target is set to 9.0 and that the supported range starts at 15.0. The exact wording differs between Xcode versions, so search the log for `is set to 9.0`. The target is the privacy-bundle target of `react-native-device-info` (seen with 15.0.2): its podspec declares iOS 9.0, and Xcode 27 rejects anything below 15.0. This is not a SanarKit error. It was seen with the New Architecture off and on.

`rm -rf Pods Podfile.lock && pod install` does **not** help, because the podspec itself declares 9.0 and every `pod install` writes it back.

**Ask the developer first.** The fix is a change to the app's `Podfile`, outside the integration. If they agree, add this block inside the existing `post_install do |installer| ... end`, **after** the `react_native_post_install(...)` call. It raises only the Pods targets that are below `min_ios_version_supported` and leaves every other target as it is:

```ruby
    # TOOLCHAIN WORKAROUND: some pods (for example the RNDeviceInfo privacy bundle) declare an iOS
    # deployment target below what Xcode 27 supports (15.0), which fails the build:
    # "IPHONEOS_DEPLOYMENT_TARGET is set to 9.0, but the range of supported deployment target
    # versions is 15.0 to 27.0.x". Raise any Pods target below the app's minimum to the minimum.
    min_ios = Gem::Version.new(min_ios_version_supported)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && Gem::Version.new(current) < min_ios
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_version_supported
        end
      end
    end
```

Then run `pod install` again and rebuild. This worked in the end-to-end runs (React Native 0.81.6, Xcode 27, iOS Simulator builds). A temporary check without editing the `Podfile` is to pass `IPHONEOS_DEPLOYMENT_TARGET=15.1` to `xcodebuild`, which also built. Tell the developer that the `Podfile` now has a workaround they may remove once `react-native-device-info` raises its target.

### The app does not launch on the iOS 27.0 simulator: "UIScene life cycle is required"

**This is a toolchain issue, not a SanarKit one.** In testing, a React Native 0.81.6 app closed at launch on the iOS 27.0 simulator runtime with a message that the UIScene life cycle is required. It happens before any JavaScript runs, and the cause looks unrelated to SanarKit, but it was seen in an app that already had SanarKit and was not checked with a copy that has none, so that is to confirm. A React Native 0.81.6 app with SanarKit started on the iOS 26.5 simulator runtime.

**Ask the developer first.** Use an older simulator runtime (for example iOS 26.5), or adopt the UIScene life cycle in the app's native iOS code, which changes the app's own files. Whether the React Native 0.81 template launches on iOS 27.0 without that change is to confirm. Do not edit the app's `AppDelegate` or `Info.plist` for this unasked.

### `'AgoraRtcKit/AgoraRtcEngineKit.h' file not found`

The Agora pod is not installed properly. Integrate the pods again:

```sh
cd ios
pod deintegrate
pod install
cd ..
```

### The Android build fails

1. Clean the Gradle build:

   ```sh
   cd android && ./gradlew clean
   ```

2. Rebuild the app.

### The Android build fails in `react-native-svg` on React Native 0.81

Gradle fails while it compiles `react-native-svg` 12.x, with errors such as `com.facebook.react.common.StandardCharsets` cannot be found, and an access error on `setPointerEvents`. It was seen on React Native 0.81.6 with `react-native-svg` 12.5.1 (the version that fits SanarKit's declared peer, `^12.1.0`), with the New Architecture off and on, so it is not specific to the New Architecture. In the run with the New Architecture off it was the only module that failed (checked with Gradle's `--continue`).

SanarKit uses `react-native-svg` only for the icons of the call UI (the `SanarRTC` ringer and controls), but it imports the library when the SDK loads, so the library has to build even in an app that never shows a call.

The end-to-end runs tried `react-native-svg` **15.16.0** (its README says `>=15.16.0` supports React Native `>=0.80`). Both platforms built, with the New Architecture off and on. But 15.x is **outside the SDK's declared range (`^12.1.0`)**, and nobody has run it on a device, so whether it works at run time is **to confirm with the Sanar team**.

**Ask the developer before you apply it.** Say that it is outside the SDK's range, that it is unverified at run time, and that the Sanar team should confirm it. If they agree (npm):

1. Edit the app's `package.json` first, with **both** changes before any install: the direct dependency `"react-native-svg": "^15.16.0"` in `dependencies`, and an `overrides` entry that tells npm to use the app's own version for the SDK's peer:

   ```json
   "overrides": {
     "@maren-sa/react-native-sanarkit": {
       "react-native-svg": "$react-native-svg"
     }
   }
   ```

   Both are needed, and they go in together. `$react-native-svg` only resolves while the direct dependency is in `package.json`. In the end-to-end run a plain `^15` install without the override left a stale `node_modules` and a lockfile that `npm ci` rejects. Do not run a separate `npm install react-native-svg@^15...` first.
2. Run one `npm install`.
3. Check with `npm ls react-native-svg`. The end-to-end app ended with `react-native-svg@15.16.0 overridden` under the app, and `react-native-svg@15.16.0 deduped` under `@maren-sa/react-native-sanarkit`, and no `invalid` or `ERESOLVE` error. Then run `pod install` again and rebuild both platforms.

Only the npm form was tried. For yarn, pnpm and bun, the override is the manager's own mechanism, and it was not tried: **to confirm** before you use it. Never use `--force` or `--legacy-peer-deps`.

### `Duplicate class io.agora.rtc...` on Android

Two copies of the Agora library are in the build. Clean the Gradle build and its cache, then rebuild:

```sh
cd android
./gradlew clean
./gradlew cleanBuildCache
cd ..
```

If the app was upgraded from an older SDK, also check that the old `sanar-rtc` package is gone.

### `RtcEngine.create is not a function`

The app still has the old `sanar-rtc` package. Remove it completely with the app's package manager, then install the peers again (`npx sanarkit-setup`, or the manual steps on pnpm). SanarKit now uses `react-native-agora`.

### A Reanimated error, or a version mismatch

SanarKit does not use Reanimated, and from 3.1.2 it does not declare it as a peer. A Reanimated error comes from the app's own Reanimated version not matching its React Native version, or from native code that was not rebuilt after the version changed ("mismatch between the JavaScript part and the native part"). It is not an integration error: tell the developer, and do not change their Reanimated version.

## Connect and session

### `connect` returns `status: false`

`connect` did not throw, and Sanar refused the request. `message` holds Sanar's error message. Check:

- The client ID is the one for the environment that is set. Each environment needs its own client ID. Do not read the client ID back into the chat to check it.
- `SanarKit.setEnvironment` ran before `connect`.
- Every field of the member object has a value, and `dob` is written as `yyyy-mm-dd`.
- The client ID is not still the placeholder from the config file.

Whether Sanar ties a client ID to the app's bundle ID or application ID is to confirm. The SDK sends the bundle ID with every `connect`. If `connect` is refused and everything above is right, ask the Sanar team.

### `connect` throws

A rejected promise means the request did not complete or the answer could not be read. Check that the device has a network connection, and that the Android manifest has `android.permission.INTERNET`. Wrap `connect` in `try`/`catch`.

### "Not connected to Sanar Sarvices!" in the console

A component opened while there was no session, so it logged this warning and called `onEndFlow` at once. The typo is the SDK's own. The usual causes:

- `connect` has not finished, or it failed. Enable the component only after `connect` succeeds.
- `SanarKit.disconnect()` was called. Setting `SanarRTC`'s `enable` to `false` also calls it, and that ends the session for every component.
- The app restarted. The SDK keeps the session in memory only, so call `connect` again.

### `staging` behaves like `development`

In SDK 3.2.0, `setEnvironment('staging')` uses the development host. Treat the two as the same.

### After a user switch, the earlier member's connection stays open

Before SDK 3.1.5, `connect` did not close the real-time connection of an earlier session. From 3.1.5 a repeated `connect` replaces the connection and closes the old one, and `SanarRTC` moves to the new one. For another member, still call `SanarKit.disconnect()` before the new `connect`, so the earlier member's session ends. On 3.1.4 and earlier, if the app uses `SanarRTC`, set its `enable` to `false` first, and to `true` again after the new `connect` succeeds.

## Components

### A component opens once and never again

The component only looks at `enable` when its value changes. If `onEndFlow` does not set `enable` back to `false`, the next `enable={true}` is not a change, and nothing opens. Set `enable` to `false` in `onEndFlow`.

### The dashboard has no navigation bar

`navigationOption` is `false` by default for `SKDashboard`, `SKAppointments` and `ITCBooking`. Leaving it out hides the built-in navigation bar. Pass `navigationOption={true}` to show it. `SKService` has no `navigationOption`, so passing it changes nothing.

### `SKService` closes straight away

`SKService` calls `onEndFlow` at once, and logs "Service not found!" or "Not connected to Sanar Sarvices!", when the session has no service with the `type` that was passed. Check that the value is a `SERVICE_TYPE` member, and ask the developer whether that service is enabled for their client ID (to confirm with the Sanar team).

### `SKService` opens the old service after `type` changes

`type` is read when `enable` becomes `true`. Close the service first, then open the next one. Rendering `SKService` only while a service is chosen avoids the problem.

### A component fills only part of the screen

Each component fills the view it is rendered in, not the whole window. Render it in a view that fills the screen, for example directly in the screen's root `View`, and not inside a `ScrollView` or a small container. For a full-screen result, give it its own screen without a header.

### `SKConsultation` does not load

Its screen is a hosted component that the SDK downloads when it renders. Check that:

- `SanarKit.setEnvironment` ran before the component rendered. `production` and every other environment load the component from different hosts.
- The device has a network connection, and nothing blocks outbound HTTPS to Sanar. The hosts to allow are to confirm.

If it still does not load, ask the developer to contact the Sanar team. What `SKConsultation` shows when the download fails, and what it does without a session, is to confirm.

### Sharing does nothing

Only `SKDashboard`, `SKService`, `SKAppointments` and `ITCBooking` handle share requests from Sanar pages. If sharing fails, the SDK logs `SanarKit: unable to share URL` with an error code, and carries on.

## Video calls

### The ringer never appears

Work through the list:

1. `SanarRTC` is mounted once, at the app root.
2. `enable` follows the result of `SanarKit.connect`. `SanarRTC` attaches its listeners at the moment `enable` becomes `true`, and only if a session exists then. If `enable` was already `true` before `connect` succeeded, it never attached them.
3. `enable` has not been set to `false` since. That calls `SanarKit.disconnect()`, which ends the session.
4. A doctor started the call. Members do not start calls with `SanarRTC`.
5. The app is in the foreground, or was just opened from a call notification. For a member whose app is suspended or closed, the developer needs their own notification path. That is outside this integration. If the ringer is missing only when the app opens from a call notification, see "The ringer does not show after the app opens from a call notification" below.

On SDK 3.1.0, `SanarKit.diagnose()` answers points 1 to 3 directly: see `session`, `socket`, `sanar_rtc_mounted` and `sanar_rtc_listening` in "Start here". On SDK 3.1.4 and earlier, a `sanar_rtc_listening` error that names an old messaging socket means `connect` was called again while `enable` stayed `true`: set `enable` to `false`, call `connect`, and set `enable` to `true` once it resolves with `status: true`. SDK 3.1.5 and later move `SanarRTC` to the new connection, so that error no longer comes from a repeated `connect`.

### The ringer does not show after the app opens from a call notification

The member taps a call notification, the app opens (from killed, or from the background), and no ringer appears, although calls ring while the app is in the foreground.

1. **Upgrade first.** SDK 3.1.4 and earlier drop a call that the Sanar connection delivers before `SanarRTC` is listening, which is exactly what happens as the app opens. SDK 3.1.5 and later hold such a call for up to 60 seconds and rings once `SanarRTC` is enabled and listening. Check the installed version and, with the developer's go-ahead, follow the upgrade reference.
2. **Add no app code for it.** Do not add a notification handler that calls `SanarKit.handleIncomingCall`. It is an optional hand-off for a future option (the payload must carry the recipient's `uid`, and it rings only for that user), and the app does not need it.
3. **Still no ringer on 3.1.5 or later.** Turn on `SanarKit.setDebug(true)` and open the app from the notification again. If there is no `Incoming call (socket)` line, the Sanar service did not send the `VIDEO_CALL` message again after the app reconnected, and nothing in the app can bring it back. Report it for the Sanar team, with the console lines and the time of the call. Also check that the call was still ringing: a call older than 60 seconds, or one the doctor already ended, does not ring, and neither does one received for another member than the one now connected.

### The ringer shows, but nothing appears after Accept

The member taps Accept, the ringer goes away, and no call screen appears.

1. **Check the SDK version.** This is how SDK 3.0.1 and earlier behave when the call cannot be joined: they show nothing until the join is confirmed, and report no error. On React 19 (React Native 0.78 and later) those versions also lose their default props. SDK 3.1.0 shows "Connecting" at once, and a failure screen if the call cannot be connected. If the installed SDK is older, report it and ask before upgrading.
2. **On 3.1.0, read what the SDK reports.** Look at the `onError` callback and the `CALL_FAILED` status, and at the `[SanarKit][RTC]` and `[SanarKit][Agora]` console lines with `SanarKit.setDebug(true)`. "Call failed" below explains each stage.
3. **Run both checks** from "Start here". A `SanarRTC` that is mounted in a screen, mounted twice, or that does not cover the screen can lose or hide the call screen.
4. **Look for a view on top.** See "The call screen is hidden behind another view" below.

### Call failed: `onError`, `CALL_FAILED`, or the "Call could not be connected" screen

SDK 3.1.0 shows "Call could not be connected" (or "Call disconnected" during a call), sends `CALL_FAILED` to `onCallStatusChange`, and calls `onError` with `{ stage, code?, message }`:

| `stage` | What to check |
| --- | --- |
| `payload` | The call Sanar sent is missing its provider ID, token or room name. Nothing in the app fixes this: report it for the Sanar team |
| `engine_init` | The call engine did not start. Check that `react-native-agora` is installed at `^4.5.3`, that the pods were installed and the app was rebuilt, and that `sanar-rtc` is gone. The doctor checks all three |
| `join` | Agora rejected the join. Report `code` and `message` for the Sanar team |
| `connection` | The connection failed before or during the call, for example an invalid or expired token, or a lost network. Check the device's network, then report `code` for the Sanar team |
| `timeout` | The call did not connect within 30 seconds of Accept. Read the `message`. "Could not join the call within 30 seconds": the member's device did not reach the call servers, so check its network first, see "Calls fail on a company network, a VPN or a proxy" below. "Joined the call, but the doctor did not join within 30 seconds": the doctor never appeared, so ask for the call to be started again |
| `callback` | One of the app's own `SanarRTC` callbacks threw. The call continues. Fix the callback |

Do not add a retry or the app's own failure screen unasked. The SDK already shows one and ends the call for the doctor.

### Calls fail on a company network, a VPN or a proxy

The ringer appears and the member accepts. After 30 seconds the member sees "Call could not be connected", and `onError` receives `timeout` with the message "Could not join the call within 30 seconds". The `[SanarKit][RTC]` line reads `Call failed (timeout): Could not join the call within 30 seconds`.

A call uses two connections. The ringer arrives over the SDK's connection to Sanar, which is ordinary web traffic (HTTPS). The audio and video travel on a separate real-time connection to Agora, the call provider. A network that filters traffic can let the first through and block the second: a company proxy, a VPN, a secure web gateway, or a firewall that inspects traffic. A simulator or an emulator uses the network of the computer it runs on, so a company laptop brings the same limits.

You cannot see the network from the project, and neither the doctor nor `diagnose()` checks it. So:

1. **Ask the developer** which network the device or the computer was on: office Wi-Fi, a VPN, a proxy or a security app, and whether the call ran on a simulator, an emulator or a real phone.
2. **Ask them to repeat the call** on a real phone on mobile data, with Wi-Fi off and any VPN or security app turned off. If the call connects, the network is the cause.
3. **Report it as a network finding, not an app finding.** The fix belongs to the team that manages the network: exclude the app's call traffic from the proxy or VPN, or allow it by following Agora's firewall requirements (`https://docs.agora.io/en/introduction/firewall`). Traffic inspection (SSL or TLS inspection) can also break the call connection, so the call traffic needs to be excluded from it too.

Do not change the app's code, its network settings or the SDK for this, and do not add a retry. If the call also fails on mobile data, the network is not the cause: collect what "Still stuck" lists for the Sanar team.

### The call screen is cropped or offset

`SanarRTC` fills the area it is rendered in. Inside a padded view, a card, or a screen below a header or above a tab bar, the call screen is cropped. SDK 3.1.0 measures the area when `SanarRTC` mounts and logs a `[SanarKit][Layout]` warning with the measured size and position, and `diagnose()` reports it as `sanar_rtc_layout`. Move `SanarRTC` to the app root, after the app's content and outside navigators, scroll views and padded containers.

### The call screen is hidden behind another view

The call screen draws above its siblings (`zIndex` 999 and, from 3.1.0, Android `elevation` 999, so a tab bar with an elevation no longer covers it). The SDK cannot detect a view drawn above it from elsewhere, such as the app's own `Modal` or a native overlay, and neither check reports it. Look at what the app renders after or above `SanarRTC`, and ask the developer before you change their screens.

### Camera, microphone or Bluetooth permission is blocked

On SDK 3.1.0, when the ringer appears `SanarRTC` asks for the microphone permission (and Bluetooth on Android 12 and later, which never blocks a call). If the microphone is not granted when the member taps Accept, the member sees "Please enable required permission in settings", and the call is not accepted until it is granted. Closing that message leaves the call ringing. The camera is asked for when the member turns it on in the call controls. `diagnose()` reports each permission, and `[SanarKit][Permissions]` lines mean a permission check itself failed, which usually points at the `react-native-permissions` setup.

If the prompt never appears, or the app closes when a call rings:

- On iOS, check that `Info.plist` has both `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. iOS can end an app that asks for the camera or microphone without them.
- On iOS, check that the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`, then run `pod install` again.
- On Android, check that the manifest has the camera, microphone and `BLUETOOTH_CONNECT` permissions.
- Rebuild the app after you change native files.
- On Expo with generated native folders (`git ls-files ios android | head -1` prints nothing), check that the permissions are in the Expo config, and that the prebuild or the development build was run again after the change. Hand edits in the generated folders are overwritten by the next prebuild.

### The call stays minimized

`isFullscreen={true}` expands a minimized call, but the SDK only reacts when the value changes. If it was already `true` when the member minimized the call, set it to `false`, then to `true`. Setting it to `false` does not minimize a call.

### A video call drops when the member opens the camera from the chat or leaves the app

On Android, SDK 3.1.5 and earlier had no foreground service, so Android could pause or close the app while the member was in another app, such as the camera opened from the consultation chat, and the call dropped. 3.2.0 keeps the call running with a foreground service.

1. Check the installed version. Below 3.2.0, recommend the upgrade (`rn-upgrade.md`), and ask.
2. On 3.2.0, check that the Android app was rebuilt: the service is native code. With `SanarKit.setDebug(true)`, the line `[SanarKit][CallService] The SanarKit Android call service is not linked…` means it was not, and `diagnose()` warns with `android_call_service`.
3. Check that the manifest does not remove `FOREGROUND_SERVICE` or `FOREGROUND_SERVICE_MICROPHONE` (the doctor warns), and that `react-native.config.js` does not leave SanarKit's Android code out in an app that has video calls.
4. During a call, the member should see a "Call in progress" notification. On a test device, `adb shell dumpsys activity services <app package> | grep SanarCallService` shows the service while it runs.
5. Other lines to look for: `[SanarKit][Agora] Lost the doctor's connection; waiting up to 25 seconds…` (the doctor's connection dropped; the call ends with `CALL_FAILED` if it does not come back), and `[SanarKit][RTC] SanarRTC unmounted during an active call` (the app unmounted `SanarRTC`, for example with a lock screen or a navigation reset when it returned).

### Google Play asks about a `mediaProjection` foreground service

That is Agora's screen-sharing extension, which `react-native-agora` adds to the app. SanarKit never shares the screen. From 3.2.0 SanarKit's manifest removes Agora's service, and the app removes the `FOREGROUND_SERVICE_MEDIA_PROJECTION` permission with one line, unless it shares or records the screen itself: see "Android: SanarKit's call service" in `rn-permissions.md`. `npx sanarkit-setup --doctor` gives the line to add.

### An error, or `'disconnect'`, right after a call ends

The member or the doctor ends a call, and straight away the app shows its own connection error, `onCallStatusChange` reports `'disconnect'`, or the next call never rings. The SDK does not end the session when a call ends, so look for app code that does:

- A screen that holds the call, or `SanarRTC`, closes when the call ends, and its cleanup calls `SanarKit.disconnect()`, for example `return () => SanarKit.disconnect()` in a `useEffect`. The SDK README showed this cleanup in its example until 3.1.4, so it is often copied into a screen.
- The app's `onCallStatusChange` handler calls `SanarKit.disconnect()`, or sets `enable` to `false`, on `CALL_END_USER`, `CALL_END_PROVIDER` or `'disconnect'`.
- `SanarRTC` is rendered only inside a call screen, so it unmounts when the call ends, and no call rings until it mounts again. Unmounting alone does not end the session: when it remounts with `enable` `true`, it listens on the same connection. It often comes with one of the causes above in the same screen's cleanup.

`disconnect` clears the session and closes the connection, and nothing opens it again: no call rings until the app sets `enable` to `false`, calls `connect` again, and sets `enable` back to `true` after it succeeds. The error the member sees comes from the app: from how it handles `'disconnect'`, or from a later `connect` or Sanar component that finds no session.

**Confirm it from the logs.** Ask the developer for the console lines from just before the call ended to just after the error, in order and with timestamps, including the app's own lines (such as its `onCallStatusChange` logs). Then read them against this table:

| SDK | What the lines show | What it means |
| --- | --- | --- |
| 3.0.1 and earlier | `Disconnected with Sanar` | `SanarKit.disconnect()` ran. Only that function prints it, also when `enable` turns `false`. Look for this line: a bare `disconnected` line may also appear, for any reason, and may be missing from a filtered log |
| 3.1.0 and later | `[SanarKit][SDK] Disconnected from SanarKit` | `SanarKit.disconnect()` ran |
| 3.1.0 and later | `[SanarKit][RTC] SanarRTC is disabled; closing the SanarKit connection` (or, during a call, the warning `[SanarKit][RTC] SanarRTC was disabled during an active call; the call is reset and the SanarKit connection is closed.`), then `[SanarKit][SDK] Disconnected from SanarKit` | `enable` turned `false`. `SanarRTC` stops listening first, so the app gets no `'disconnect'` and there is no `[SanarKit][Socket]` line |
| 3.1.0 and later | `[SanarKit][Socket] Disconnected from Sanar messaging` with reason `io client disconnect`, then `[SanarKit][SDK] Disconnected from SanarKit` | The app called `SanarKit.disconnect()` while `SanarRTC` was listening. The app gets `'disconnect'` |
| 3.1.0 and later | `[SanarKit][Socket] Disconnected from Sanar messaging` warning with reason `transport close`, `transport error` or `ping timeout` | The network dropped. The session stays, and the connection reconnects by itself |
| 3.1.0 and later | `[SanarKit][Socket] Disconnected from Sanar messaging` warning with reason `io server disconnect` | Sanar's server closed the connection. It does not reconnect by itself. Report it for the Sanar team |

On 3.1.0 the `[SanarKit][SDK]` line, the `SanarRTC is disabled` line and the `io client disconnect` line are info entries: the console prints them only with `SanarKit.setDebug(true)`, and `SanarKit.setLogger` always receives them. Warnings, such as `SanarRTC was disabled during an active call`, print without debug.

A line from `SanarKit.disconnect()` (`Disconnected with Sanar`, `[SanarKit][SDK] Disconnected from SanarKit`) or a `SanarRTC` disabled line shortly after the `CALL_END_USER` or `CALL_END_PROVIDER` line means the app's call-end handling ended the session. Confirm it in the code before you report it. A `'disconnect'` status, or a socket warning with a network or server reason, at the same moment does not prove it: the network or the server can close the connection as a call ends.

Then find the code: search for `SanarKit.disconnect(`, for what `SanarRTC`'s `enable` follows, and for the `onCallStatusChange` handler, and read what each does when a call ends.

**Fix.** Ask before you change it, and keep the rest of the app's flow:

1. Keep the session for as long as the member is signed in. Call `connect` once at the app root, and `SanarKit.disconnect()` only at sign-out or when the member changes. Remove it from screen cleanups and from the call-status handler.
2. Render `SanarRTC` once at the root, always mounted, with `enable` tied to the connected flag. Do not set `enable` to `false` when a call ends. If `SanarRTC` is in a call screen, follow the fix-placement reference.
3. Do not show members an error for `'disconnect'`, `CALL_END_USER` or `CALL_END_PROVIDER`. Log them. From 3.1.0, a failed call is `CALL_FAILED` with the details in `onError`, and the SDK shows its own failure screen.
4. If the app must end the session on purpose, it starts a new one before the next call can ring: set `enable` to `false`, call `connect`, and set `enable` back to `true` after it resolves with `status: true`. On SDK 3.1.4 and earlier, `SanarRTC` attaches its listeners only when `enable` changes, so a `connect` while `enable` stays `true` leaves it on the closed connection. From 3.1.5 it moves to the new connection, but the `enable` round trip still works.

**Verify.** End a call. No `Disconnected with Sanar` (3.0.1) or `[SanarKit][SDK] Disconnected from SanarKit` (3.1.0) line appears until sign-out, the app shows no error, and on 3.1.0 `SanarKit.diagnose()` still reports `session` and `sanar_rtc_listening` as ok. Only a doctor can start the next call, so say whether it was tested.

### `onCallStatusChange` reports `'disconnect'`

The real-time connection to Sanar closed. It is not a call status and not a call failure, so the app must not show members an error for it. It has these causes, and the log table in the entry above tells them apart:

- **The app called `SanarKit.disconnect()`**, for example in a screen's cleanup or when a call ended. The session is cleared and the connection stays closed. If it happened right after a call ended, see the entry above.
- **The app set `SanarRTC`'s `enable` to `false`.** That calls `SanarKit.disconnect()` too. On 3.0.1 and earlier the app still gets `'disconnect'`. From 3.1.0, `SanarRTC` stops listening first, so it does not.
- **The network dropped.** The session stays, and the connection reconnects by itself. Whether calls come back after that without any action from the app is to confirm.
- **Sanar's server closed the connection** (reason `io server disconnect` on 3.1.0). It does not reconnect by itself. Report it for the Sanar team.

After the app ended the session, start a new one: set `enable` to `false`, call `SanarKit.connect`, and set `enable` back to `true` after it resolves with `status: true`. After a network drop, do not call `connect` just because you saw `'disconnect'`: on 3.1.4 and earlier a second `connect` does not close the first connection and `SanarRTC` only attaches its listeners again when `enable` changes (from 3.1.5 it moves to the new connection, but the reconnect is still not needed). The `socket` check of `diagnose()` shows whether the connection is back.

### `SanarRTC` fails when a callback is left out

This is SDK 3.0.1 and earlier on React 19 (React Native 0.78 and later), where the default callbacks are lost. In SDK 3.1.0 every callback is optional, and a callback that throws is caught and reported through `onError` with stage `callback`. On an older SDK, pass both `onCallStatusChange` and `onViewModeChange`, even if they only log, or ask the developer about upgrading.

## Tests

### A Jest test fails after `App.tsx` imports the SDK

The React Native template has `__tests__/App.test.tsx`, which renders `App`. Once `App.tsx` (or a file it imports) imports `@maren-sa/react-native-sanarkit`, that test fails under Jest, for example with an error from a native module such as `react-native-permissions`: the SDK loads its native modules (Agora, permissions, WebView, and others) when it is imported, and they do not exist under Jest. This is expected and not a bug in the integration.

**Tell the developer** that the test now fails and why. **Do not add mocks unless the developer asks**, because a mock decides what the tests cover. If they ask, a minimal mock at the top of the test file is enough. Mock exactly the names the app imports from the SDK. This one covers the session provider and one component:

```js
jest.mock('@maren-sa/react-native-sanarkit', () => ({
  SanarKit: {
    setEnvironment: jest.fn(),
    connect: jest.fn(() => Promise.resolve({ status: false, message: '' })),
    disconnect: jest.fn(),
    connected: false,
  },
  SKDashboard: () => null,
}));
```

With that mock, the template's `App` test passed in the end-to-end run (React Native 0.81.6, New Architecture off).

## Still stuck

Tell the developer to contact the Sanar team and to include the items below. The diagnose reference, "Share with the Sanar team", has a report layout that collects them, and you can prepare it for the developer.

- The installed SDK version, the React Native version, the platform and OS version, and the environment that was set.
- What was expected and what happened, with the console lines from the SDK (the `[SanarKit]` lines, with `SanarKit.setDebug(true)`). Include the app's own lines around the problem, in order and with timestamps: the order shows what caused what.
- The output of `npx sanarkit-setup --doctor`, and the report from `SanarKit.diagnose()`.
- For a failed call, the `stage`, `code` and `message` that `onError` received, and the network the device was on: Wi-Fi or mobile data, and whether a VPN or a proxy was in use.
- The `message` that `connect` returned, if it did.

Never put the client ID, a member's details or a token in a message, a ticket or your own output.
