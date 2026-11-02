# Android troubleshooting

Fixes for the problems you meet when you install, build or connect the SanarKit `.aar` in an Android app (release 2.1.1). Find the symptom, try the fix, and report what you changed. When you search the build log, search for the exact text.

The build messages below come from a sample app built with Android Gradle Plugin 8.2.2 and Gradle 8.2 against `sanarkit-release-2.1.1.aar`. The run-time behavior comes from reading the library's compiled classes, and was not run on a device. Other plugin versions may word the messages differently.

Before you change anything that is not part of the integration (`minSdk`, the Android Gradle Plugin, Gradle, Kotlin or other dependencies), tell the developer and ask.

Where the README and the shipped `.aar` disagree, these references follow the `.aar`. If the app's code came from the README, compare it with "Compile errors from the README examples".

## Build and setup

### The build says `minSdkVersion` cannot be smaller than version 24

The app's `minSdk` is lower than the library's. The message looks like this:

```text
uses-sdk:minSdkVersion 23 cannot be smaller than version 24 declared in library [sanarkit-release-2.1.1.aar] ... as the library might be using APIs not available in 23
```

Raising `minSdk` to 24 or higher in `defaultConfig` changes which devices can install the app, so **ask the developer**. The message also suggests `tools:overrideLibrary="com.sanarcare.sanarkit"`, which forces the build to pass. Do not use it: the library may call APIs that older Android versions do not have, and Sanar has not said it supports them. Whether SanarKit can run below Android 7.0 is **to confirm**.

### The build says the project contains AndroidX dependencies but `android.useAndroidX` is not enabled

The message is `Configuration ... contains AndroidX dependencies, but the android.useAndroidX property is not enabled, which may cause runtime issues.` SanarKit's screens extend an AndroidX class, so the project needs AndroidX. Add this line to `gradle.properties` (the project's normal tracked file; the flag is not a secret), then sync:

```text
android.useAndroidX=true
```

### The build says `Unresolved reference: sanarcare` or `Unresolved reference: SanarKit`

Kotlin cannot find the library, so the `.aar` is not on the classpath. The first message points at the `import com.sanarcare.sanarkit.SanarKit` line and the second at the first use of `SanarKit`. Check each of these:

- The file is in `libs/` of the module you are building, and its name is exactly `sanarkit-release-2.1.1.aar`.
- The module's build file has `implementation(files("libs/sanarkit-release-2.1.1.aar"))` (Kotlin DSL) or `implementation files('libs/sanarkit-release-2.1.1.aar')` (Groovy DSL), and the name in it matches the file.
- The project was synced after the line was added.
- The package is `com.sanarcare.sanarkit`, with that spelling.
- The dependency is in the **app** module's build file, in the `dependencies` block of that module, and not in the root build file.

### The build says `Direct local .aar file dependencies are not supported when building an AAR`

The `.aar` was added to a library module, and that module builds its own `.aar`. The Android Gradle Plugin stops because the SanarKit classes would not be packaged in the result. Add the file to the app module instead, as `android-installation.md` describes.

### The build says `Build Type 'debug' contains custom BuildConfig fields, but the feature is disabled`

A `buildConfigField` line was added (from `android-connect.md`) without turning on `BuildConfig`. Android Gradle Plugin 8 and later does not generate it unless it is asked for. Add this to the `android` block:

```kotlin
buildFeatures {
    buildConfig = true
}
```

(Groovy DSL: `buildConfig true`.) The message names the build type, or `defaultConfig`, that holds the `buildConfigField` line. Without the flag, a reference to `BuildConfig.SANAR_CLIENT_ID` also fails with `Unresolved reference: BuildConfig`. That error also appears when the file is not in the app's `namespace` package: import `<namespace>.BuildConfig`.

### `Unresolved reference: SANAR_CLIENT_ID` or `SANAR_ENVIRONMENT`

The generated `BuildConfig` lacks the field. Check that the `buildConfigField` lines are inside the build type that you are building (`debug` for `assembleDebug`, `release` for `assembleRelease`), that both fields are in **every** build type the app builds, and that you synced. For a custom build type or a product flavor, add the same two lines there.

### The client ID is empty in the build

`BuildConfig.SANAR_CLIENT_ID` is `""` when `local.properties` has no matching key and the CI variable is not set. Check without printing the value: `grep -cE "sanar\.(development|production)\.clientId" local.properties` prints only a count of the key lines. Check that the key names match the ones in the build file for the build type (`sanar.development.clientId` for `debug`, `sanar.production.clientId` for `release`) and that `local.properties` is in the root project folder (next to `settings.gradle(.kts)`), not in `app/`. If it still holds the placeholder `<CLIENT_ID from config>`, the developer has to fill in the real value. `grep -c "CLIENT_ID from config" local.properties` prints a count. Never print the file.

### `local.properties` shows up in `git status`

It is not ignored, or it is already tracked. Check with real paths, from the project root, and use the same form as `android-connect.md`, where every command prints something:

```sh
test -f local.properties || echo "MISSING: wrong folder, or the file does not exist yet"
git check-ignore -v local.properties || echo "NOT IGNORED: add it to .gitignore"
git ls-files --error-unmatch -- local.properties 2>/dev/null && echo "TRACKED: stop and tell the developer" || echo "not tracked"
```

You want no `MISSING`, a `.gitignore` rule from `git check-ignore`, and `not tracked`. `TRACKED` means the file is already in Git (Git then also prints `NOT IGNORED`, because it does not apply ignore rules to tracked files). Stop and tell the developer. Do not rewrite Git history or untrack the file without asking.

## Compile errors from the README examples

### `Type mismatch: inferred type is String but Boolean? was expected`

`isDependent` was set to a string, as the README's example does with `isDependent = "<is_dependent>"`. In the 2.1.1 library it is a `Boolean?`. Pass `true` or `false`, or leave it out.

### `No value passed for parameter` or `Cannot find a parameter with this name`

`UserInfo` has eleven required parameters (`firstName`, `lastName`, `dob`, `gender`, `nationality`, `documentId`, `mid`, `documentType`, `phoneCode`, `phoneNo`, `maritalStatus`) and two optional ones (`ipc`, `isDependent`). The README's table lists the keys of the request body (`first_name`, `marital_status` and so on), which are not the Kotlin names. Use the names from `android-connect.md`. `documentType` is an `Int`.

### The app's code is Java

The README and these references use Kotlin: `connect` has default parameters (`lang`, `onSuccess`, `onError`), and Java does not fill defaults in for you. How Java should call `connect` is **to confirm**. Tell the developer and ask before you write Java code against it.

## Connect and session

### `onError` runs and gives no reason

`onError` takes no arguments, so it cannot say why `connect` failed. Read the SDK's lines in Logcat (see "Read the SDK's Logcat lines"). Then check these, in order:

1. **Client ID.** It is not empty and it is not the placeholder, and it belongs to the environment set with `setEnvironment`. `SKEnvironment.DEVELOPMENT` and `SKEnvironment.PRODUCTION` use different client IDs. Do not read the client ID back into the chat to check it.
2. **`bundleId`.** It is the application ID, which is `packageName` at run time. If the app uses build variants with an application ID suffix, check which ID Sanar registered. Whether Sanar validates `bundleId` per build variant is **to confirm**.
3. **Network.** The device or emulator has a connection.
4. **Member details.** Every `UserInfo` field is filled in with the formats from `android-connect.md` (`dob` as `yyyy-mm-dd`, `documentType` as an `Int`, the others as strings), and no value contains a double quote or a backslash.

Print nothing from `userInfo` or the client ID while you debug. Which HTTP statuses mean a wrong client ID, an unregistered `bundleId` or invalid member details is **to confirm**: the README documents neither. If everything above is right, ask the Sanar team to look up a failed attempt, and give them the SDK version, the environment and the application ID.

### The app crashes or reports `CalledFromWrongThreadException` in a connect callback

`onSuccess` and `onError` are called from a background thread, not from the main thread. Changing a view or showing a Toast from inside one makes Android throw `CalledFromWrongThreadException`. Wrap that work in `runOnUiThread { ... }`:

```kotlin
onSuccess = { runOnUiThread { openSanar.isEnabled = true } },
```

The session class in `android-connect.md` already does this.

### A "Sanar Not Connected" toast appears and no screen opens

The `SanarKit` instance that the `goto*` method was called on has no session. The SDK shows the toast and opens nothing. The usual causes:

- `connect` has not finished. It returns at once and answers later, so wait for `onSuccess` before a screen opens.
- `connect` failed. See the entry for `onError` above.
- `disconnect` was called on this instance and `connect` was not called again.
- The method was called on a different instance than the one that connected. Each `SanarKit(this)` keeps its own session. Keep one `SanarSession` as a property of the Activity, use it for `connect` and for the screens (`sanar.kit`), and do not create a second `SanarKit` in a Fragment, a click handler or a composable.
- The code kept its own copy of `sanar.kit` (a property, a field, a lambda captured early). `SanarSession` replaces `kit` on every `connect` and `disconnect`, so a copy made earlier is an abandoned instance with no session. Read `sanar.kit` at the moment you open the screen.
- The instance is new. The session is in memory only, so an Activity that was recreated (for example after a screen rotation), and an app that started again after Android ended its process, both have a new instance and need `connect` again.

The README's `gotoDashboardView` example also creates a new `SanarKit(this)` just before the call. In 2.1.1 a new instance has no session, so that snippet shows this toast unless the same instance connected earlier.

### A Sanar screen does not open, and there is no toast

The SDK opens each screen by calling `startActivity` on the context it was given, and it does not add `FLAG_ACTIVITY_NEW_TASK`. Create the instance with an Activity (`SanarKit(this)` inside an Activity), not with the application context. The exact symptom of an application context was not reproduced on a device, so it is **to confirm**.

### The connect result arrives after the screen is gone, or after the user signed out

A pending `connect` cannot be cancelled, and its callback arrives later on a background thread, after sign-out, after the next member connected, or after the Activity is gone. The SDK keeps the session inside the `SanarKit` instance that `connect` was called on, so reusing one instance would let a late result overwrite the session of the member who signed in afterwards. The session class in `android-connect.md` avoids this: every `connect` and `disconnect` replaces the instance, a generation number drops late results, and it also ignores a result when the Activity is finishing or destroyed. If the app wrote its own wrapper, it needs the same three things.

### `connect` fails for a member whose name contains a quote

The SDK builds the request body by joining the field values into JSON text, and the compiled 2.1.1 code does not escape quotes or backslashes. A name such as `Demo"User` or a value with a backslash could produce a body that Sanar cannot read. Whether it fails in practice is **to confirm**. If you meet it, report it to the Sanar team.

## Camera, microphone and screens

### The camera or the microphone does not work in a consultation

The consultation screen asks the member for `CAMERA` and `RECORD_AUDIO` when it opens. Check these:

- The app's manifest declares both permissions. The `.aar` does not, and Android only shows the request for permissions that are in the merged manifest. See `android-installation.md`.
- The member did not refuse the permission. If they did, they can allow it again in the app's settings on the device.
- On an emulator, a camera and a microphone are enabled in the emulator's settings.

What the consultation shows when the member refuses a permission is **to confirm**.

### An "Invalid appointment or doctor ID" toast appears

`gotoConsultationView` was called with an empty `aId` or an empty `dId`, and the SDK opened nothing. Check where the app reads the two IDs from. If they come from an Intent extra, `getStringExtra(...)` returns `null` when the extra is missing, and `.orEmpty()` turns that into an empty string.

### `onNewIntent` is never called for the second notification

General Android behavior, not Sanar's: `onNewIntent` runs only when the Activity is reused, which needs `launchMode="singleTop"` or `singleTask`, or `FLAG_ACTIVITY_SINGLE_TOP`. Without it, Android creates a new Activity for each notification. Do not change the launch mode unasked.

## Read the SDK's Logcat lines

`connect` writes one line at debug level. Read only the failure lines:

```sh
adb logcat -d | grep -E "Error connecting to Sanar|API Failed"
```

| Message | Means |
| --- | --- |
| `Error connecting to Sanar:` followed by a status | Sanar answered with a status other than 200, and the SDK called `onError` |
| `API Failed` | The request failed before it had a usable answer, for example with no network, and the SDK called `onError` |

On success the SDK writes the whole response to Logcat (tag `SanarConnectResponse`). That response holds the details of the session. Do not print it, do not paste it into the chat or a commit, and remove it before a log is shared. Filter it out as above. Whether the SDK should write it in a release build is **to confirm**: it does so unconditionally in 2.1.1.

## Release builds

A minified release build (R8 with `proguard-android-optimize.txt`) of a sample app built without errors. The `.aar` ships no ProGuard rules (its `proguard.txt` is empty), and whether a minified build needs keep rules for SanarKit is **to confirm**. The sample app was built but not run on a device. If a release build behaves differently from a debug build, compare the two and tell the developer. Do not add keep rules unasked.

## Still stuck?

Ask the Sanar team. Say which SanarKit version the app uses (the `.aar` file name), the Android Gradle Plugin, Gradle and Android versions, the steps that fail, and the failure Logcat lines, with the response line removed. Never send the client ID in a message that others can read.
