# Diagnose an existing React Native integration

Use this when the app already has SanarKit and the developer asks to check, diagnose, audit or debug it, or reports that something does not work (no ringer, a blank screen after Accept, a call that fails, an error right after a call ends, a cropped call screen, a component that does not open). It also covers preparing a report the developer can send to the Sanar team (step 7).

The goal is a report: what is wrong, the evidence, and the fix. Diagnosing changes nothing in the app. Fix only after the developer has seen the report and said which findings to fix.

## Rules while diagnosing

- **Read-only.** Do not edit, install, upgrade or run `npx sanarkit-setup` (without `--doctor`, it installs packages). The one exception is the temporary runtime code in step 4, and only if the developer agrees.
- **No secrets in the report.** If the client ID is in a tracked file, report the file and line, never the value. Do not print the config file, the member object or a `cmt` token.
- **Evidence for every finding:** a file and line, a line of doctor output, or a console line. Do not report a guess as a finding. If you suspect something that you could not check, put it under "Could not check".
- **Remove what you added.** Temporary diagnostic code comes out again before you finish, unless the developer asks to keep it.

- **The New Architecture does not stop a diagnosis.** Put its setting in the report's header line, with the sentence from the installation reference. Do not change it.

## 1. Version

Read the installed version from `node_modules/@maren-sa/react-native-sanarkit/package.json` (in the app, or hoisted to the monorepo root), and the `react-native` and `react` versions.

- **3.1.0 or later:** the doctor command, `SanarKit.diagnose()`, the SDK logs and `onError` exist. Carry on.
- **3.0.1 or earlier:** none of them exist. Do steps 3 and 5 only, say in the report that the tools are missing, and recommend the upgrade to 3.1.2, because it also fixes the blank screen after Accept. Ask before you upgrade. These versions still print a few plain console lines, such as `Disconnected with Sanar` when `SanarKit.disconnect()` runs, so ask for the console lines around the problem too.
- A `sanar-rtc` dependency, or an import from `'react-native-sanarkit'` without the `@maren-sa/` scope, means a 2.x integration. Report it and stop: this skill does not cover 2.x.

## 2. The doctor (project files)

From the app root, with any package manager:

```sh
npx sanarkit-setup --doctor
```

It reads the project and changes nothing. It prints findings in groups, with a fix under each error and most warnings, and exits with code 1 when there is an error.

| Group | What it checks |
| --- | --- |
| Versions | The React Native and React versions against the range SanarKit supports |
| Dependencies | Each peer dependency against its supported range, and the deprecated `sanar-rtc` |
| iOS | `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` in `Info.plist`, `setup_permissions` with `'Camera'` and `'Microphone'` in the `Podfile`, the `react-native-agora` and `react-native-permissions` pods in `Podfile.lock`, and the New Architecture setting (information) |
| Android | The `CAMERA`, `RECORD_AUDIO`, `INTERNET` and `MODIFY_AUDIO_SETTINGS` permissions (declared, or provided by `react-native-agora`, and not removed), `BLUETOOTH_CONNECT`, and the New Architecture setting (information) |
| Placement | `<SanarRTC />` rendered not at all, more than once, or in a file under a `screens`, `pages` or `views` folder |

Copy every error and warning into the report with its fix. On SDK 3.1.0 the Placement check also counts `<SanarRTC` inside a comment, so open each line it names before you report a duplicate. SDK 3.1.1 ignores comments. Placement findings are warnings, not errors, so read the output even when the exit code is 0. "SanarRTC is not rendered anywhere" is expected in an app that does not use video calls.

How to read some lines:

- **"is in package.json but not installed in node_modules"**, or **"Pods are not installed"**: the dependencies were never installed on this machine. Ask the developer to install them (`npm install`, then `pod install`) and run the doctor again, because the Android check below depends on it.
- **`MODIFY_AUDIO_SETTINGS`, `CAMERA`, `RECORD_AUDIO` or `INTERNET` "is not declared":** the doctor accepts a permission that the app's manifest declares or that `react-native-agora`'s own manifest provides. `MODIFY_AUDIO_SETTINGS` normally comes from `react-native-agora`. If it is reported missing, check first that `react-native-agora` is installed. Add it to the app's manifest only if it is still missing after that.
- **The storage permissions** in the permissions reference are not checked by the doctor. Check them by reading the manifest.

The doctor cannot see: how `enable` is set, the container `SanarRTC` is rendered in, whether `connect` is awaited, anything at run time, or the developer's backend. Steps 3 and 4 cover those.

## 3. Code review (what the doctor cannot see)

Find the code first:

```sh
grep -rnE "@maren-sa/react-native-sanarkit|SanarKit\.|<SanarRTC|<SK[A-Z]|<ITCBooking" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=ios --exclude-dir=android .
```

Then read each file it lists and check these. The right-hand column is the finding to report when the check fails.

| Check | Finding when it fails |
| --- | --- |
| `SanarKit.setEnvironment` runs once, before `connect`, and the value comes from the build configuration | Release builds would use the development environment, or debug builds production |
| The client ID comes from git-ignored config or the app's secrets mechanism | The client ID is hardcoded or in a tracked file (report file and line only) |
| `connect` is awaited, `result.status` is checked, and a rejected promise is caught | A refused or failed `connect` is treated as success |
| `SanarKit.disconnect()` runs at sign-out only, not when a screen unmounts | The session ends for every Sanar component when that screen closes |
| `<SanarRTC />` is rendered exactly once | Not rendered: calls never ring. More than once: every one rings for the same call |
| `<SanarRTC />` is at the app root, after the app's content, outside every screen, navigator, conditional branch and list | The call screen is lost when its parent unmounts |
| The view around `<SanarRTC />` fills the window: no padding, no safe-area view, no `ScrollView`, not below a header or above a tab bar | The call screen is cropped or offset |
| `SanarRTC`'s `enable` is a flag that becomes `true` only after `connect` resolved with `status: true` | A constant `true`, or a flag set before `connect`: `SanarRTC` is not listening, so calls never ring |
| `enable` is never `false` or left out while members use other Sanar components | `enable={false}` calls `SanarKit.disconnect()` and ends the session for all of them |
| `connect` is not called again while `enable` stays `true` | `SanarRTC` listens on the old connection, so new calls do not ring |
| Nothing ends the session when a call ends: no `SanarKit.disconnect()` and no `enable` set to `false` on `CALL_END_USER`, `CALL_END_PROVIDER` or `'disconnect'` | The session ends after every call, so the next call does not ring until `connect` runs again |
| `SanarRTC` does not unmount with a call screen | No call rings while it is unmounted. The session stays |
| The app shows members no error for `'disconnect'`, `CALL_END_USER` or `CALL_END_PROVIDER` | Members see a connection error after a call that ended normally |
| `SanarRTC` gets `onCallStatusChange` and `onError` | Call failures are invisible to the app |
| `RTCViewStatus` is imported with `import type` only | It is undefined at run time |
| Each `SKDashboard`, `SKService`, `SKAppointments`, `SKConsultation` and `ITCBooking` gets `enable` from state, opens only after `connect` succeeded, and sets `enable` back to `false` in `onEndFlow` | The component opens once and never again, or closes at once |
| Those components are rendered in a view that fills the screen, not in a `ScrollView` or a small container | The component fills only part of the screen |
| The app never uses `SKChat` and never calls `setIsChatEnabled` | Internal API in use: consultations must use `SKConsultation` |
| `SanarKit.setDebug` is not a constant `true` | Debug logs are printed in release builds |

## 4. The running app (only with the developer's agreement)

`SanarKit.diagnose()` checks what only the running app knows: the session, the connection that delivers calls, that `SanarRTC` is mounted once, is listening and covers the screen, and the permission status. It never prompts the member.

Ask the developer whether you may add temporary diagnostic code, and who runs the app. Then add this next to `setEnvironment`:

```ts
// TEMPORARY: SanarKit diagnostics. Remove after the check.
SanarKit.setDebug(true);
```

With debug on before `SanarRTC` is enabled, `diagnose()` runs by itself about 3 seconds after `SanarRTC` is first enabled, and prints its findings as `[SanarKit][Diagnose]` lines. If the app does not use `SanarRTC`, or debug is turned on later, call it after `connect` has succeeded instead:

```ts
// TEMPORARY: SanarKit diagnostics. Remove after the check.
SanarKit.diagnose().then((report) => console.log('[SanarKit][Diagnose] report', JSON.stringify(report.checks)));
```

Run the app if you can, sign in so that `connect` runs, and read the console (Metro). If you cannot run it, ask the developer to run it and paste the lines that start with `[SanarKit]`. Those lines leave out the call token, the session token and the Agora app ID.

If the developer declines the temporary code, or nobody can run the app now, skip this step. List the session, the connection, the three `sanar_rtc_*` checks and the permission status under "Could not check", and give the developer the snippet above to run later.

| Check `id` | An error or warning means | Fix |
| --- | --- | --- |
| `environment` | A release build is not on `production` | Set the environment from the build configuration |
| `session` | `connect` has not succeeded | Check the client ID, the environment and the member fields, and enable components only after `connect` |
| `socket` | The connection that delivers calls is down | Check the network: after a drop it reconnects by itself. If the app closed it (`SanarKit.disconnect()` or `enable={false}`) or Sanar's server did (reason `io server disconnect`), it stays down until a new session: `enable` to `false`, `connect`, then `enable` to `true` |
| `sanar_rtc_mounted` | `SanarRTC` is mounted zero times, or more than once. Zero is expected in an app that does not use video calls | Move it to the root, and keep one (the fix-placement reference) |
| `sanar_rtc_listening` | `enable` is `false`, was `true` before `connect` succeeded, or `connect` ran again while it stayed `true` | Tie `enable` to the connected flag. To reconnect: `enable` to `false`, `connect`, then `enable` to `true` |
| `sanar_rtc_layout` | `SanarRTC`'s area does not cover the window. The message gives the measured size and position | Move it out of the padded or partial container (the fix-placement reference) |
| `permission_microphone`, `permission_camera` | Blocked: the member must allow it in Settings. Unavailable: a missing `Info.plist` key, `Podfile` entry or manifest permission, and the `fix` says which | Add the missing entry and rebuild |
| `permission_bluetooth` | Android only, optional. A warning at most | None needed for calls |

`platform` is information: copy it into the report (OS, React Native, React, New Architecture).

When you are done, remove the temporary code and confirm with `git diff` that nothing of it is left. If the developer wants to keep SDK logs, change it to `SanarKit.setDebug(__DEV__)`.

## 5. A problem the developer reported

Match the symptom, then confirm it with steps 2 to 4. The troubleshooting reference has the full entries.

| Symptom | Most likely cause | Confirm with |
| --- | --- | --- |
| The ringer never appears | `SanarRTC` is not listening: `enable` was set before `connect` succeeded, is `false`, or `connect` ran again. Or the app is in the background | `sanar_rtc_listening`, `session`, `socket` |
| The ringer shows, then nothing after Accept | SDK 3.0.1 or earlier and the call could not be joined. Or `SanarRTC` unmounted when the member accepted | The SDK version. `[SanarKit][RTC]` warning "SanarRTC unmounted during an active call". `onError` |
| "Call could not be connected" | The call failed. The `stage` in `onError` says where | The `[SanarKit][RTC]` and `[SanarKit][Agora]` lines |
| "Call could not be connected" 30 seconds after Accept, with `timeout` and "Could not join the call within 30 seconds" | The device's network blocks the call connection: a company proxy, a VPN, a secure web gateway or a firewall. A simulator or an emulator uses the computer's network | Ask which network the device or the computer was on. The same call on a real phone on mobile data, with any VPN off |
| The call screen is cropped or offset | `SanarRTC` is in a container that does not fill the window | `[SanarKit][Layout]` warning, `sanar_rtc_layout` |
| The call screen is behind something | The app draws a `Modal` or a native overlay above it. The SDK cannot detect this | Read what the app renders after or above `SanarRTC` |
| The phone rings twice, or two call screens | More than one `SanarRTC` | The doctor's Placement group, `sanar_rtc_mounted` |
| Every Sanar screen closes at once | No session: `connect` failed, or `disconnect` ran (also through `enable={false}`) | `session`, and the code review |
| An error, or `'disconnect'`, right after a call ends, or the next call does not ring | The app ends the session when the call ends: `SanarKit.disconnect()` in a screen's cleanup or in the call-status handler, or `enable` turned `false`. Or `SanarRTC` unmounted with a call screen, which stops calls without ending the session. The member sees the app's own error, not an SDK error | The console lines around the end of the call, with timestamps: `Disconnected with Sanar` (3.0.1) or `[SanarKit][SDK] Disconnected from SanarKit` (3.1.0) shortly after `CALL_END_USER` or `CALL_END_PROVIDER`. Then the code review. The troubleshooting entry "An error, or `'disconnect'`, right after a call ends" reads each line |
| The permission prompt never shows, or the app closes when a call rings | Missing `Info.plist` keys, `Podfile` setup or manifest permissions | The doctor's iOS and Android groups |

A `payload`, `join` or `connection` failure with a correct setup usually comes from the call itself, not from the app. Report the `stage`, `code` and `message` for the Sanar team.

For a `timeout`, read the `message` before you report it. "Could not join the call within 30 seconds" means the device did not reach the call servers: ask about the network first, as in the row above and in "Calls fail on a company network, a VPN or a proxy" in the troubleshooting reference. Neither the doctor nor `diagnose()` checks the network, so list it under "Could not check" unless the developer repeated the call on mobile data. "Joined the call, but the doctor did not join within 30 seconds" means the doctor never appeared.

## 6. The report

Give the developer one report, with the most serious findings first:

```text
SanarKit setup check: <app name>
SDK <version>, React Native <version>, React <version>, New Architecture <on/off>

Errors (the integration does not work until these are fixed)
1. <what is wrong>
   Evidence: <file:line, doctor line or console line>
   Fix: <what to change>

Warnings (works, but will fail in some cases)
...

Passed
- <one line for each area that is fine: versions, dependencies, iOS, Android, connect, placement, permissions>

Could not check
- <for example: the running app, a real incoming call, the device's network, the release build, the backend>
```

How to sort the findings:

- **Errors:** the doctor's errors, and anything that stops a Sanar feature from working. A doctor warning can be an error here: a `SanarRTC` rendered twice or in a screen, a constant `enable`, a `connect` whose result is ignored.
- **Warnings:** it works now but fails in some cases, or it is a risk for release (the environment, a missing `onError`, a missing example config, Bluetooth).
- **Could not check:** everything you had no evidence for, with the reason.

Then ask which findings to fix. Fix those, plus what a chosen fix cannot work without, and name that in your plan. Offer the rest again at the end instead of fixing it. For a misplaced `SanarRTC` or another component, follow the fix-placement reference. For anything else, the fix is in the reference for that area (installation, permissions, connect or the component).

What no check can verify: the call token, the Agora setup on Sanar's side, the webhook and push notification setup, and whether a doctor's call reaches the device. Only a doctor can start a call, so say plainly that the ringer and the call were not tested unless the developer tested them.

## 7. Share with the Sanar team

Prepare a support report when the developer asks for one, when the evidence points at Sanar's side (a `payload`, `join` or `connection` failure with a correct setup, an `io server disconnect`, the call token or the backend), or when you found no cause. When the cause is in the app, say so and give the fix: the report is then only needed if the developer wants the Sanar team to confirm it.

Fill it from what you collected in steps 1 to 5. Write "unknown" or "not run" for what you do not have, and do not guess:

```text
SanarKit support report
Date: <date and time of the problem, with time zone>
SDK <version>, React Native <version>, React <version>, New Architecture <on/off>
Platform: <iOS or Android> <OS version>, <real device or simulator/emulator>
Environment: <development or production>
Network: <Wi-Fi or mobile data>, VPN or proxy: <yes, no or unknown>

What happened
<the symptom in one or two sentences, and the steps that lead to it>
Expected: <what should have happened>
How often: <every call, sometimes or once>, since <date or SDK version, if known>

Timeline (console lines in order, with timestamps)
<the app's own lines and the SDK's lines, from just before the problem to just after it>

What the SDK reported
- onError: <stage, code and message, or "none" or "not available (SDK 3.0.1 or earlier)">
- connect: <status and message, if it failed>
- Doctor: <errors and warnings, or "not run">
- diagnose(): <the checks that were not ok, or "not run">

Findings
<each finding with its evidence, the cause if known, and what was ruled out>

Call
<sid and roomName of the call, from the [SanarKit] lines or the app's own logs, if one call must be looked at>
```

Rules for the report:

- **Redact the app's own lines too.** The SDK's `[SanarKit]` entries leave out the tokens and the Agora app ID, but an app that logs the incoming call, `SanarKit.session` or the member can print them. Replace with `<redacted>`: the client ID, every token (the call `token`, the session token or `headerToken`, a `cmt` token), `providerId` (the Agora app ID), and the member's personal details (name, date of birth, document ID, phone number). Keep `sid` and `roomName`: the Sanar team needs them to find the call.
- **Keep the timeline short.** Only the lines around the problem, in the order they appeared. Do not paste a whole log.
- **Separate evidence from reading.** The timeline and the SDK reports are evidence. Put your reading of them under Findings.
- **Hand it over as one block** the developer can paste into a message or a ticket to the Sanar team. Write it to a file only if the developer asks, keep that file out of git, and do not commit it.
