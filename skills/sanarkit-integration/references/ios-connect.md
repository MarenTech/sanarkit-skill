# iOS: environment and connect

Choose the SanarKit environment, keep the client ID out of the source, connect the signed-in member with `SKManager.connect`, and end the session with `SKManager.disconnect`. Every Sanar view needs this session.

All the code below is Swift and was type-checked against the shipped `SanarKit.xcframework` (as Swift 5 and as Swift 6 code, at iOS 15 and 17.5 targets). It was not run against a Sanar environment.

## Ask first

Ask the developer these questions. Do not guess the answers.

1. **Where does the client ID live?** Use the app's existing secret or environment mechanism if it has one (a git-ignored `.xcconfig`, a build variable on the CI, a secrets file). If it has none, create the config file below.
2. **How does the app tell its environments apart?** The default below uses the Debug configuration for `development` and the Release configuration for `production`. If the app has other configurations (Staging, Beta), each one needs its own client ID and environment: ask.
3. **How do the signed-in user's fields map to the SDK's member fields?** See "Member details".
4. **Where does the app know that a user has signed in or out?** The session below connects and disconnects there (`signIn` and `signOut`).

Never ask the developer to paste the client ID into the chat. If they paste it anyway, write it only into the git-ignored config file, and never repeat it in your output.

## Keep the client ID out of the source

The client ID is a per-client secret, and each environment has its own client ID. Never hardcode it in a source file that Git tracks. Never print it, log it, or read it back into the chat. Never print the contents of the config file. The client ID still ships inside the built app, because the SDK sends it from the device. Keeping it out of Git protects the repository, and does not hide it from someone who inspects the app.

### If the app already has a way to keep secrets

Use it. Make the value reach `Info.plist` through a build variable (the pattern below), or read it from wherever the app keeps its other secrets. Do not add a library for this without asking. Check that the file is ignored and untracked, with the commands below.

### If the app has none: a git-ignored `Sanar.xcconfig`

1. Create `Sanar.xcconfig` next to the app target's other config files, or in the app folder, and note its **real path** as it is from the folder where you run the commands below (for example `MyApp/Config/Sanar.xcconfig`). The next steps write it as `<path>/Sanar.xcconfig`. The values are placeholders that the developer fills in:

   ```text
   // Do not commit this file. It is listed in .gitignore.
   // One client ID per environment, from the Sanar team. Fill both in locally.
   SANAR_ENVIRONMENT = development
   SANAR_CLIENT_ID = <CLIENT_ID from config>

   SANAR_ENVIRONMENT[config=Release] = production
   SANAR_CLIENT_ID[config=Release] = <CLIENT_ID from config>
   ```

   The `[config=Release]` lines override the first two in the Release configuration, so a build never pairs a production client ID with the development environment or the reverse. If the Release configuration has another name, use that name.

2. Create `<path>/Sanar.xcconfig.example` with the same content. This one **is** committed, so a fresh clone knows what to create (`cp Sanar.xcconfig.example Sanar.xcconfig`, in that folder).

3. Add the real file to `.gitignore`, at the root of the repository or of the app (check which `.gitignore` files exist). A name without a slash matches in any folder:

   ```text
   # SanarKit client IDs (a secret)
   Sanar.xcconfig
   ```

4. **Check the file with its real path.** The config file usually sits in a subfolder, and the Git root can be a folder above the project. A bare `Sanar.xcconfig` is relative to the folder you run the command in, so it names a different file (or none), and the tracked check prints `not tracked` for it even when the real file is tracked. Run these with `<path>` replaced by the real path:

   ```sh
   test -f <path>/Sanar.xcconfig || echo "MISSING: create it first (step 1)"
   git check-ignore -v <path>/Sanar.xcconfig || echo "NOT IGNORED: add it to .gitignore"
   git ls-files --error-unmatch -- <path>/Sanar.xcconfig 2>/dev/null && echo "TRACKED: stop and tell the developer" || echo "not tracked"
   ```

   `test -f` prints `MISSING` only if the file is absent (it is silent when the file exists); the two `git` commands print on every outcome, so an empty result from them cannot pass by accident. You want: no `MISSING`, a `.gitignore` rule printed by `git check-ignore`, and `not tracked`. `not tracked` only counts once `test -f` has confirmed that the path is real, because a wrong path makes `git ls-files --error-unmatch` fail in the same way. `MISSING` means the path is wrong or the file does not exist yet: fix that and run the checks again. `NOT IGNORED` means you must fix the `.gitignore` rule and check again. `TRACKED` means the file is already in Git (Git then also reports `NOT IGNORED`, because it does not apply ignore rules to tracked files): stop and tell the developer, and do not rewrite Git history or untrack files without asking. Also check the example file: `git check-ignore -v <path>/Sanar.xcconfig.example || echo "not ignored"` must print `not ignored`.

5. Make the build use it. Setting a configuration file for a build configuration is a change to the project file, so **ask the developer to do it in Xcode** (the project's **Info** tab, under **Configurations**: choose `Sanar.xcconfig` for each configuration of the app target), or ask permission to edit the project file. The file has to be added to the Xcode project first, or it does not appear in that list. For a generated project (XcodeGen or Tuist), set it in that tool's file instead.

   **If a configuration already has a config file, do not replace it**: choosing `Sanar.xcconfig` there would drop the existing settings. What to do depends on who owns that file:

   - **The app's own `.xcconfig`:** add this line to it, with a path relative to it:

     ```text
     #include? "Sanar.xcconfig"
     ```

     The question mark makes the include optional, so a fresh clone without `Sanar.xcconfig` still builds (checked with `xcodebuild -showBuildSettings`; a missing optional file is ignored).
   - **CocoaPods' generated file** (`Pods-<App>.debug.xcconfig` and `Pods-<App>.release.xcconfig`, under `Pods/Target Support Files/`): **never edit anything under `Pods/`.** `pod install` writes those files again, the include disappears, and `SanarConfig.clientID` becomes `nil` without any error. Instead create an app-owned `.xcconfig` for each configuration (for example `App.Debug.xcconfig`) that includes both files, and make it the configuration's base configuration:

     ```text
     #include "Pods/Target Support Files/Pods-<App>/Pods-<App>.debug.xcconfig"
     #include? "Sanar.xcconfig"
     ```

     Use the Pods path that CocoaPods prints in its own warning, relative to the file you create. The developer makes the new file the base configuration in Xcode, or you ask before you edit the project file.

6. Expose the values to the app in `Info.plist`:

   ```xml
   <key>SANAR_CLIENT_ID</key>
   <string>$(SANAR_CLIENT_ID)</string>
   <key>SANAR_ENVIRONMENT</key>
   <string>$(SANAR_ENVIRONMENT)</string>
   ```

   These are custom keys. If the app target has an `Info.plist` file (`INFOPLIST_FILE`), add them there. If its Info.plist is generated (`GENERATE_INFOPLIST_FILE = YES`, no file), the `INFOPLIST_KEY_` build settings are meant for Apple's own keys and may not carry custom ones, so the target probably needs an `Info.plist` file with these keys, which Xcode merges with the generated values. Ask before you add one. This is general Xcode behavior, not from the Sanar docs: confirm it with the check of the built app's `Info.plist` under "Verify" (both keys must be there). A placeholder makes `SanarConfig.clientID` `nil` whether or not the key arrived, so do not use that to check.

7. Read them at run time:

   ```swift
   import Foundation

   enum SanarConfig {
       /// The client ID for the current build configuration, from Info.plist (filled in from Sanar.xcconfig).
       static var clientID: String? { value(for: "SANAR_CLIENT_ID") }

       /// "development" or "production", set next to the client ID so the two always match.
       static var environment: String? { value(for: "SANAR_ENVIRONMENT") }

       private static func value(for key: String) -> String? {
           guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
                 !value.isEmpty, !value.hasPrefix("<") else { return nil }
           return value
       }
   }
   ```

   The `hasPrefix("<")` check treats the unfilled placeholder as missing.

An `.xcconfig` file reads two slashes in a row as the start of a comment. If the client ID contains two slashes in a row, everything after them is cut off: write each pair as slash, `$()`, slash, because `$()` expands to nothing. Tell the developer to check this if `clientID` comes out short.

Tell the developer to replace both placeholders. To check that they are still unfilled without printing the file, use `grep -c "CLIENT_ID from config" <path>/Sanar.xcconfig`, which prints only a count. Leave the placeholders until the developer fills them in. The app builds with them, but `connect` is never called, `isConnected` stays false, and no Sanar view opens. Say that in the report.

### CI and fresh clones

`Sanar.xcconfig` is not in Git, so a fresh clone and a CI machine do not have it. The `#include?` and the config-file setting are optional or empty without it, so **the build still succeeds and ships with empty keys**: the app then never calls `connect`. CI must create the file from its secret store before the build step (one value per environment, never echoed into the build log), for example by writing `<path>/Sanar.xcconfig` from two secret variables. A developer on a fresh clone copies `Sanar.xcconfig.example` and fills it in. Tell the developer about this in the report.

## Set the environment

`SKManager.setEnvironment` chooses which Sanar environment the SDK talks to. Call it once, before `connect`, for example when the app starts. If it is never called, the SDK uses `production`.

```swift
static func setEnvironment(_ env: String)
```

```swift
SKManager.setEnvironment("development") // "production" or "development"
```

| Environment | Use it for |
| --- | --- |
| `production` | The default. Live apps with real members |
| `development` | Building and debugging the integration |

- Pass the value from config (`SanarConfig.environment`), not a literal, so the environment and the client ID come from the same build configuration. Never hardcode `development` in a way that ships in release builds. Tell the developer that release builds need `production` and a production client ID.
- What `setEnvironment` does with a value other than `production` or `development` is **to confirm**.

## Connect

```swift
static func connect(cid: String, bundleId: String, clientInfo: [String: Any], lang: String = "en") async throws -> String
```

`connect` sends the member's details to Sanar and starts a session. It is `async` and it throws: call it with `try await` from asynchronous code, such as a `Task` or a `.task` modifier, and handle the error.

| Parameter | Type | Description |
| --- | --- | --- |
| `cid` | `String` | The client ID for the current environment. Always read it from config |
| `bundleId` | `String` | The bundle identifier of the app: `Bundle.main.bundleIdentifier` |
| `clientInfo` | `[String: Any]` | The member's details. See "Member details" |
| `lang` | `String` | Optional. Switches the SDK between English (`"en"`, the default) and Arabic (`"ar"`). Other codes are **to confirm** |

### Handle both outcomes

| Outcome | What you get | What to do |
| --- | --- | --- |
| Success | The call returns a `String` | Mark the session as connected and show the Sanar entry points. What the string contains is **to confirm**, so ignore it |
| Failure | The call throws | Catch it. Show or log `error.localizedDescription`, and check the client ID, the environment, the bundle identifier and the member details. Which errors it throws is **to confirm** |

There is no separate "refused" result: any failure throws. Do not log `clientInfo`: it holds personal data.

## Member details (`clientInfo`)

`clientInfo` describes the member. Build it from the signed-in user.

| Key | Type | What to send |
| --- | --- | --- |
| `mid` | `String` | The app's own ID for the member |
| `first_name` | `String` | First name |
| `last_name` | `String` | Last name |
| `dob` | `String` | Date of birth as `yyyy-mm-dd` |
| `gender` | `String` | Gender code: `"M"` or `"F"` |
| `nationality` | `String` | Nationality, such as `"Saudi Arabia"` |
| `document_id` | `String` | The ID document number |
| `document_type` | `Int` | The type of ID document. The examples use `1`. What each value means is **to confirm** |
| `phone_code` | `String` | Country calling code without `+`, such as `"966"` |
| `phone_no` | `String` | Phone number without the country code |
| `maritalStatus` | `String` | `"0"` for unmarried, `"1"` for married |
| `ipc` | `String` | Optional. Insurance Provider Code. Which SDK version first accepts it is **to confirm** (see below) |
| `isDependent` | `Bool` | Optional. Whether the member is a dependent. The default is `false`. Which SDK version first accepts it is **to confirm** (see below) |

Rules:

- **Ask which of the app's fields go into which of these.** Never invent personal data. If the app does not hold a field, ask the developer what to send.
- Send the eleven keys above `ipc`. Which keys Sanar requires is **to confirm**. Send `ipc` and `isDependent` only if the app has the data.
- The README's table spells the key `marital_status` and its example spells it `maritalStatus`. Use `maritalStatus`. Which spelling Sanar reads is **to confirm**.
- **`document_id`.** The README says `document_id` has the default `1`, which looks like it belongs to `document_type`. Whether `document_id` has a default is **to confirm**. Always send the real number.
- **`ipc` and `isDependent`.** The README gained them on 2025-09-02, after the newest tag in the repository (2.1.1, 2025-08-25). Which SDK version first accepts them is **to confirm**, so check them against the installed version before you send them, and ask the Sanar team if the app is on an older tag.
- Do not log the member dictionary.

The shape, with **demo data** only. Do not copy these values into the app:

```swift
func demoClientInfo() -> [String: Any] {
    [
        "mid": "demo-member-001",
        "first_name": "Demo",
        "last_name": "User",
        "dob": "1990-01-01",
        "gender": "M",
        "nationality": "Saudi Arabia",
        "document_id": "1234567890",
        "document_type": 1,
        "phone_code": "966",
        "phone_no": "500000000",
        "maritalStatus": "0",
    ]
}
```

## The session object

Connect after the user signs in, and show a Sanar view only after `connect` has succeeded. Adapt the names and the location to the app and follow its state-management style (this uses an `ObservableObject`, which needs no library).

Sign-in and sign-out can overlap with a `connect` that is still running (the user signs out, or another member signs in, while the network call is in flight). A late `connect` must not mark a signed-out or replaced member as connected, and the SDK must not be asked to connect and disconnect at the same time. The session below handles that: every sign-in or sign-out cancels the earlier work and waits for it to finish, and a `connect` that returns after it was cancelled closes the session it opened and sets no state. It does not rely on `SKManager.connect` stopping when it is cancelled (whether it does is **to confirm**): it checks after the call returns.

```swift
import SwiftUI
import SanarKit

@MainActor
final class SanarSession: ObservableObject {
    @Published private(set) var isConnected = false
    @Published private(set) var errorMessage: String?

    /// The latest sign-in or sign-out work. Each new request cancels the one before it and waits for
    /// it to finish, so the SDK is never asked to connect and disconnect at the same time.
    private var worker: Task<Void, Never>?
    /// True while the SDK holds a session that this object opened.
    private var hasSession = false

    /// Call after the user signs in. Build `clientInfo` from the app's own user.
    func signIn(clientInfo: [String: Any]) {
        restart(with: clientInfo)
    }

    /// Call when the user signs out.
    func signOut() {
        restart(with: nil)
    }

    private func restart(with clientInfo: [String: Any]?) {
        isConnected = false // the Sanar entry points close at once
        errorMessage = nil
        let earlier = worker
        earlier?.cancel()
        worker = Task {
            await earlier?.value
            await apply(clientInfo)
        }
    }

    private func apply(_ clientInfo: [String: Any]?) async {
        guard !Task.isCancelled else { return }

        // The previous member, or no member: end the session first.
        if hasSession {
            SKManager.disconnect()
            hasSession = false
        }
        guard let clientInfo else { return } // signed out

        guard SanarConfig.environment != nil else {
            errorMessage = "The Sanar environment is missing from Info.plist (SANAR_ENVIRONMENT)."
            return
        }
        guard let clientID = SanarConfig.clientID else {
            errorMessage = "The Sanar client ID is missing from Info.plist, or still the placeholder."
            return
        }
        guard let bundleID = Bundle.main.bundleIdentifier else {
            errorMessage = "The app has no bundle identifier."
            return
        }

        do {
            _ = try await SKManager.connect(
                cid: clientID,
                bundleId: bundleID,
                clientInfo: clientInfo,
                lang: "en"
            )
            if Task.isCancelled {
                // The user signed out, or another member signed in, while connect was running.
                // Close the session it opened, and do not mark this member as connected.
                SKManager.disconnect()
                return
            }
            hasSession = true
            isConnected = true
        } catch {
            // Do not log clientInfo. It holds personal data.
            if !Task.isCancelled { errorMessage = error.localizedDescription }
        }
    }
}
```

The session runs one connect at a time, because each sign-in waits for the earlier work to finish, so a `connect` that never returns blocks every later sign-in and sign-out. Whether `SKManager.connect` has a timeout is **to confirm**. If the app can hit that, tell the developer, and ask before you add a timeout of your own.

Map the app's user to `clientInfo` in one place, after the developer has confirmed the mapping:

```swift
func sanarClientInfo(for user: AppUser) -> [String: Any] {
    [
        "mid": user.id, // replace every right-hand side with the app field the developer confirmed
        "first_name": user.firstName,
        "last_name": user.lastName,
        "dob": user.birthDate, // yyyy-mm-dd
        "gender": user.gender, // "M" or "F"
        "nationality": user.nationality,
        "document_id": user.nationalId,
        "document_type": user.documentType, // an Int. What each value means is to confirm: ask the developer
        "phone_code": user.phoneCode,
        "phone_no": user.phoneNumber,
        "maritalStatus": user.maritalStatus, // "0" or "1"
    ]
}
```

Set the environment when the app starts, and sign in or out when the signed-in user changes. This SwiftUI `App` uses `.task(id:)`, which runs again when the user's ID changes (it needs iOS 15 or later). `AuthModel` and `RootView` stand for the app's own auth state and first screen:

```swift
import SwiftUI
import SanarKit

@main
struct DemoApp: App {
    @StateObject private var auth = AuthModel()
    @StateObject private var session = SanarSession()

    init() {
        if let environment = SanarConfig.environment {
            SKManager.setEnvironment(environment)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(session)
                .task(id: auth.user?.id) {
                    if let user = auth.user {
                        session.signIn(clientInfo: sanarClientInfo(for: user))
                    } else {
                        session.signOut()
                    }
                }
        }
    }
}
```

If the app is UIKit with an `AppDelegate` or `SceneDelegate`, call `SKManager.setEnvironment` in `application(_:didFinishLaunchingWithOptions:)`, and call `signIn(clientInfo:)` and `signOut()` where the app learns that the user signed in or out. Keep one session object and give it to the screens that open Sanar.

Screens read the state with `@EnvironmentObject private var session: SanarSession` and use `session.isConnected`. An `@EnvironmentObject` is only there for views inside the hierarchy that received `.environmentObject(session)`. A sheet, a popover or a `UIHostingController` starts a new hierarchy, so inject it again there (`ios-troubleshooting.md` has the crash this causes).

## Disconnect

```swift
static func disconnect()
```

```swift
SKManager.disconnect()
```

`disconnect` ends the connection to Sanar. The README recommends calling it when the app is about to be suspended, when the user signs out, or when they leave the part of the app that needs a connection. The session above does it on sign-out and before it connects another member, and it closes the session of a `connect` that returns after it was replaced. Whether `connect` can be called again without `disconnect` first is **to confirm**.

## What the views do without a session

What a Sanar view shows when there is no connected session, or when the session has expired, is **to confirm**. The README does not say. Connect first, wait for `connect` to finish without an error, and open a view only then.

## Verify

- **Git.** `<path>/Sanar.xcconfig` passes the three checks in step 4 (no `MISSING`, a rule from `git check-ignore`, `not tracked`), and `git diff` and `git status` show no client ID in any tracked or untracked file you added except the git-ignored one.
- **The build.** The app builds with the placeholders in place (`xcodebuild -scheme <Scheme> -configuration Debug -destination 'generic/platform=iOS Simulator' build`).
- **The config reaches the app.** A placeholder makes `SanarConfig.clientID` `nil` whether or not the key reached the built `Info.plist`, so a `nil` client ID tells you nothing about the wiring. Read the built app's `Info.plist` instead. Find the built app, then read the **environment** (not a secret) and check that the client ID key is **present** without printing it. Use the same `-configuration` for both commands:

  ```sh
  xcodebuild -scheme <Scheme> -configuration Debug -destination 'generic/platform=iOS Simulator' -showBuildSettings | grep -E '^ +(TARGET_BUILD_DIR|WRAPPER_NAME) ='
  /usr/libexec/PlistBuddy -c "Print :SANAR_ENVIRONMENT" "<TARGET_BUILD_DIR>/<WRAPPER_NAME>/Info.plist"
  /usr/libexec/PlistBuddy -c "Print :SANAR_CLIENT_ID" "<TARGET_BUILD_DIR>/<WRAPPER_NAME>/Info.plist" > /dev/null 2>&1 && echo "SANAR_CLIENT_ID key present" || echo "SANAR_CLIENT_ID key MISSING"
  ```

  The first `PlistBuddy` call must print `development` for the Debug configuration (and `production` for a Release build, after you build with `-configuration Release`). A missing key or an empty environment means the config file is not applied to that configuration, or `Info.plist` does not carry the keys: see the troubleshooting file. Never run `Print :SANAR_CLIENT_ID` without the redirect.
- **The guard.** With the placeholders in place, the app starts, the session reports that the client ID is missing or still the placeholder, `connect` is never called, and `isConnected` stays false. This shows that the guard works. It does not show that the credentials are valid.
- **A real connect.** With a real client ID for the right environment, `connect` returns without throwing and `isConnected` becomes `true`. Only the developer can check this. If you cannot, say that you did not verify it.
- If `connect` throws, read `ios-troubleshooting.md`. Do not print `clientInfo` or the client ID while you debug.
