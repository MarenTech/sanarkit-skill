# React Native installation

Install `@maren-sa/react-native-sanarkit` 3.2.0 and its peer dependencies in a React Native app, with the app's own package manager. This file covers: requirements, Expo, monorepos, package managers, the setup command, peer dependencies and the New Architecture.

Everything here is for SDK 3.2.0. If the installed package disagrees with this file, trust the installed package and tell the developer.

## Check these before you install

1. **App folder.** Work from the folder whose `package.json` lists `react-native`. In a monorepo that is the app's folder (for example `apps/mobile`), not the repository root. Run every command below from that folder.
2. **React Native version.** Read `version` in `node_modules/react-native/package.json` (it may be hoisted to the monorepo root). If it is not installed yet, read the `react-native` entry in `package.json`.
   - SanarKit 3.2.0 supports React Native 0.71 to 0.81.
   - On 0.68 to 0.70, the matching SDK is SanarKit 2.1.x, which this skill does not cover. Tell the developer, do not install 3.2.0, and ask how they want to go on. The package's peer range is `react-native >=0.68.0`, so the install would not stop by itself.
   - Outside 0.68 to 0.81, tell the developer that SanarKit 3.2.0 does not support that version, suggest they contact Sanar, and ask whether to go on.
3. **New Architecture.** See the New Architecture section below. If it is on, tell the developer that SanarKit 3.2.0 targets the legacy architecture, and ask before you go on.
4. **Node.js 16 or higher**, which `npx sanarkit-setup` needs.
5. **Network access.** SanarKit depends on a small package, `sanar-dynamic-components`, which the package manager fetches from a public GitHub repository. The machine that runs the install needs `git` and access to github.com. If the install fails with a git error, see `rn-troubleshooting.md`.
6. **A client ID** from the Sanar team, to connect a member. You do not need it to install.
7. **Older SanarKit.** If `package.json` lists `sanar-rtc`, or the installed SanarKit is below 3.2.0, report the version and ask before upgrading. Do not upgrade unasked.

## Detect the package manager

The package manager belongs to the project, not to the app folder. In a monorepo the lockfile and the `packageManager` field sit at the workspace root, above the app. Decide in this order:

1. **Find the project root.** Start in the app folder and walk up, but not above the Git top-level (`git rev-parse --show-toplevel`). The workspace root is the nearest folder that has a `pnpm-workspace.yaml`, or a `package.json` with a `workspaces` field. If there is none, the project is not a monorepo, and the project root is the app folder.
2. **Read `packageManager`** in the project root's `package.json` (for example `pnpm@9.1.0`), and then in the app's own `package.json`. The root's field wins if they differ.
3. **List the lockfiles at the project root:** `package-lock.json` (npm), `yarn.lock` (yarn), `pnpm-lock.yaml` (pnpm), `bun.lock` or `bun.lockb` (bun). A lockfile in the app folder when the project root is a folder above it is a stray one: ignore it for the decision, and tell the developer.
4. **Pick the manager** with these tie-breakers:
   - `packageManager` wins over lockfiles. If a lockfile at the root belongs to a different manager, tell the developer about the mismatch.
   - With no `packageManager` field, the lockfile at the project root decides.
   - Two different lockfiles at the project root, with no `packageManager` field, or no lockfile and no field anywhere: **ask the developer** which manager the project uses. Do not guess.
5. If after these steps the evidence still conflicts, ask.

Then decide whether the setup command may run. `sanarkit-setup` only detects yarn, and only from a `yarn.lock` file in the folder where you run it (the app folder). In every other case it runs npm.

| The project | May you run `npx sanarkit-setup`? |
| --- | --- |
| npm, and the app folder is the project root | Yes |
| yarn, and `yarn.lock` is in the app folder (the app folder is the project root) | Yes |
| pnpm or bun | No. Use the manual steps below |
| Any monorepo, with any manager (the lockfile is above the app folder) | No. Use the manual steps below, with the monorepo's own manager |

Why:

- On **pnpm** or **bun** it would run `npm install` in the project and create a second lockfile (`package-lock.json`) next to the real one.
- In a **yarn monorepo** the `yarn.lock` is at the workspace root, so it does not find it and also falls back to npm.
- In an **npm workspace** the lockfile is at the root too. Whether a plain `npm install --save` from the app folder changes the app's `package.json` depends on the npm version, so do not rely on it.

Install with the manager the project already uses. Never switch the manager and never add a second lockfile. After any install step, run `git status`. If a lockfile you did not mean to create appears (untracked), tell the developer and delete only that file.

## Expo

A project is an Expo project when `package.json` has an `expo` dependency. It often has no `ios/` or `android/` folder, because Expo generates them (`npx expo prebuild`).

SanarKit uses native modules (`react-native-agora`, `react-native-webview`, `react-native-svg`, `react-native-permissions`, `react-native-device-info`), so it **does not run in Expo Go**. The app needs a development build.

Decide which case the project is in by asking Git, not only by looking for the folders:

```sh
ls -d ios android
git ls-files ios android | head -1
git check-ignore -v ios android
```

- **The folders exist and Git tracks them** (the second command prints a file): treat the project as a bare React Native app and follow the rest of this file. Tell the developer that the app has to be launched from a development build, not from Expo Go.
- **The folders exist but Git ignores them** (the third command prints a rule), or **they do not exist:** the native projects are generated from the Expo config.
  1. Tell the developer why Expo Go cannot run SanarKit.
  2. **Ask before you run anything.** Offer the two ways to get a development build: `npx expo prebuild` followed by `npx expo run:ios` and `npx expo run:android`, or an EAS development build with `expo-dev-client`. Adding `expo-dev-client` is a new dependency, so ask first.
  3. Do not run `npx expo prebuild --clean`. It deletes native folders that already exist.
  4. After `npx expo prebuild` finishes, the `ios/` and `android/` folders exist. Carry on with the install below.
  5. Do the install after the prebuild. On macOS, when `sanarkit-setup` installs or removes anything it ends with `cd ios && pod install`, and that step fails when there is no `ios/` folder (the peers are already installed by then).
  6. **Do not edit the generated folders by hand.** Expo regenerates `ios/` and `android/` on the next prebuild and overwrites such edits. Put the permissions in the Expo config instead (`rn-permissions.md` has the entries), then run the prebuild again, after you have asked. This is general Expo behaviour and is to confirm for the app's Expo SDK.
- **Expo SDK versions pin some libraries.** `sanarkit-setup` only installs peers that are missing and never changes one the app already has. If an Expo-pinned version conflicts with a SanarKit peer range, report it and ask. Do not force a version.

## Install the SDK

Install the SDK by itself. From 3.1.2 it does not declare `react-native-reanimated`, so no Reanimated version goes into the command. If the app uses Reanimated for its own screens, leave it and its version alone.

From the app folder, with the app's own package manager:

| Manager | Command |
| --- | --- |
| npm | `npm install @maren-sa/react-native-sanarkit` |
| yarn | `yarn add @maren-sa/react-native-sanarkit` |
| pnpm | `pnpm add @maren-sa/react-native-sanarkit` |
| bun | `bun add @maren-sa/react-native-sanarkit` |

Then run `npx sanarkit-setup` where the table above allows it. It installs the peers the app does not list yet.

In a monorepo, install into the app's workspace and not into the root. Either run the command in the app folder, or use the manager's workspace form from the project root:

| Manager | Workspace form (from the project root) |
| --- | --- |
| npm | `npm install @maren-sa/react-native-sanarkit --workspace <app folder or name>` |
| yarn | `yarn workspace <app name> add @maren-sa/react-native-sanarkit` |
| pnpm | `pnpm --filter <app name> add @maren-sa/react-native-sanarkit` |
| bun | run `bun add @maren-sa/react-native-sanarkit` in the app folder |

After the install, `git diff --stat` must show the app's `package.json` changed. If the root `package.json` changed instead, undo that change and ask.

The package comes from the npm registry. No other source is supported: never install it from GitHub, from a git URL or from a tarball.

Afterwards read the installed version:

```sh
node -p "require('@maren-sa/react-native-sanarkit/package.json').version"
```

If it is not 3.2.0, tell the developer. A newer version is fine, but check each name you use against the installed package.

Problems at this step:

- **An authentication or not-found error for the `@maren-sa` scope.** The SDK's own guide says the scope is private and needs an npm token from Sanar. An anonymous lookup currently succeeds, so whether a token is needed is **to confirm**. If the install fails like this, stop and ask the developer to get access from the Sanar team. Never write a token into a file that Git tracks.
- **A peer dependency conflict (`ERESOLVE` on npm).** Read which package the error names. If it is `react-native-reanimated`, the command is installing SanarKit 3.1.1 or earlier, which still declared Reanimated as a peer: install 3.1.2 or later. For another package, see `rn-troubleshooting.md` (`react-native-svg`, which SanarKit declares as `^12.1.0`, is the known case). **Never use `--force` or `--legacy-peer-deps`.** Add an `overrides` entry (or another manager's override) only after you have asked the developer.

## Install the peer dependencies

SanarKit needs native libraries as peer dependencies, so the app has to provide them. Do this after the SDK is installed.

### npm or yarn, when the app folder is the project root

Run from the app folder (the table above says when this is allowed):

```sh
npx sanarkit-setup
```

It is a command that ships inside the SDK package, so it always matches the installed version. Do not repeat by hand what it does.

### Any other case (pnpm, bun, or any monorepo): do what the script does

Do not run `npx sanarkit-setup`. Install the peers yourself with the app's manager, in the same order as the script:

1. **Read the installed SDK's own manifest.** Its `peerDependencies` are the list to install:

   ```sh
   node -p "JSON.stringify(require('@maren-sa/react-native-sanarkit/package.json').peerDependencies, null, 2)"
   ```

   Run it from the app folder, so that the module resolves the way the app does (this matters on pnpm).
2. **Remove the deprecated `sanar-rtc`** if `dependencies` or `devDependencies` in the app's `package.json` list it. SanarKit now uses `react-native-agora` for video.
3. **Install each missing peer** at the range the SDK declares. Skip `react` and `react-native`. "Missing" means the package name is in neither `dependencies` nor `devDependencies` of the app's `package.json`. A peer that is already there is left alone, even if its version differs from the range.
   - Quote every `name@range` argument. A range such as `>=8.0.0` is a redirect in the shell if it is not quoted.
4. **Pods, on macOS only, and only if you removed or installed anything:** `cd ios && pod install`. Use the app's usual command if it differs (for example `bundle exec pod install` when the app has a `Gemfile`). If Bundler or the `Gemfile` cannot run (for example an old system Ruby), plain `pod install` is acceptable. If the app has the New Architecture off, put `RCT_NEW_ARCH_ENABLED=0` in front of the command (see "New Architecture"). Skip it when nothing changed. Skip it when there is no `ios/` folder, and ask about the Expo prebuild instead.
5. **Compare the peers the app already had** with the ranges below. Report any mismatch, and do not change an existing peer without asking.
6. Run `git status` and check that no second lockfile appeared.

| Manager | Add | Remove |
| --- | --- | --- |
| npm | `npm install --save "name@range"` | `npm uninstall name` |
| yarn | `yarn add "name@range"` | `yarn remove name` |
| pnpm | `pnpm add "name@range"` | `pnpm remove name` |
| bun | `bun add "name@range"` | `bun remove name` |

In a workspace, run these in the app's folder, or use the workspace form from the table above, so that they change the app's `package.json` and not the root one (check with `git diff --stat`). Do not change `.npmrc`, the `node-linker` setting or hoisting without asking. If Metro, Gradle or CocoaPods cannot find a package after the install, report it and ask.

### What `sanarkit-setup` changes

The script itself runs package-manager and CocoaPods commands only. It edits no other file, but those commands change files as a side effect (see the list below). In order, it:

1. Removes `sanar-rtc` if the app lists it (`npm uninstall sanar-rtc`, or `yarn remove sanar-rtc` when `yarn.lock` is in the folder).
2. Reads the SDK's `peerDependencies`. For each one except `react` and `react-native` that the app does not list, it runs `npm install --save "name@range"`, or `yarn add "name@range"` when `yarn.lock` is in the folder. It prints `already installed` for the ones the app has.
3. On macOS, if step 1 or 2 changed anything, it runs `cd ios && pod install`. Otherwise it prints that it is skipping the pods. That `pod install` runs with the environment of the setup command, so for an app with the New Architecture off, start the setup command with the variable: `RCT_NEW_ARCH_ENABLED=0 npx sanarkit-setup` (see "New Architecture").

**Expected changes.** After it runs, `git status` shows these files. They are normal side effects of the commands, so report them and do not revert them:

- `package.json` and the lockfile. npm may also re-sort the keys of `dependencies` (and the other sections), so the diff can show lines that you did not add.
- On macOS, `ios/Podfile.lock` and `ios/Pods`.
- `ios/<App>/PrivacyInfo.xcprivacy`. CocoaPods may rewrite it during `pod install` (it aggregates the privacy manifests of the pods).

It does **not** touch `Info.plist`, `AndroidManifest.xml`, the `Podfile`, Gradle files or Babel config. Add the permissions yourself (`rn-permissions.md` has them). Run it again whenever you upgrade SanarKit, to pick up new or changed peers.

## Peer dependencies (SDK 3.2.0)

| Package | Range | What SanarKit uses it for |
| --- | --- | --- |
| `react-native-agora` | `^4.5.3` | Video and audio for `SanarRTC` calls |
| `react-native-device-info` | `>=8.0.0` | The device ID and the app's bundle ID, both sent on `connect` |
| `react-native-permissions` | `*` | Asking for camera, microphone and Bluetooth permission when a call rings |
| `react-native-svg` | `^12.1.0` | The icons in the call screens |
| `react-native-webview` | `>=11.22.7` | Showing the Sanar pages in `SKDashboard`, `SKService`, `SKAppointments` and `ITCBooking` |

The installed package's `package.json` is the authority. If its list differs from this table, use the installed one.

`react-native-reanimated` is not in this list. SanarKit 3.1.1 and earlier declared it as a peer although the SDK does not use it. If the app has Reanimated, that is the app's own dependency: do not change, remove or report it.

## New Architecture

SanarKit 3.2.0 targets React Native's legacy architecture. If the app uses the New Architecture, the developer should contact Sanar before they integrate.

**If the developer decides to go on**, the steps are the same. In the end-to-end runs, with the New Architecture on, a React Native 0.81.6 app with SanarKit 3.0.1 built on iOS and Android, and started on the iOS simulator (iOS 26.5). Bridgeless and Fabric were confirmed active, with no red box, crash or TurboModule error. `connect` reached Sanar's server, which rejected the fake test client ID ("Invalid Authorisation"), so the request made the round trip. The two workarounds in `rn-troubleshooting.md` (the Podfile deployment target and `react-native-svg` 15.16.0 through `overrides`) were needed with the old architecture too, so they are not New Architecture issues.

Those runs did not check any SanarKit screen under Fabric, Android at run time, or a successful `connect` with a real client ID. Do not tell the developer that SanarKit supports the New Architecture.

Check whether the app has the New Architecture on:

- **Android:** `newArchEnabled` in `android/gradle.properties`.
- **iOS:** the `RCT_NEW_ARCH_ENABLED` setting, in the `Podfile` or in the environment that runs `pod install`, and also `RCTNewArchEnabled` in `ios/<App>/Info.plist` (`<true/>` or `<false/>`). The end-to-end apps on React Native 0.81 had the key. Check both places, because the environment variable is not stored in the project.
- **Expo:** `newArchEnabled` under `expo` in `app.json` (or `app.config.js` or `app.config.ts`).
- **No explicit setting:** React Native 0.76 and later turn it on by default, so a missing setting does not mean it is off. Recent Expo SDKs (React Native 0.76 and later) also enable it by default. This default is general React Native knowledge, so it is to confirm for the app's versions.

If it is on, or if you cannot tell, **tell the developer and ask before you go on**. Tell them that SanarKit 3.2.0 targets the legacy architecture and that they should contact Sanar before they integrate. Continue only when they say so. Never turn `newArchEnabled` off yourself.

### `pod install` when the New Architecture is off

If the app has the New Architecture explicitly off, every `pod install` needs `RCT_NEW_ARCH_ENABLED=0` in front of it, so the pods match the app's setting:

```sh
cd ios && RCT_NEW_ARCH_ENABLED=0 pod install
```

That includes the `pod install` that `npx sanarkit-setup` runs on its own. The script inherits the environment of the command that starts it, so start it with the variable too: `RCT_NEW_ARCH_ENABLED=0 npx sanarkit-setup`. In the end-to-end run on React Native 0.81.6 with the New Architecture off, the pods were installed with the variable set, and CocoaPods logged "Configuring the target with the Legacy Architecture". If the app has the New Architecture on, run `pod install` as usual.

If the app has a `Gemfile` the usual command is `bundle exec pod install`, with the variable in front when it applies. If Bundler or the `Gemfile` cannot run (for example an old system Ruby), plain `pod install` is acceptable.

## After the install

1. Check that the SDK and all six peers are in `package.json` (or in the workspace's manifest), and that `sanar-rtc` is not.
2. Add the camera and microphone permissions, and on Android the lines for SanarKit's call service and Agora's screen sharing (SDK 3.2.0). `rn-permissions.md` has the exact entries.
3. Rebuild both native projects, because a JavaScript reload is not enough. From SDK 3.2.0 SanarKit has its own Android code, which only a native build includes.
4. Do not run `npx sanarkit-setup` again unless the SDK is upgraded. `npx sanarkit-setup --doctor` is different: it installs and changes nothing, works with every package manager, and checks the peer versions, the native permission setup, the New Architecture setting and where `SanarRTC` is rendered. Run it once the permissions and the component are in place. `rn-troubleshooting.md` describes its output.
5. If the app has tests, run them once. A Jest test that imports `App` fails as soon as `App.tsx` imports the SDK: tell the developer, and do not add mocks unless they ask. `rn-troubleshooting.md` has the details and a minimal mock.
6. A build with Xcode 27 or React Native 0.81 can fail in `fmt` (a fresh React Native 0.81 app, before SanarKit), in `react-native-device-info` or in `react-native-svg`. `rn-troubleshooting.md` has all three entries. They change the app's `Podfile` or dependency versions, so ask first.
7. If the app renders `SanarRTC`, tell the developer in the report that Google Play needs a declaration for SanarKit's microphone foreground service before the next upload (`rn-permissions.md`, "Store submission").
