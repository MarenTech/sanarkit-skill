# React Native permissions

Add the camera and microphone permissions that SanarKit video consultations need, on iOS and on Android, and set up `react-native-permissions` for iOS. Rebuild the native apps afterwards, because a JavaScript reload is not enough.

These are the entries from the SDK 3.0.1 README, checked against the Sanar developer docs. Add what is missing and leave the rest of each file alone.

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

Check these before you edit:

- **The path.** `../node_modules/...` assumes `node_modules` sits next to `ios/`. In a monorepo, or with pnpm, the package may be somewhere else. Check that the file `scripts/setup.rb` exists at the path you write, and look at how the `Podfile` already finds React Native (the `require` or `require_relative` lines at its top) to copy the same style.
- **The version.** `setup_permissions` comes with the current `react-native-permissions`, which `npx sanarkit-setup` installs because the peer range is `*`. If `node_modules/react-native-permissions/scripts/setup.rb` does not exist, the app has an older version. Tell the developer and ask, and do not rewrite the `Podfile` in the old style.
- **Other permissions.** If `setup_permissions` already lists others (Location, Notifications, and so on), keep them.

## Android: `AndroidManifest.xml`

Add these inside the `<manifest>` element of `android/app/src/main/AndroidManifest.xml`, next to the other `uses-permission` lines:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.CAMERA" />
```

All six are the SDK's list. Add exactly these, and skip any that the manifest already has. Do not add permissions that SanarKit does not list.

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
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.CAMERA"
      ]
    },
    "plugins": [
      ["react-native-permissions", { "iosPermissions": ["Camera", "Microphone"] }]
    ]
  }
}
```

Merge these into the keys the file already has (an existing `plugins` or `permissions` array gets the new entries added). The Expo keys and the `react-native-permissions` plugin options are general Expo knowledge and not part of the SanarKit docs, so they are **to confirm**: check the installed `react-native-permissions` README for the plugin, and the Expo docs for the app's SDK. When the native folders are generated, the `Podfile` and the manifest come from this config, so you do not edit them by hand. Run the prebuild (after you have asked) so that the config takes effect.

## What the SDK does at runtime

When a video call rings, SanarKit checks for camera and microphone permission, and Bluetooth permission on Android, and asks the member for any that are missing. If the member has blocked one, SanarKit shows "Please enable required permission in settings" with a button to the device settings, and the call is not accepted until it is granted. Camera, microphone and (on Android) Bluetooth must all be allowed.

## Rebuild

After the changes:

```sh
npx react-native run-ios
npx react-native run-android
```

In an Expo project, use the development build commands instead (`npx expo run:ios` and `npx expo run:android`), or build a new EAS development build.

## Verify

- `Info.plist` contains both usage description keys, and the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`.
- `AndroidManifest.xml` contains the six permissions, each once.
- `git diff` shows only these files changed in this step.
- You cannot check the prompts without a call. If you could not start a call, say that you did not verify the runtime permission prompts.
