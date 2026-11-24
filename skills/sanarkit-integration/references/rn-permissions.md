# React Native permissions

Add the camera and microphone permissions that SanarKit video consultations need, on iOS and on Android, and set up `react-native-permissions` for iOS. Rebuild the native apps afterwards, because a JavaScript reload is not enough.

These are the entries from the SDK 3.2.0 README, checked against the Sanar developer docs. Add what is missing and leave the rest of each file alone.

## Rules

- **Check who owns the native files.** In an Expo project, run `git ls-files ios android | head -1`. If it prints a file, Git tracks the native folders and you edit them directly. If it prints nothing, they are generated: use the Expo config section below and do not edit them.
- **Merge, do not duplicate.** Read the file first. If the app already declares a key or a permission, leave it as it is. If the app already has a `setup_permissions` call in its `Podfile`, add `'Camera'` and `'Microphone'` to that list.
- **Wording is the app's.** The `Info.plist` strings are shown to the member. Use the wording the developer prefers, in the app's language. If they have no preference, use the text below.
- **Ask before you replace** an existing usage description. The app may already use the camera for something else.

## iOS: `Info.plist`

Add both keys to `ios/<AppName>/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access lets you take part in video consultations.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access lets you take part in video consultations.</string>
```

Without them, iOS can end the app when a call asks for the camera or the microphone.

## iOS: `Podfile` setup for `react-native-permissions`

SanarKit asks for permission through `react-native-permissions`. Enable the Camera and Microphone permissions for it in `ios/Podfile`.

1. Add the setup script near the top of the `Podfile`, before the `target` block:

   ```ruby
   require_relative '../node_modules/react-native-permissions/scripts/setup'
   ```

2. Enable the permissions:

   ```ruby
   setup_permissions([
     'Camera',
     'Microphone',
   ])
   ```

3. Install the pods again (the app's usual command, for example `bundle exec pod install` if it has a `Gemfile`):

   ```sh
   cd ios && pod install
   ```

   If Bundler or the `Gemfile` cannot run (for example an old system Ruby), plain `pod install` is acceptable. If the app has the New Architecture off, put `RCT_NEW_ARCH_ENABLED=0` in front of it (`rn-installation.md`, "New Architecture").

   **Run `pod install` again after any later npm install.** `setup_permissions` rewrites a podspec inside `node_modules` (the one of `react-native-permissions`), and an install can put the original file back, so the pods would lose the Camera and Microphone permissions until `pod install` runs again.

Check these before you edit:

- **The path.** `../node_modules/...` assumes `node_modules` sits next to `ios/`. In a monorepo, or with pnpm, the package may be somewhere else. Check that the file `scripts/setup.rb` exists at the path you write, and look at how the `Podfile` already finds React Native (the `require` or `require_relative` lines at its top) to copy the same style.
- **The version.** `setup_permissions` comes with the current `react-native-permissions`, which `npx sanarkit-setup` installs because the peer range is `*`. If `node_modules/react-native-permissions/scripts/setup.rb` does not exist, the app has an older version. Tell the developer and ask, and do not rewrite the `Podfile` in the old style.
- **Other permissions.** If `setup_permissions` already lists others (Location, Notifications, and so on), keep them.

## Android: `AndroidManifest.xml`

Add these inside the `<manifest>` element of `android/app/src/main/AndroidManifest.xml`, next to the other `uses-permission` lines:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<!-- Only Android 9 and earlier: files the consultation chat downloads, and photos it takes on Android 5. -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
```

These five are the SDK's list. Add exactly these, and skip any that the manifest already has. Do not add permissions that SanarKit does not list, and never add `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO` for SanarKit. `npx sanarkit-setup --doctor` also names `MODIFY_AUDIO_SETTINGS`: `react-native-agora`'s own manifest provides it, so it is not in this list. If the doctor reports it as not declared, `react-native-agora` is not installed.

SDK 3.1.5 and earlier listed `READ_EXTERNAL_STORAGE` and a `WRITE_EXTERNAL_STORAGE` without a limit. SanarKit never asks for either. If the manifest has them from an earlier integration, tell the developer that `READ_EXTERNAL_STORAGE` can go and `WRITE_EXTERNAL_STORAGE` can take `android:maxSdkVersion="28"`, unless the app uses them for its own features. Ask before you change them.

## Android: SanarKit's call service (SDK 3.2.0)

From 3.2.0 SanarKit has Android code: a foreground service, of type `microphone`, that keeps a video call running while the member is out of the app, for example while they take a photo with the camera from the consultation chat. SanarKit's own manifest adds it, with the `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_MICROPHONE` permissions, when the app is built. Do not add them, and do not remove them with `tools:node="remove"`. Rebuild the Android app after the install or the upgrade, because a JavaScript reload does not include it.

`react-native-agora` brings Agora's screen-sharing extension into the app: a `mediaProjection` foreground service and the `FOREGROUND_SERVICE_MEDIA_PROJECTION` permission. SanarKit never shares the screen, and its manifest removes Agora's service. **Ask the developer whether the app shares or records the screen** for its own features. If it does not, add the line below, so Google Play has no `mediaProjection` type to ask about. Put the `tools` namespace on the `<manifest>` element if it is not there yet:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" tools:node="remove" />
</manifest>
```

If the app shares or records the screen, leave the permission alone: the developer keeps declaring that feature in Google Play.

**An app without video calls.** If the app never renders `SanarRTC` (it uses only `SKDashboard`, `SKService`, `SKAppointments`, `SKConsultation` or `ITCBooking`), offer to leave SanarKit's Android code out, so the app has no microphone service to declare. On a yes, add this to `react-native.config.js` at the app root (merge it into an existing `dependencies`, or create the file), and rebuild:

```js
module.exports = {
  dependencies: {
    '@maren-sa/react-native-sanarkit': {
      platforms: { android: null },
    },
  },
};
```

SanarKit then does not remove Agora's screen-sharing service either, so also add `<service android:name="io.agora.rtc2.extensions.MediaProjectionMgr$LocalScreenSharingService" tools:node="remove" />` under `<application>`, next to the permission line above. `npx sanarkit-setup --doctor` reports whether both are gone.

## Expo projects with generated native folders

This applies when the project has an `expo` dependency and Git does not track the native folders: they are absent, or ignored (`git ls-files ios android | head -1` prints nothing). A later `npx expo prebuild` regenerates them and overwrites hand-edited native files. In that case do not edit `Info.plist`, `AndroidManifest.xml` or the `Podfile`. Put the permissions in the Expo config. Ask the developer first, because this edits `app.json` (or `app.config.js`, `app.config.ts`).

If Git tracks `ios/` and `android/`, the project is treated as bare React Native: edit the native files as described above.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Camera access lets you take part in video consultations.",
        "NSMicrophoneUsageDescription": "Microphone access lets you take part in video consultations."
      }
    },
    "android": {
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.RECORD_AUDIO",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.CAMERA"
      ],
      "blockedPermissions": ["android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION"]
    },
    "plugins": [
      ["react-native-permissions", { "iosPermissions": ["Camera", "Microphone"] }]
    ]
  }
}
```

Merge these into the keys the file already has (an existing `plugins` or `permissions` array gets the new entries added). `blockedPermissions` takes the place of the `tools:node="remove"` line, so leave it out when the app shares or records the screen. The `permissions` list cannot carry `android:maxSdkVersion`, so `WRITE_EXTERNAL_STORAGE` (Android 9 and earlier only) is left out: if the app supports those versions and the consultation chat must download files there, tell the developer. The Expo keys, `blockedPermissions`, whether Expo's autolinking honours a `react-native.config.js` opt-out, and the `react-native-permissions` plugin options are general Expo knowledge and not part of the SanarKit docs, so they are **to confirm**: check the installed `react-native-permissions` README for the plugin, and the Expo docs for the app's SDK. When the native folders are generated, the `Podfile` and the manifest come from this config, so you do not edit them by hand. Run the prebuild (after you have asked) so that the config takes effect.

## What the SDK does at runtime

When a video call rings, SanarKit asks for the microphone permission if the member has not answered it yet, and on Android 12 and later for the Bluetooth permission. Bluetooth never blocks a call. Accept checks the microphone again without a new prompt. If it is not granted, SanarKit shows "Please enable required permission in settings" with a button to the device settings, and the call is not accepted until it is granted. Closing that message leaves the call ringing; it does not decline it. The camera is not asked for at the ringer: a video call starts with the camera on only if the permission is already granted, and the member is asked when they turn the camera on from the call controls.

This is the behavior of SDK 3.1.0. Earlier versions asked for the camera, the microphone and Bluetooth together at the ringer.

From SDK 3.2.0, on Android, a "Call in progress" notification shows while a call runs (generic text without the doctor's name, in Arabic for Arabic sessions), and tapping it returns to the app. It needs no notification permission: if the member has not allowed notifications, it is hidden and the call still continues.

## Store submission

You cannot do this part: it happens in the developer's store consoles. Tell the developer in the report.

- **Google Play, from SDK 3.2.0, in an app that renders `SanarRTC`:** the app now has a foreground service of type `microphone`, and Google Play asks for a declaration before the next upload, in Play Console under **Monitor and improve > App content > Foreground service permissions**. The use case is **Background Audio Access**. The description says that the member's speech keeps reaching the doctor while they take a photo from the consultation chat or briefly leave the app, and the video shows exactly that on two test devices. The installed package's README has the text to adapt, under "Store submission": `node_modules/@maren-sa/react-native-sanarkit/README.md`.
- **Google Play, screen sharing:** with the permission line above, the app has no `mediaProjection` type to declare.
- **App Store:** nothing new from SanarKit. Keep the camera and microphone usage descriptions specific to consultations with a doctor.

## Rebuild

After the changes:

```sh
npx react-native run-ios
npx react-native run-android
```

In an Expo project, use the development build commands instead (`npx expo run:ios` and `npx expo run:android`), or build a new EAS development build.

## Verify

- `Info.plist` contains both usage description keys, and the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`.
- `AndroidManifest.xml` contains the five permissions, each once, and, unless the app shares or records the screen, the `FOREGROUND_SERVICE_MEDIA_PROJECTION` removal line. It does not remove `FOREGROUND_SERVICE` or `FOREGROUND_SERVICE_MICROPHONE`.
- `git diff` shows only these files changed in this step.
- `npx sanarkit-setup --doctor`, run from the app root, reports no iOS or Android permission error, and reports Agora's screen-sharing service as removed. It reads `Info.plist`, the `Podfile`, `Podfile.lock` and the manifest, and changes nothing. In an Expo project with generated native folders it can only check them after a prebuild.
- You cannot check the prompts without a call. If you could not start a call, say that you did not verify the runtime permission prompts.
