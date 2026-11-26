# Upgrade an existing React Native integration

Use this when the app already has SanarKit and the developer asks to upgrade, update or bump it, or agrees to an upgrade that you recommended after a diagnosis.

The target is `@maren-sa/react-native-sanarkit` **3.3.0**, the version this skill covers. If the developer asks for a newer version than that, install it, say that these references were written for 3.3.0, and check each name you use against the installed package.

## Before you change anything

1. **Read what is installed:** the SanarKit entry in the app's `package.json`, the version in `node_modules/@maren-sa/react-native-sanarkit/package.json` (or `node_modules/react-native-sanarkit/package.json` for an old, unscoped install), and the `react-native` and `react` versions.
2. **Check that the app can take 3.3.0.** SanarKit 3.3.0 supports React Native 0.71 to 0.81. On React Native 0.68 to 0.70 the app has to stay on SanarKit 2.1.x, so say that and stop. The New Architecture rule from the installation reference applies as it does for a new install.
3. **Tell the developer the installed version, the target, and what changes** (the table below), and **ask before you upgrade.** Check `git status` first, so that your changes are not mixed with theirs.

| Installed | What the upgrade involves | Code changes needed |
| --- | --- | --- |
| 3.2.0 | `SanarRTC` works without `enable` and follows the session. A first render with `enable={false}` no longer ends the session, a call that is ringing when `SanarRTC` unmounts rings again, and `'disconnect'` is reported only when the connection is closed for good. A switch-camera button, and the chat button moved to the top corner of the call screen (3.3.0) | None required. Offer to remove `enable` from `SanarRTC` (see "Offer the 3.3 change") |
| 3.1.5 | On Android, a foreground service keeps a call running while the member is out of the app, with a "Call in progress" notification. A doctor whose connection drops gets 25 seconds to come back, and a messaging error no longer ends a call (3.2.0). SanarKit now has Android code | No JavaScript changes. On Android: a native rebuild, one manifest line, and a Google Play declaration (step 6 and the report) |
| 3.1.2 to 3.1.4 | Calls that arrive as the app opens from a call notification now ring, and `SanarKit.connect()` is safe to call again while `SanarRTC` is enabled (3.1.5). The connecting and call-failed screens look different, and the permission prompt follows Arabic. 3.1.3 and 3.1.4 changed only the README that ships in the package | None |
| 3.1.0 or 3.1.1 | A fix to `npx sanarkit-setup --doctor`, and `react-native-reanimated` is no longer a peer dependency | None |
| 3.0.0 or 3.0.1 | Video-call fixes, `onError`, `CALL_FAILED`, the doctor, `SanarKit.diagnose()` and the SDK logs. No breaking changes | None required. The new callbacks are optional (see "Offer the 3.1 features") |
| 2.2.0 to 2.5.x, scoped package `@maren-sa/react-native-sanarkit` | The same, plus `shareUrl` and `SERVICE_TYPE.MedicalFile` from 3.0.0. No breaking changes | None required |
| 2.1.x, unscoped package `react-native-sanarkit` | The package was renamed, so every import changes, and the old setup script goes away | See "From 2.1.x" below |
| Any version, with `sanar-rtc` in `package.json` | The app predates the move to `react-native-agora`. `npx sanarkit-setup` removes `sanar-rtc` | See "From 2.1.x" below |

Every version below 3.2.0 also gets the 3.3.0 changes of the first row, and every version below 3.1.5 the 3.2.0 changes of the second.

## Upgrade (from 2.2.0 or later)

1. **Install 3.3.0** with the app's own package manager, picked from its lockfile, in the app's folder. Name only the SDK. If the app has `react-native-reanimated`, leave it and its version alone: from 3.1.2 SanarKit does not declare it, and an earlier `npx sanarkit-setup` may have added it.

   | Manager | Command |
   | --- | --- |
   | npm | `npm install @maren-sa/react-native-sanarkit@3.3.0` |
   | yarn | `yarn add @maren-sa/react-native-sanarkit@3.3.0` |
   | pnpm | `pnpm add @maren-sa/react-native-sanarkit@3.3.0` |
   | bun | `bun add @maren-sa/react-native-sanarkit@3.3.0` |

   The package comes from the npm registry only. Never use `--force` or `--legacy-peer-deps`. If the install stops with `ERESOLVE`, read which package it names and see the troubleshooting reference.

2. **Run the setup command again,** from the app root, to pick up new or changed peer dependencies: `npx sanarkit-setup`. Start it with `RCT_NEW_ARCH_ENABLED=0` if the app has the New Architecture off. On pnpm, or any manager other than npm and yarn, do not run it: compare the SDK's `peerDependencies` with the app's `package.json` and add what is missing with the app's manager, as the installation reference describes. It never changes a peer the app already has, so compare those with the SDK's ranges yourself and report a mismatch instead of changing it.

3. **Confirm the version:**

   ```sh
   node -p "require('@maren-sa/react-native-sanarkit/package.json').version"
   ```

4. **Run the doctor:** `npx sanarkit-setup --doctor`. It is read-only. Fix what the upgrade caused, and report the rest with its fix. A Placement warning means `SanarRTC` is in the wrong place: the developer may not know, because older versions gave no warning. Report it and offer the fix from the fix-placement reference.

5. **Rebuild both platforms.** A JavaScript reload is not enough after a native dependency changed. Run `pod install` in `ios/` if the setup command did not, then build with the app's own scripts.

6. **Android, from 3.2.0.** Follow "Android: SanarKit's call service" in `rn-permissions.md`: the `FOREGROUND_SERVICE_MEDIA_PROJECTION` line (ask first whether the app shares or records the screen), the storage permissions from an earlier integration, and, for an app without video calls, the offer to leave SanarKit's Android code out. Ask before each change. The Android build in step 5 must come after these, because SanarKit's Android code is only included by a native build.

## Offer the 3.1 features

Nothing here is required, and the app works without it. Offer each one, and add it only on a yes.

- **`onError` on `SanarRTC`,** so the app hears why an accepted call failed, and a `CALL_FAILED` case where the app handles `onCallStatusChange`. The component reference has the code.
- **`SanarKit.setDebug(__DEV__)`** next to `setEnvironment`, so development builds print the SDK's logs and run its diagnostics.
- **`SanarKit.setLogger(fn)`,** if the app has a crash reporter and the developer wants the SDK's logs in it.

Do not remove callbacks the app already passes. From 3.1.0 they are all optional, but they still work.

## Reanimated after the upgrade

SanarKit 3.1.1 and earlier declared `react-native-reanimated` as a peer, so the app's `package.json` may list it only because `npx sanarkit-setup` installed it. From 3.1.2 SanarKit does not need it. Do not remove it yourself: the app, or another library such as a navigation drawer, may use it. Tell the developer that SanarKit no longer needs it, and that they can remove it, with its Babel plugin, if nothing else in the app uses it.

## Offer the 3.3 change

From 3.3.0 `SanarRTC` needs no `enable`. Offer it, and change it only if the developer agrees:

- Remove `enable` from `<SanarRTC />`. It then listens whenever a session exists.
- Sign-out must call `SanarKit.disconnect()`. If the app signed out only by setting `enable` to `false`, add that call first, or a call for the previous member could still ring.
- Keep the connected flag if other code reads it, for example to open `SKDashboard`.

An app that keeps `enable` works as before.

## What behaves differently after the upgrade

Tell the developer, so that their testers expect it. These came in 3.1.0:

- After Accept, the member sees "Connecting" at once. A call that cannot connect shows "Call could not be connected" with a Close button instead of an empty screen.
- The ringer asks for the microphone permission only (and Bluetooth on Android 12 and later, which never blocks a call). The camera permission is asked for from the call controls. Closing the permission prompt no longer declines the call.
- Calls can be audio-only. The ringer says "Incoming Video Call" or "Incoming Audio Call".
- The call ends for the member when the doctor leaves.
- The SDK prints warnings to the console when `SanarRTC` is mounted more than once, unmounted or disabled during a call, enabled before `connect` succeeded, or does not cover the screen. These are new messages about old problems.

From 3.3.0:

- `onCallStatusChange` no longer receives `'disconnect'` for a connection that drops and retries by itself, for example after the app was in the background. If the app showed a notice for it, that notice no longer appears.
- A call is dismissed when a different member connects, and a call that was ringing when `SanarRTC` unmounted rings again when it is back, within a minute.
- A video call has a switch-camera button, and the chat button is at the top corner of the call screen.

From 3.2.0:

- On Android, a call keeps running while the member is out of the app, for example while they take a photo with the camera from the consultation chat, and a "Call in progress" notification shows. Before 3.2.0, Android could close the app and the call dropped. The member's video pauses while they are away and comes back on return.
- When the doctor's connection drops, the call shows "Reconnecting…" and waits up to 25 seconds for them. If they do not come back, the call ends with `CALL_FAILED` (stage `connection`, "Call disconnected") instead of `CALL_END_PROVIDER`. If the app treats `CALL_END_PROVIDER` as "the consultation is complete" (for example to show a rating screen), that case now arrives as `CALL_FAILED`.
- A problem with the messaging connection during a call no longer ends the call.

From 3.1.5 (when upgrading from an earlier 3.x version):

- A call that arrives as the app opens from a call notification, before `SanarRTC` is listening, is held for up to 60 seconds and rings once `SanarRTC` is enabled. The app needs no notification handler for it: do not add one.
- Calling `SanarKit.connect()` again while `SanarRTC`'s `enable` is `true` is safe: `SanarRTC` moves to the new connection and the old one is closed. If the app already sets `enable` to `false` before it reconnects, that still works, so leave it.
- The connecting and call-failed screens have a new look, the permission prompt is shown in Arabic (right to left) when the app or the SanarKit session uses Arabic, the consultation chat follows the session's language, and the mute button shows the microphone's real state.

## From 2.1.x (the unscoped `react-native-sanarkit`)

Ask first, as above. Then:

1. **Remove the old package:** `npm uninstall react-native-sanarkit` (or the app's manager's equivalent).
2. **Install 3.3.0** from the npm registry, with the command in the table above. If the registry answers 401 or 404 for the `@maren-sa` scope, the developer needs access from Sanar. Do not fall back to a GitHub install.
3. **Change every import** from `'react-native-sanarkit'` to `'@maren-sa/react-native-sanarkit'`. Find them all, including tests, Jest `moduleNameMapper`, Babel aliases and Metro config:

   ```sh
   grep -rnE "['\"]react-native-sanarkit['\"/]" --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules
   ```

   Run it until it prints nothing. The names of the exports do not change.
4. **Replace the old setup script.** If the app has a `sanar-config.js` and a `"sanar:setup"` script in `package.json`, they read the old package path and now fail. Ask, then delete both, and run `npx sanarkit-setup`. It also removes `sanar-rtc` if the app still lists it.
5. **Clean and rebuild:** `cd ios && pod install`, `cd android && ./gradlew clean`, and start Metro with `--reset-cache`.
6. Continue with steps 3 to 5 of "Upgrade" above, then "Offer the 3.1 features".

`SanarKit.connect`, `disconnect` and `setEnvironment`, and the props of `SanarRTC`, `SKConsultation` and `ITCBooking`, work in 3.3.0 as they did in 2.1.x, so the app's own code needs no other change. `enable` on `SanarRTC` became optional in 3.3.0.

## Verify and report

- The installed version is 3.3.0, and `package.json` and the lockfile changed in the app's folder and not in a monorepo root.
- `npx sanarkit-setup --doctor` reports no error that the upgrade caused.
- Both platforms build. If you could not build, say so.
- No second lockfile appeared, and no file outside the upgrade changed.
- On Android with 3.2.0 and later: the Android app was rebuilt, and the manifest does not remove `FOREGROUND_SERVICE` or `FOREGROUND_SERVICE_MICROPHONE`.

Report: the version before and after, the files that changed (from `git status`), the doctor's findings that are left, the 3.1 features the developer declined or accepted, what behaves differently, and what you could not verify. For an app with video calls on Android, say that Google Play needs the microphone foreground service declared before the next upload (`rn-permissions.md`, "Store submission"). Give the developer this list to test with a real client ID, because you cannot test it yourself:

- `connect` succeeds, and `disconnect` ends the session.
- Each Sanar component the app uses opens and closes.
- A video call: the ringer, Accept, audio and video, mute, minimize and expand, and end call. Only a doctor can start a call.
- The same with the permissions denied, and in Arabic if the app supports it.
- On Android, during a video call: open the consultation chat and take a photo with the camera. The call continues, the "Call in progress" notification shows, and the doctor still hears the member while the camera is open.

Leave the changes uncommitted.
