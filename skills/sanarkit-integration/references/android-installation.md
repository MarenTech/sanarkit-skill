# Android installation

Add the SanarKit `.aar` to an Android app module, add the Gradle dependency, and declare the camera and microphone permissions. This file covers: checks before you install, getting the `.aar`, the dependency in Kotlin and Groovy DSL, the requirements that can break the build, the manifest permissions and how to verify.

This is the native Android SDK, a separate product from the React Native and iOS SDKs. Everything here follows the SanarKit Android README and the shipped `sanarkit-release-2.1.1.aar` (release 2.1.1, published 2025-09-02), checked against the compiled library. If the installed `.aar` disagrees with this file, trust the installed `.aar` and tell the developer.

## Check these before you install

1. **App module and build language.** Find the module that applies the `com.android.application` plugin (usually `app/`). If several app modules match, list them and ask which one to integrate. Check whether its build file is `build.gradle.kts` (Kotlin DSL) or `build.gradle` (Groovy DSL) and write in that language. The `.aar` goes into an **application** module, never into a library module (see "Direct local .aar" in `android-troubleshooting.md`). Run Gradle from the project root (the folder with `settings.gradle` or `settings.gradle.kts`), which can be a folder below the Git root.

   ```sh
   grep -rliE "com\.android\.application|plugins\.android\.?application" --include=build.gradle --include=build.gradle.kts .
   ```

   The second pattern also finds modules that apply the plugin through a version catalog (`alias(libs.plugins.android.application)`, or `androidApplication` in camelCase). The root build file often lists the plugin with `apply false`: that is not the app module. If only the root file matches, read `gradle/libs.versions.toml` to see which alias is `com.android.application`, and search the module build files for that alias.

2. **Is SanarKit already there?**

   ```sh
   find . -name "sanarkit*.aar" -not -path "*/build/*"
   grep -rn -i "sanarkit" --include=build.gradle --include=build.gradle.kts --include=libs.versions.toml --include=settings.gradle --include=settings.gradle.kts .
   ```

   If a `sanarkit-release-<version>.aar` is already there, read the version from the file name and compare it with 2.1.1. Follow the older-version rule in `SKILL.md`: report both versions and **ask before replacing it**. Do not delete the old `.aar` unasked. An older `flatDir` repository that points at `libs/` is left as it is: it does no harm next to a `files(...)` dependency, and removing it is not your job.
3. **Language.** The README and this skill use Kotlin. If the app's code is Java, tell the developer and ask how to go on: how Java calls `connect` with its default parameters is **to confirm**.
4. **`minSdk`.** Read `minSdk` (or `minSdkVersion`) in the app module's `defaultConfig`. SanarKit needs 24 or higher (see "Requirements").
5. **Git state.** Run `git status` and tell the developer about uncommitted changes, so your edits stay separate from theirs.
6. **A client ID** from the Sanar team, to connect a member. You do not need it to install.

## Get the `.aar`

The file `sanarkit-release-2.1.1.aar` is in the root of the repository `github.com/MarenTech/SanarKitAndroid`. The GitHub releases have no attached files, so the "release" for 2.1.1 is the file at the `2.1.1` tag. Download that exact file into the app module's `libs/` folder (create it if it does not exist):

```sh
mkdir -p app/libs
curl -fL -o app/libs/sanarkit-release-2.1.1.aar \
  https://github.com/MarenTech/SanarKitAndroid/raw/2.1.1/sanarkit-release-2.1.1.aar
unzip -l app/libs/sanarkit-release-2.1.1.aar
shasum -a 256 app/libs/sanarkit-release-2.1.1.aar
```

Replace `app` with the app module's folder. `curl -f` makes a failed download an error instead of saving an error page. The listing from `unzip -l` must show `AndroidManifest.xml`, `classes.jar` and a `res/` folder. If it is not a zip file, delete it and stop.

The checksum must be exactly this (24237 bytes). On Linux without `shasum`, use `sha256sum`; on Windows, `certutil -hashfile <file> SHA256`:

```text
82002d09b3c3200ef5220e345cd1b5570b4cb4da78d3996065693cbfd9e55a82
```

This is the hash of the file at the `2.1.1` tag, computed when this reference was written (the same file is at the root of the default branch). If the hash differs, stop and tell the developer: the file may have been replaced since, or the download is damaged. Do not add a file you cannot match, and ask how to go on.

- **Another version.** This skill covers 2.1.1. To see whether a newer tag exists, run `git ls-remote --tags https://github.com/MarenTech/SanarKitAndroid`. If there is one, tell the developer and **ask before using it**: the file name carries the version, and the Gradle line must match it.
- **Is the file ignored by Git?** Some projects ignore `*.aar`. Check with a real path:

  ```sh
  test -f app/libs/sanarkit-release-2.1.1.aar || echo "MISSING: the download is not at this path"
  git check-ignore -v app/libs/sanarkit-release-2.1.1.aar || echo "not ignored"
  ```

  You want `not ignored` and no `MISSING`. `MISSING` means the path is wrong: fix that first, because the second command says nothing useful for a file that is not there. If a rule prints, the `.aar` would not reach teammates or the CI build: tell the developer and ask whether to commit it or fetch it in the build. Do not change `.gitignore` for this unasked.

## Add the dependency

Add the file to the **app module** build file, inside the existing `dependencies { }` block. Leave the other dependencies as they are.

Kotlin DSL (`app/build.gradle.kts`):

```kotlin
dependencies {
    // Your other dependencies stay as they are.
    implementation(files("libs/sanarkit-release-2.1.1.aar"))
}
```

Groovy DSL (`app/build.gradle`):

```groovy
dependencies {
    // Your other dependencies stay as they are.
    implementation files('libs/sanarkit-release-2.1.1.aar')
}
```

- **Do not add a `flatDir` repository** and do not change `repositoriesMode` in `settings.gradle(.kts)`. Older Sanar instructions did, and it is not needed: a sample app with `RepositoriesMode.FAIL_ON_PROJECT_REPOS` and no `flatDir` built with the `files(...)` line alone.
- **Not in `libs.versions.toml`.** A version catalog cannot hold a `files(...)` dependency. Write the line in the module's build file, even if every other dependency uses the catalog.
- **Sync** the project. From the command line, `./gradlew help` from the project root shows that Gradle still configures.

## Requirements that can break the build

Check each one. **Ask before you raise `minSdk` or change any plugin or library version.**

| Requirement | Check | If it is not met |
| --- | --- | --- |
| `minSdk` 24 or higher | `defaultConfig { minSdk = ... }` | Raising `minSdk` changes which devices can install the app, so **ask the developer**. Never use `tools:overrideLibrary="com.sanarcare.sanarkit"` to force the build through: the library may call APIs that older Android versions do not have |
| AndroidX | `android.useAndroidX=true` in `gradle.properties` | Add that line to the project's `gradle.properties` (this is a normal tracked file, and the flag is not a secret). The build stops with a message about AndroidX dependencies when it is missing |
| `androidx.activity` | The module depends on `androidx.appcompat:appcompat` or `androidx.activity:activity-ktx` (most apps do) | SanarKit's two screens extend `androidx.activity.ComponentActivity`. A missing library does not fail the build: it shows up at run time. Ask before you add it, and which version is **to confirm** |
| Kotlin standard library 1.8.20 or later (the minimum is **to confirm**) | The Kotlin Gradle plugin adds `kotlin-stdlib` for you | `SKEnvironment` uses a class that 1.7.10 does not have, and 1.8.20 and 1.9.0 have it. Ask before you bump the Kotlin plugin |

The Android Gradle Plugin, Gradle and `compileSdk` versions Sanar supports are **to confirm**: the `.aar` sets no minimum. A sample app built with the `.aar` on AGP 8.2.2, Gradle 8.2, `compileSdk` 34, the Kotlin Gradle plugin 1.9.24 and Java 17, in a debug build and in a minified release build (R8). Do not upgrade the app's own versions to match this.

## Declare the permissions

The `.aar` has its own manifest, and Gradle merges it into the app's. It declares only `INTERNET` and `ACCESS_COARSE_LOCATION`, so the app does not have to declare those two. It does **not** declare the camera and the microphone, and the consultation screen asks the member for both at run time. Android only shows that request for a permission that is in the app's merged manifest, so **the host app must declare `android.permission.CAMERA` and `android.permission.RECORD_AUDIO`**. Without them the consultation cannot use the camera or the microphone.

Add these to the app module's `src/main/AndroidManifest.xml`, as children of `<manifest>`, above `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

- **Merge, do not duplicate.** Read the manifest first. If a permission is already there, leave it alone. A manifest may also sit in a build-variant folder (`src/debug/`, `src/<flavor>/`): look there too.
- **You write no permission request.** `CAMERA` and `RECORD_AUDIO` are run-time permissions, and in 2.1.1 the consultation screen asks for both itself when it opens. Do not add your own request code.
- **`MODIFY_AUDIO_SETTINGS`** is in the older Sanar guide only, and no class in the 2.1.1 `.aar` refers to it. Keep it, and tell the developer that whether it is needed is **to confirm**.
- **`ACCESS_COARSE_LOCATION`** arrives in the merged manifest through the `.aar`, although nothing in 2.1.1 asks for it. Why it is declared is **to confirm**. Tell the developer: if the app is published on Google Play, it affects what the app declares about location. Do not remove it with `tools:node="remove"` unasked.
- What the member sees when they refuse the camera or the microphone is **to confirm**. The README does not say.

## Import the library

In any Kotlin file that uses SanarKit:

```kotlin
import com.sanarcare.sanarkit.SanarKit
```

The package is `com.sanarcare.sanarkit` and it also holds `SKEnvironment` and `UserInfo`, which `android-connect.md` uses. Spelling matters: `sanarcare`, then `sanarkit`, all lowercase.

## Verify

- `./gradlew assembleDebug` from the project root (use `gradlew.bat` on Windows) finishes with `BUILD SUCCESSFUL`, with an `import com.sanarcare.sanarkit.SanarKit` in a file that compiles. If it fails only after your change, read `android-troubleshooting.md` before you change anything else.
- The merged manifest has the permissions. After a build, search the merged manifest (the path can differ by Android Gradle Plugin version and variant; Android Studio's **Merged Manifest** tab shows it too):

  ```sh
  grep -E "CAMERA|RECORD_AUDIO|INTERNET|ACCESS_COARSE_LOCATION" app/build/intermediates/merged_manifests/debug/AndroidManifest.xml
  ```

  It must list `CAMERA` and `RECORD_AUDIO` (yours) and `INTERNET` and `ACCESS_COARSE_LOCATION` (from the `.aar`).
- `git status` shows only what the integration needs: the new `.aar` (untracked, or ignored, which you report), the module's build file, `AndroidManifest.xml`, and `gradle.properties` if you added the AndroidX flag.
- `shasum -a 256` of the `.aar` printed the hash from "Get the `.aar`".
- In the report, say that the `.aar` came from the `2.1.1` tag of `github.com/MarenTech/SanarKitAndroid`, so the developer knows where the binary is from.
- A release build can differ from a debug build: the `.aar` ships no ProGuard rules, and whether a minified build needs keep rules is **to confirm**. Tell the developer to test a release build on a device before shipping.
- If you could not run Gradle (no JDK, no Android SDK), say exactly what you could not verify.
