# Android: environment and connect

Create the `SanarKit` instance, choose the environment, keep the client ID out of the source, connect the signed-in member with `connect`, and end the session with `disconnect`. Every Sanar screen needs this session.

All the Kotlin below was type-checked against the shipped `sanarkit-release-2.1.1.aar` (compiled in a debug and a release build, and the Gradle snippets in both Kotlin and Groovy DSL). The session class was also run against a fake SDK to check the sign-out and sign-in sequences. Nothing was run on a device or against a Sanar environment.

## Checklist

Do these in order, after you have asked the questions in "Ask first". Each step is a section below.

1. Check that the config file exists, is ignored and is not tracked.
2. Add the placeholders to it.
3. Add the committed example file.
4. Add the Gradle lines that turn the config into `BuildConfig` fields.
5. Add `SanarSession.kt` ("Create the instance").
6. Add the `SanarHost` interface, only if the app uses Fragments ("Fragments and Compose").
7. Add the function that maps the app's user to `UserInfo` ("Member details").
8. Wire it in: create the session in the Activity, connect after sign-in, disconnect on sign-out ("Connect in an Activity").

## Ask first

Ask the developer these questions. Do not guess the answers.

1. **Where does the client ID live?** Use the app's existing secret or environment mechanism if it has one (a git-ignored properties file, a CI variable, a secrets plugin). If it has none, use `local.properties` as below. Do not use the project's own `gradle.properties` for it: that file is normally committed.
2. **How does the app tell its environments apart?** The default below uses the `debug` build type for `development` and the `release` build type for `production`. If the app has other build types or product flavors (staging, beta), each one needs its own environment and client ID: ask.
3. **How do the signed-in user's fields map to the SDK's member fields?** See "Member details".
4. **Where does the app know that a user has signed in or out, and which Activity opens the Sanar screens?** The session below connects and disconnects there. If several Activities open Sanar screens, each needs its own `SanarKit` instance and its own `connect` (see "Create the instance"): ask how to share the work.
5. **Which language?** `lang` is `"en"` (the default) or `"ar"`. Ask whether it should follow the app's language.

Never ask the developer to paste the client ID into the chat. If they paste it anyway, write it only into the git-ignored config file, and never repeat it in your output.

## Keep the client ID out of the source

The client ID is a per-client secret, and each environment has its own client ID. Never hardcode it in a source file that Git tracks. Never print it, log it, or read it back into the chat. Never print the config file or `BuildConfig.java`. The client ID still ships inside the built app, because the SDK sends it from the device and `BuildConfig` is compiled into the app. Keeping it out of Git protects the repository, and does not hide it from someone who inspects the app.

On Android the `authToken` argument of `connect` is the client ID.

### If the app already has a way to keep secrets

Use it. Make the value reach `BuildConfig` as the two fields below (`SANAR_ENVIRONMENT` and `SANAR_CLIENT_ID`), or read it wherever the app keeps its other secrets. Do not add a plugin or library for this without asking. Check that any file you use is ignored and untracked, with the commands below.

A user-level `~/.gradle/gradle.properties` is outside the repository and also works. In the build file below, replace `localProperties.getProperty("sanar.$environment.clientId")` with `providers.gradleProperty("sanar.$environment.clientId").orNull` (Kotlin DSL; checked with a `-P` property, which Gradle reads the same way). Never put the keys in the **project's** `gradle.properties`, which is normally committed.

### If the app has none: `local.properties`

1. **Check the file with real paths.** `local.properties` sits in the project root, next to `settings.gradle(.kts)`, and the Git root can be a folder above it. Run these from the project root, with the path as it is from where you run them (for example `android/local.properties` if the project is in a subfolder):

   ```sh
   test -f local.properties || echo "MISSING: create it first (step 2)"
   git check-ignore -v local.properties || echo "NOT IGNORED: add it to .gitignore"
   git ls-files --error-unmatch -- local.properties 2>/dev/null && echo "TRACKED: stop and tell the developer" || echo "not tracked"
   ```

   Every command prints something, so an empty result cannot pass by accident. You want: no `MISSING`, a `.gitignore` rule printed by `git check-ignore`, and `not tracked`. Android Studio lists `local.properties` in `.gitignore` for new projects, but this project may not. `MISSING` means the file does not exist yet: create it (step 2) and run the checks again. `NOT IGNORED` means you must add `local.properties` to the `.gitignore` and check again. `TRACKED` means the file is already in Git (Git then also reports `NOT IGNORED`, because it does not apply ignore rules to tracked files): stop and tell the developer, and do not rewrite Git history or untrack files without asking.

2. **Add placeholders.** Append these lines to `local.properties`, below whatever is there (Android Studio keeps `sdk.dir` in it, so never overwrite the file). The developer fills in the real values:

   ```text
   # Do not commit this file. It is listed in .gitignore.
   # SanarKit client IDs, one per environment, from the Sanar team. Fill both in locally.
   sanar.development.clientId=<CLIENT_ID from config>
   sanar.production.clientId=<CLIENT_ID from config>
   ```

3. **Add a committed example file** (do not run `git commit` yourself: leave it for the developer to review). Create `local.properties.example` in the same folder with only the lines above (never `sdk.dir`, never a real value). It is meant to be tracked, so a fresh clone knows the key names (`cp local.properties.example local.properties`, then fill in). Check that no `.gitignore` rule swallows it: `git check-ignore -v local.properties.example || echo "not ignored"` must print `not ignored`. The build below still works when the keys are missing: the client ID is then empty and the app does not call `connect`.

4. **Expose them as `BuildConfig` fields** in the app module's build file. Merge the lines into the `android { }` block, `buildTypes` and `release` blocks the file already has, and put the `import` at the top. Android Gradle Plugin 8 and later does not generate `BuildConfig` unless `buildFeatures { buildConfig = true }` is set.

   Kotlin DSL (`app/build.gradle.kts`):

   ```kotlin
   import java.util.Properties

   // The plugins block stays as it is.

   val localProperties = Properties().apply {
       val file = rootProject.file("local.properties")
       if (file.exists()) file.inputStream().use { load(it) }
   }

   // The client ID for one environment: local.properties first, then an environment variable
   // (for CI). A key that is missing or has an empty value counts as missing. The result is empty
   // when neither has it, so a fresh clone still builds.
   fun sanarClientId(environment: String): String =
       localProperties.getProperty("sanar.$environment.clientId")?.trim()?.takeIf { it.isNotEmpty() }
           ?: System.getenv("SANAR_${environment.uppercase()}_CLIENT_ID")?.trim()?.takeIf { it.isNotEmpty() }
           ?: ""

   android {
       // Your other settings stay as they are.
       buildFeatures {
           buildConfig = true
       }
       buildTypes {
           debug {
               buildConfigField("String", "SANAR_ENVIRONMENT", "\"development\"")
               buildConfigField("String", "SANAR_CLIENT_ID", "\"${sanarClientId("development")}\"")
           }
           release {
               buildConfigField("String", "SANAR_ENVIRONMENT", "\"production\"")
               buildConfigField("String", "SANAR_CLIENT_ID", "\"${sanarClientId("production")}\"")
           }
       }
   }
   ```

   Groovy DSL (`app/build.gradle`):

   ```groovy
   // The plugins block stays as it is.

   def localProperties = new Properties()
   def localPropertiesFile = rootProject.file('local.properties')
   if (localPropertiesFile.exists()) {
       localPropertiesFile.withInputStream { localProperties.load(it) }
   }

   // The client ID for one environment: local.properties first, then an environment variable
   // (for CI). A key that is missing or has an empty value counts as missing. The result is empty
   // when neither has it, so a fresh clone still builds.
   def sanarClientId = { String environment ->
       def fromFile = localProperties.getProperty("sanar.${environment}.clientId")?.trim()
       def fromEnv = System.getenv("SANAR_${environment.toUpperCase()}_CLIENT_ID")?.trim()
       fromFile ?: fromEnv ?: ''
   }

   android {
       // Your other settings stay as they are.
       buildFeatures {
           buildConfig true
       }
       buildTypes {
           debug {
               buildConfigField 'String', 'SANAR_ENVIRONMENT', '"development"'
               buildConfigField 'String', 'SANAR_CLIENT_ID', "\"${sanarClientId('development')}\""
           }
           release {
               buildConfigField 'String', 'SANAR_ENVIRONMENT', '"production"'
               buildConfigField 'String', 'SANAR_CLIENT_ID', "\"${sanarClientId('production')}\""
           }
       }
   }
   ```

   The pairing is the point: a `debug` build can only get the development client ID and a `release` build only the production one. For a staging build type or a product flavor, add the same two lines with that environment's name and keys, and tell the developer which Sanar environment it uses. Never hardcode `development` in a way that ships in release builds.

   A CI build must provide the file or the two environment variables (`SANAR_DEVELOPMENT_CLIENT_ID`, `SANAR_PRODUCTION_CLIENT_ID`). Otherwise the field is empty and the app never connects. Say that in the report.

5. **In code, use `BuildConfig.SANAR_CLIENT_ID`.** Android generates `BuildConfig` in the app's `namespace` package. Import it if the file you write is in another package.

Tell the developer to replace both placeholders. To check that they are still unfilled without printing the file, use `grep -c "CLIENT_ID from config" local.properties`, which prints only a count. Leave the placeholders until the developer fills them in. The app builds with them, but the session below treats a value that starts with `<` as missing, so `connect` is never called, `isConnected` stays false, and no Sanar screen opens. Say that in the report.

## Create the instance

```kotlin
class SanarKit(context: Context)
```

Create the instance with an **Activity**, and keep it in the session class below, as a property of that Activity (or, in a Fragment app, of the Activity that hosts the Fragments). Pass the Activity, not the application context. SanarKit opens each screen by calling `startActivity` on the context you give it, and it does not add `FLAG_ACTIVITY_NEW_TASK`, which Android expects for a call from a context that is not an Activity. What exactly happens with an application context was not reproduced on a device, so it is **to confirm**.

- **The instance holds the session.** `connect` stores the session in the instance, and `setEnvironment`, `disconnect` and every `goto*` method act on that instance. A second `SanarKit(this)` has no session, and its `goto*` methods show a "Sanar Not Connected" toast and open nothing. Open every screen on the instance that connected.
- **Connect again when the instance is new.** The session is in memory only. An Activity that is recreated (a screen rotation, a theme change) creates a new instance, and so does an app that starts again after Android ended its process. Connect again in both cases.
- **The instance holds your Activity.** Never keep it in a singleton, an `Application` property, a `ViewModel` or any other long-lived object: it would keep the Activity alive after Android has finished with it.
- **Create it after `super.onCreate`, never eagerly in a property initializer:** the Activity has no context yet at that point. `by lazy { SanarSession(this) }` is safe, because it runs on first use. That first use must be on the main thread, and it can be a Fragment reading the session while the layout inflates, which is why the samples use `by lazy` and not `lateinit`.

The README calls the argument "the application context", but every example in the README passes an Activity, and the compiled library behaves as described above. Whether Sanar supports an app-wide instance, and how an app with several Activities should share one session, are **to confirm**.

The session class below owns the instance and the rules above. Add it as one small file (for example `SanarSession.kt`) in the app's main package and follow the app's naming. `BuildConfig` is the class from the Gradle step:

```kotlin
package com.example.demo // replace with the app's package

import android.app.Activity
import com.sanarcare.sanarkit.SKEnvironment
import com.sanarcare.sanarkit.SanarKit
import com.sanarcare.sanarkit.UserInfo

/**
 * Owns the SanarKit instance of one Activity and remembers whether it is connected.
 * Make it a property of that Activity. Never put it in a singleton or a ViewModel.
 *
 * The SDK stores the session inside the SanarKit instance, and a connect that is running cannot be
 * cancelled. So every connect and every disconnect starts with a fresh instance: a late result can
 * only land on an instance that nothing reads any more.
 */
class SanarSession(private val activity: Activity) {
    /**
     * The instance that holds the current session. Open every Sanar screen on it, and read this
     * property each time you use it: connect and disconnect replace the instance, so never keep a copy.
     */
    var kit: SanarKit = newKit()
        private set

    /** True after connect succeeded and until disconnect. Read it on the main thread. */
    var isConnected = false
        private set

    // Bumped by every connect and disconnect. A result that arrives for an older number is ignored.
    private var generation = 0

    private val listeners = mutableListOf<(Boolean) -> Unit>()

    private fun newKit(): SanarKit = SanarKit(activity).also {
        it.setEnvironment(
            if (BuildConfig.SANAR_ENVIRONMENT == "development") SKEnvironment.DEVELOPMENT
            else SKEnvironment.PRODUCTION,
        )
    }

    /** Call after the user signs in. [onResult] runs on the main thread: true when connected. */
    fun connect(userInfo: UserInfo, onResult: (Boolean) -> Unit = {}) {
        val clientId = BuildConfig.SANAR_CLIENT_ID
        if (clientId.isBlank() || clientId.startsWith("<")) {
            // Missing, or still the placeholder from local.properties: do not call connect.
            onResult(false)
            return
        }
        // A new attempt, or a different member on the same device: end the earlier session, and
        // connect on a fresh instance.
        reset()
        val attempt = generation
        kit.connect(
            userInfo = userInfo,
            authToken = clientId,
            bundleId = activity.packageName,
            lang = "en", // "ar" for Arabic
            onSuccess = { deliver(attempt, true, onResult) },
            onError = { deliver(attempt, false, onResult) },
        )
    }

    // connect calls its callbacks on a background thread, so go to the main thread first.
    private fun deliver(attempt: Int, connected: Boolean, onResult: (Boolean) -> Unit) {
        activity.runOnUiThread {
            // The Activity is gone, or the user signed out or connected again since: ignore the late result.
            if (attempt != generation || activity.isFinishing || activity.isDestroyed) return@runOnUiThread
            setConnected(connected)
            onResult(connected)
        }
    }

    /** Call when the user signs out. It only clears the session on the device. */
    fun disconnect() = reset()

    private fun reset() {
        generation++
        kit.disconnect()
        // A connect that is still running keeps the old instance, and can only store its session there.
        kit = newKit()
        setConnected(false)
    }

    /** [listener] runs on the main thread each time [isConnected] changes. */
    fun addConnectionListener(listener: (Boolean) -> Unit) {
        listeners += listener
    }

    fun removeConnectionListener(listener: (Boolean) -> Unit) {
        listeners -= listener
    }

    private fun setConnected(value: Boolean) {
        if (isConnected == value) return
        isConnected = value
        listeners.toList().forEach { it(value) }
    }
}
```

The SDK stores the session inside the `SanarKit` instance, and a `connect` that is running cannot be cancelled. If one instance were reused, this could happen: `connect` for member A is still running, the user signs out, member B signs in and connects, and A's connect finishes last. The instance would then hold A's session while the app believes B is connected, and B would open A's data. That is why `SanarSession` gives every `connect` and every `disconnect` a fresh instance: a late result lands on an abandoned instance that nothing reads, and the generation number keeps it out of the app's state. Two things follow:

- **Read `sanar.kit` each time you open a screen** (in the click handler, not once at start-up), and never keep your own copy of it. A copy made before the last `connect` or `disconnect` is an abandoned instance with no session, and its screens show "Sanar Not Connected".
- A second `connect` while the first one is still running is safe: the first result is ignored.

### Fragments and Compose

- **Fragments.** Keep the session in the Activity that hosts them, so it survives moving between Fragments, and let the Fragments reach it through an interface that the Activity implements:

  ```kotlin
  /** Implemented by the Activity that owns the SanarSession, so its Fragments can open Sanar screens. */
  interface SanarHost {
      val sanar: SanarSession
  }
  ```

  A Fragment then uses `(requireActivity() as SanarHost).sanar`, from `onViewCreated` onward. The Activity implements it with `override val sanar: SanarSession by lazy { SanarSession(this) }`. Never give a Fragment its own `SanarKit` while the Activity has one, because the second instance has no session. A Fragment-only entry point may own a `SanarSession(requireActivity())` created in `onCreate`, but then it connects again each time the Fragment is recreated. A Fragment adds a connection listener when its view is created and removes it in `onDestroyView` (see the screen references), so that it does not replace the listener of another screen.
- **Jetpack Compose.** Compose does not change the rules: the Activity owns the `SanarSession`. Pass a lambda down to the composable (`onOpenSanar = { sanar.kit.gotoDashboardView() }`) and the connected flag as state, which you set from a connection listener (`addConnectionListener`). Do not create `SanarKit` inside a composable: it would be created again on every recomposition and would never have a session.

## Set the environment

```kotlin
fun setEnvironment(env: SKEnvironment)
```

`setEnvironment` chooses which Sanar environment the instance talks to. Call it on every instance, before `connect`. The session above does it for each instance it creates. If it is never called, the SDK uses `SKEnvironment.PRODUCTION`.

```kotlin
import com.sanarcare.sanarkit.SKEnvironment

sanarKit.setEnvironment(SKEnvironment.DEVELOPMENT) // or SKEnvironment.PRODUCTION
```

| Environment | Use it for |
| --- | --- |
| `SKEnvironment.PRODUCTION` | The default. Live apps with real members |
| `SKEnvironment.DEVELOPMENT` | Building and debugging the integration |

`SKEnvironment` has only these two values. Pass the value from `BuildConfig` (as the session does), not a literal, so the environment and the client ID come from the same build type. Tell the developer that release builds need `production` and a production client ID.

## Connect

```kotlin
fun connect(userInfo: UserInfo, authToken: String, bundleId: String, lang: String = "en", onSuccess: (() -> Unit)? = null, onError: (() -> Unit)? = null)
```

`connect` sends the member's details to Sanar and starts a session. It returns at once. The request runs on a new background thread, and the result comes back through `onSuccess` or `onError`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `userInfo` | `UserInfo` | Required | The member's details. See "Member details" |
| `authToken` | `String` | Required | **The client ID** for the current environment, from config (`BuildConfig.SANAR_CLIENT_ID`). The SDK sends it as the `Authorization` header |
| `bundleId` | `String` | Required | The identifier of the app that Sanar knows. Pass `packageName`, the application ID. Whether Sanar checks it per build variant (an application ID suffix) is **to confirm** |
| `lang` | `String` | `"en"` | Switches the SDK between Arabic (`"ar"`) and English (`"en"`). Other codes are **to confirm** |
| `onSuccess` | `(() -> Unit)?` | `null` | Called when the connection succeeded |
| `onError` | `(() -> Unit)?` | `null` | Called when the connection failed. It receives no arguments, so it cannot tell you why |

**The callbacks do not run on the main thread.** They are called from the background thread that `connect` starts. Touching a view or showing a Toast from inside one fails with `CalledFromWrongThreadException`. Wrap that work in `runOnUiThread { ... }`, as the session above does. The README's comments suggest updating the UI inside the callbacks, and do not mention this.

Name every argument, as the examples do. `connect` returns before the result is known, so wait for `onSuccess` before any Sanar screen opens.

### Handle both outcomes

| Outcome | What happens in 2.1.1 | What to do |
| --- | --- | --- |
| Success | Sanar answers with HTTP status 200 and a response that has a `data` object. The SDK keeps it as the session of this instance and calls `onSuccess` | Mark the session as connected and enable the Sanar entry points |
| Failure | Any other status, a network error, or a response the SDK cannot read. The SDK calls `onError` | Show a message and let the member try again. Check the client ID, the environment, `bundleId` and the member details. Do not log `userInfo` |

`onError` gives no reason. The SDK writes one line to Logcat at debug level. To read only the failure lines, without printing the success line (which holds the session details), use:

```sh
adb logcat -d | grep -E "Error connecting to Sanar|API Failed"
```

`Error connecting to Sanar:` followed by a status means Sanar answered with a status other than 200. `API Failed` means the request failed before it had a usable answer, for example with no network. What the response `data` object contains and which statuses Sanar returns for a wrong client ID, an unknown `bundleId` or invalid member details are **to confirm**: the README documents neither the response nor the errors. Whether the SDK should write the response to Logcat in a release build is also **to confirm**: it does so unconditionally in 2.1.1.

## Member details (`UserInfo`)

`UserInfo` describes the member. Build it from the signed-in user.

| Parameter | Type | What to send |
| --- | --- | --- |
| `firstName` | `String` | First name |
| `lastName` | `String` | Last name |
| `dob` | `String` | Date of birth as `yyyy-mm-dd` |
| `gender` | `String` | Gender code: `"M"` or `"F"` |
| `nationality` | `String` | Nationality, such as `"Saudi Arabia"` |
| `documentId` | `String` | The ID document number |
| `mid` | `String` | The member ID. Whether it must be the app's own stable ID or one that Sanar issues is **to confirm** |
| `documentType` | `Int` | The type of ID document. The examples use `1`. What each value means is **to confirm** |
| `phoneCode` | `String` | Country calling code without `+`, such as `"966"` |
| `phoneNo` | `String` | Phone number without the country code |
| `maritalStatus` | `String` | `"0"` for unmarried, `"1"` for married |
| `ipc` | `String?` | Optional. Insurance Provider Code. The default is `null` |
| `isDependent` | `Boolean?` | Optional. Whether the member is a dependent. The default is `null`, which the SDK sends as `false` |

Rules:

- **Ask which of the app's fields go into which of these.** Never invent personal data. If the app does not hold a field, ask the developer what to send.
- The first eleven parameters have no default, so Kotlin makes you pass them. `ipc` and `isDependent` are optional: send them only if the app has the data. Name every argument.
- `isDependent` is a `Boolean?`. The README's example sets it to a string, which does not compile. Pass `true`, `false` or leave it out.
- The README's table lists the request body keys (`first_name`, `marital_status` and so on). The Kotlin parameter is `maritalStatus`: use the names above. Whether Sanar reads `maritalStatus` or `marital_status` is **to confirm**.
- The SDK joins the field values into JSON text without escaping quotes or backslashes, so a value that contains `"` or `\` could make the request invalid. Whether it fails in practice is **to confirm**. Do not pass those characters, and tell the developer if a member's data contains them.
- `UserInfo` is a data class, so its `toString()` prints every field. Do not log or print it.

Map the app's user to `UserInfo` in one place, after the developer has confirmed the mapping. `AppUser` stands for the app's own user type:

```kotlin
import com.sanarcare.sanarkit.UserInfo

fun sanarUserInfo(user: AppUser): UserInfo = UserInfo(
    firstName = user.firstName, // replace every right-hand side with the app field the developer confirmed
    lastName = user.lastName,
    dob = user.birthDate, // yyyy-mm-dd
    gender = user.gender, // "M" or "F"
    nationality = user.nationality,
    documentId = user.nationalId,
    mid = user.id,
    documentType = user.documentType, // an Int. What each value means is to confirm: ask the developer
    phoneCode = user.phoneCode,
    phoneNo = user.phoneNumber,
    maritalStatus = user.maritalStatus, // "0" or "1"
)
```

For a member with the optional fields, use `copy` (only with data the app really holds):

```kotlin
val dependentMember = sanarUserInfo(user).copy(isDependent = true)
```

The shape, with **demo data** only. Do not copy these values into the app:

```kotlin
fun demoMember() = UserInfo(
    firstName = "Demo",
    lastName = "User",
    dob = "1990-01-01",
    gender = "M",
    nationality = "Saudi Arabia",
    documentId = "1234567890",
    mid = "demo-member-001",
    documentType = 1,
    phoneCode = "966",
    phoneNo = "500000000",
    maritalStatus = "0",
)
```

## Connect in an Activity

Connect after the user signs in, and enable a Sanar entry point only after `connect` has succeeded. Adapt the names and the location to the app and follow its style. This Activity connects as soon as it opens, to keep the code short; in the app, call `connect` where the user signs in. `currentUser()` stands for the app's own signed-in user:

```kotlin
package com.example.demo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity(), SanarHost { // use the app's own base class
    // Created on first use, on the main thread, after super.onCreate has run.
    override val sanar: SanarSession by lazy { SanarSession(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val openSanar = Button(this).apply {
            text = "Sanar Services"
            isEnabled = false // Enabled after connect succeeds.
            setOnClickListener { sanar.kit.gotoDashboardView() } // read sanar.kit now, not earlier
        }
        setContentView(openSanar)

        sanar.addConnectionListener { connected -> openSanar.isEnabled = connected }
        sanar.connect(sanarUserInfo(currentUser())) { connected ->
            // A failed connect does not change isConnected, so report it here.
            if (!connected) openSanar.text = "Sanar is not available. Try again later."
        }
    }

    // Call this where the app signs the user out.
    private fun onSignedOut() {
        sanar.disconnect()
    }
}
```

`SanarHost` is the interface from "Fragments and Compose" and can be left out when the app has no Fragments (then write `private val sanar by lazy { SanarSession(this) }`). The Activity needs no cleanup in `onDestroy`: the session goes with it. After a rotation the new Activity connects again. The listener is not removed because it belongs to this Activity's own session.

## Disconnect

```kotlin
fun disconnect()
```

```kotlin
sanarKit.disconnect()
```

`disconnect` ends the member's session on the instance. After it, every `goto*` method shows "Sanar Not Connected" until `connect` is called again. The README recommends calling it when the app is about to be suspended, when the user signs out, or when they leave the part of the app that needs a connection. The session above does it on sign-out and before it connects another member. In 2.1.1 `disconnect` only clears the session that the instance holds on the device and makes no request to Sanar. Whether the member's session on Sanar's side ends, or expires on its own, is **to confirm**.

## What the screens do without a session

If a `goto*` method is called before `connect` has succeeded, or after `disconnect`, the SDK shows a "Sanar Not Connected" toast and opens nothing. This comes from the compiled 2.1.1 library, and the README does not mention it. Connect first, wait for `onSuccess`, and open a screen only then.

## Verify

- `local.properties` is ignored and untracked (the three checks above, with the path as it is from where you run them), `local.properties.example` holds only placeholders, and `git diff` and `git status` show no client ID in any tracked or untracked file you added except the git-ignored one.
- The app builds with the placeholders in place (`./gradlew assembleDebug`). The generated `BuildConfig` has the two fields. Check without printing the value: `grep -c "SANAR_CLIENT_ID" app/build/generated/source/buildConfig/debug/<package path>/BuildConfig.java` prints only a count.
- The app starts with the placeholders in place. The session reports false, `connect` is never called, and no Sanar screen opens. This proves the wiring, not the credentials.
- With a real client ID for the right environment, `onSuccess` runs and the entry point is enabled. Only the developer can check this. If you cannot, say that you did not verify it.
- If `connect` fails, read `android-troubleshooting.md`. Do not print `userInfo`, the client ID or the success line of the Logcat output while you debug.
