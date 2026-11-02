# End-to-end results: Android (native)

Date: 2026-11-02. Skill: `sanarkit-integration`, written against SanarKit for Android 2.1.1 (`sanarkit-release-2.1.1.aar`). App: a blank single-module Kotlin app (`:app`, `AppCompatActivity` with an XML layout, package `com.example.sanardemo`). The agent ran the test prompt with the fake test client ID and the development environment. How to repeat this is in [README.md](README.md).

Who verified what: the integration agent reported its own results. A separate checker re-ran every check below. Statements marked "agent-reported" were not reproduced by the checker.

## Result

| # | Criterion | Result |
| --- | --- | --- |
| 1 | The app builds | PASS (`assembleDebug`, offline) |
| 2 | The dashboard is reachable from the home screen | PASS (by code) |
| 3 | The fake client ID is only in git-ignored files | PASS |
| 4 | Only the files the integration needs changed | PASS |

## Versions

| Item | Value | Source |
| --- | --- | --- |
| Android Gradle Plugin | 8.13.2 | `build.gradle.kts` |
| Gradle | 9.1.0 (`-all` distribution) | `gradle-wrapper.properties` |
| Kotlin | 2.1.20 | `build.gradle.kts` |
| JDK | JetBrains Runtime 17.0.14 (`java_home -v 17`) | path from `java_home`; version number from the setup report (copied) |
| compileSdk, targetSdk, minSdk | 35, 35, 24 | `app/build.gradle.kts`, `aapt2 dump badging` |
| Build tools | the AGP default (not pinned); 30.0.2 to 36.0.0 are installed | `ls $ANDROID_HOME/build-tools` |
| Dependencies | androidx core-ktx 1.13.1, appcompat 1.7.0, and `files("libs/sanarkit-release-2.1.1.aar")` | `app/build.gradle.kts` |
| The `.aar` | 24,237 bytes, SHA-256 `82002d09...55a82`, the value in `android-installation.md` | `shasum -a 256` |
| `adb` | 1.0.41, 34.0.5-10900879 | `adb version` |

The app's AGP, Gradle and Kotlin are newer than the versions the skill says it tested (AGP 8.2.2, Gradle 8.2, compileSdk 34, Kotlin 1.9.24). The SanarKit `.aar` built without trouble on the newer ones.

## Toolchain

| Tool | Status |
| --- | --- |
| JDK 17 | Verified. |
| Gradle wrapper 9.1.0 (from the local cache), `--offline` | Verified. |
| Android SDK (`~/Library/Android/sdk`, platforms 35 and 36) | Verified. |
| `adb` | Verified: version printed. No device or emulator was used. |
| Android emulator | Not used. The app was never launched. |

## Criteria

**1. The app builds: PASS.** `./gradlew clean assembleDebug --offline` ended in `BUILD SUCCESSFUL` (38 tasks executed, JDK 17). `aapt2 dump badging` on the new `app-debug.apk` shows package `com.example.sanardemo`, `compileSdkVersion` 35, launchable activity `MainActivity`, and the permissions CAMERA, RECORD_AUDIO and MODIFY_AUDIO_SETTINGS from the app's manifest plus INTERNET and ACCESS_COARSE_LOCATION merged in from the `.aar`. The agent also reported that `assembleRelease` fails only at `lintVitalAnalyzeRelease` (`lint-gradle` is not in the offline cache) while `compileReleaseKotlin` succeeds. The checker did not run a Release build.

**2. The dashboard is reachable from the home screen: PASS (by code).** `activity_main.xml` has a button `open_sanar_dashboard` ("Open Sanar Dashboard"). `MainActivity` disables it, enables it when the connection listener reports `connected`, and its click handler calls `sanar.kit.gotoDashboardView()`. It reads `sanar.kit` at click time, as the skill's `android-screen-gotodashboardview.md` requires, because connect and disconnect replace the `SanarKit` instance. The dashboard is a separate full-screen Activity started by the SDK, so a button is the right entry point. The app was never run, so the button was not seen on screen, and with the fake client ID it would stay disabled (the code sets its text to "Sanar is not available. Try again later." when connect fails).

**3. The fake client ID only in git-ignored files: PASS.** `git ls-files -co --exclude-standard | xargs grep -l <fake id>` printed nothing. `git grep --cached` found 0 files. `local.properties` (already ignored by the baseline `.gitignore`) contains the value, count 1. `local.properties.example` is untracked but not ignored, so it will be committed, and it holds placeholders only. The Gradle build reads the key from `local.properties`, then from the `SANAR_<ENV>_CLIENT_ID` environment variable, and otherwise uses an empty string, so a checkout without the ID still compiles (read from the build file, not re-run without `local.properties`).

**4. Only the files the integration needs changed: PASS.** `git status --short -uall`, after the checker's clean build (same list as before it):

| Path | Judgment |
| --- | --- |
| `app/build.gradle.kts` | Needed: the `.aar` dependency, `buildConfig = true`, and the per-build-type `BuildConfig` fields (development for debug, production for release). |
| `app/libs/sanarkit-release-2.1.1.aar` (new, not ignored) | Needed. Referenced with `files(...)`, so `settings.gradle.kts` (which forbids module-level repositories) was not touched. |
| `app/src/main/AndroidManifest.xml` | Needed: CAMERA, RECORD_AUDIO and MODIFY_AUDIO_SETTINGS. |
| `app/src/main/java/com/example/sanardemo/MainActivity.kt` | Needed: session, connect at start, the button. Includes an unused private `onSignedOut()` that the developer asked for as the place to call `disconnect()`. |
| `app/src/main/java/.../SanarSession.kt` (new) | Needed: owns the `SanarKit` instance, connect, disconnect, listeners. |
| `app/src/main/java/.../SanarUserInfo.kt` (new) | Needed: maps the placeholder user to `UserInfo`. |
| `app/src/main/res/layout/activity_main.xml`, `res/values/strings.xml` | Needed: the button and two strings. |
| `local.properties.example` (new) | Needed. |

Nothing outside the app module. No Gradle wrapper, `settings.gradle.kts`, root `build.gradle.kts` or `gradle.properties` changes. The `.gitignore` needed no change.

## Questions the agent asked, and the answers

Before asking anything, the agent installed the `.aar`, verified its checksum, added the permissions and ran `assembleDebug --offline`, which succeeded. It noted AGP, Gradle and Kotlin are newer than the skill's tested versions, and used no `flatDir`.

| Question | Answer |
| --- | --- |
| Client ID in `local.properties` with an example file and `BuildConfig` fields? | Yes. |
| Debug uses development and release uses production, with a placeholder for production? | Yes. |
| User field mapping, with `mid` from `DemoUser.id`? | Yes. |
| Connect in `onCreate`, with an `onSignedOut` hook? | Yes. |
| Language? | `"en"`. |
| A button or opening the dashboard automatically; only the dashboard? | A button. Dashboard only. |

## Workarounds needed

None. The build used `--offline` because the dependency cache was already warm.

## Problems found in the skill

The skill's working tree was edited after this run (uncommitted). The right-hand column says whether the current text already covers the finding, by search only. The checker did not repeat the run against the edited skill.

| Problem | Found by | Covered in the current text? |
| --- | --- | --- |
| The merged-manifest path in `android-installation.md` is outdated for AGP 8.13 (`intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml`). | agent | Yes (the file now names AGP 8.13 and uses `find`). |
| When the developer has already given the client ID, it is unclear whether to still ask where it lives. | agent | Not checked. |
| The `local.properties.example` text said "Do not commit this file", which is wrong for the example. | agent | Yes (`android-connect.md` says the example needs its own first line). |
| The wording for "show the dashboard on the home screen" on Android: the dashboard is a separate Activity, so a button is the answer. | agent | Yes (`android-screen-gotodashboardview.md` covers it). |
| Offline release lint (`lintVitalAnalyzeRelease` needs `lint-gradle`). | agent | Not found. |
| The `.aar` is about 23 KB, so the dashboard content loads remotely. | agent | Yes (`android-installation.md`, "What the size tells you"). |

## Not verified

- Running the app. There was no emulator or device, so nothing was seen on screen, no permission prompt appeared, and the button's disabled state is from code.
- A real connect, the dashboard opening, a call. There is no real client ID.
- A Release build (the agent reported a lint failure that is environmental; `compileReleaseKotlin` only).
- A fresh clone that has no `local.properties` (it also holds `sdk.dir`).
- That the skill's current text, edited after this run, makes a fresh agent succeed.
