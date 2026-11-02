# React Native troubleshooting

Fixes for the problems you meet when you install, build or connect SanarKit 3.0.1 in a React Native app. Find the symptom, try the fix, and report what you changed. When you search the logs for a message, search for the exact text: the SDK writes its warnings to the console, and some of them contain typos that are part of the message.

Before you change anything that is not in the integration (dependencies, native settings, Gradle, Podfile), tell the developer and ask.

## Install

### The install fails with a git or github.com error

SanarKit depends on `sanar-dynamic-components`, which the package manager fetches from a public GitHub repository. The machine needs `git` installed and access to github.com. A proxy, a firewall or a CI sandbox that blocks github.com is the usual cause. Do not work around it by installing SanarKit from GitHub.

### The install fails for the `@maren-sa` scope (authentication or not found)

The SDK's own guide says the scope is private and needs an npm token from Sanar. An anonymous lookup currently succeeds, so whether a token is needed is to confirm. Stop and ask the developer to get access from the Sanar team. Never write a token into a file that Git tracks.

### A peer dependency conflict

Read which package the error names, and compare its installed version with the ranges in `rn-installation.md`. `npx sanarkit-setup` only installs peers that are missing. It never changes one the app already has. `react-native-svg` is the usual case: SanarKit declares `^12.1.0`, and which version to use on newer React Native versions is to confirm. Never add `--force`, `--legacy-peer-deps` or overrides without asking.

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

   Ask before you delete `Podfile.lock` in a project that tracks it, because the pod versions will change.

3. Reset the Metro cache if the error remains:

   ```sh
   npx react-native start --reset-cache
   ```

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

SanarKit declares `react-native-reanimated` (`>=3.1.0`) as a peer, and `npx sanarkit-setup` installs the version recommended for the app's React Native version. In 3.0.1 the SDK's compiled code does not import Reanimated (checked in the package's `lib/` folder), so a Reanimated error usually comes from the app's own Reanimated version not matching its React Native version.

1. Read the installed `react-native` and `react-native-reanimated` versions.
2. Compare Reanimated with the `recommended` and `compatible` values for that React Native minor in `sanarkitCompatibility` (`rn-installation.md` has the table). If the app's version is in the `compatible` list, it is fine for SanarKit.
3. If it is outside the list, **tell the developer and ask** before changing it. The app may need its Reanimated version for other reasons.
4. If the developer agrees, install the `recommended` version with the app's manager, then rebuild the native projects (`cd ios && pod install`, and `cd android && ./gradlew clean`). A "mismatch between the JavaScript part and the native part" message usually means the native app was not rebuilt after the version changed.

If React Native is not in the table (below 0.68 or above 0.81), say so. The versions are then to confirm with the Sanar team.

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

In SDK 3.0.1, `setEnvironment('staging')` uses the development host. Treat the two as the same.

### After a user switch, the earlier member's connection stays open

`connect` does not close the real-time connection of an earlier session. Call `SanarKit.disconnect()` before connecting another member. If the app uses `SanarRTC`, set its `enable` to `false` first, and to `true` again after the new `connect` succeeds.

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
5. The app is in the foreground. For a member whose app is in the background or closed, the developer needs their own notification path. That is outside this integration.

### Camera, microphone or Bluetooth permission is blocked

When the ringer appears, `SanarRTC` asks for any missing permission. If one is blocked, the member sees "Please enable required permission in settings", and the call is not accepted until it is granted.

If the prompt never appears, or the app closes when a call rings:

- On iOS, check that `Info.plist` has both `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. iOS can end an app that asks for the camera or microphone without them.
- On iOS, check that the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`, then run `pod install` again.
- On Android, check that the manifest has the camera, microphone and `BLUETOOTH_CONNECT` permissions.
- Rebuild the app after you change native files.
- On Expo with generated native folders (`git ls-files ios android | head -1` prints nothing), check that the permissions are in the Expo config, and that the prebuild or the development build was run again after the change. Hand edits in the generated folders are overwritten by the next prebuild.

### The call stays minimized

`isFullscreen={true}` expands a minimized call, but the SDK only reacts when the value changes. If it was already `true` when the member minimized the call, set it to `false`, then to `true`. Setting it to `false` does not minimize a call.

### `onCallStatusChange` reports `'disconnect'`

The real-time connection to Sanar closed. It does not mean a call ended. Either `SanarRTC`'s `enable` was set to `false` (which calls `SanarKit.disconnect()`), or the connection dropped, for example when the network was lost. Do not call `SanarKit.connect` just because you saw `'disconnect'`: a second `connect` does not close the first connection. Whether an automatic reconnection brings calls back without any action from the app is to confirm.

### `SanarRTC` fails when a callback is left out

Pass both `onCallStatusChange` and `onViewModeChange`, even if they only log. How `SanarRTC` behaves on React 19 (React Native 0.78 and later) when a callback is left out is to confirm.

## Still stuck

Tell the developer to contact the Sanar team and to include:

- The SDK version (3.0.1), the React Native version, the platform and OS version, and the environment that was set.
- What was expected and what happened, with the console lines from the SDK.
- The `message` that `connect` returned, if it did.

Never put the client ID, a member's details or a token in a message, a ticket or your own output.
