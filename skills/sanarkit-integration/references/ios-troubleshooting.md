# iOS troubleshooting

Fixes for the problems you meet when you install, build or connect the SanarKit Swift Package in an iOS app (README dated 2025-09-02, newest tag 2.1.1). Find the symptom, try the fix, and report what you changed. When you search the build log, search for the exact text.

Before you change anything that is not part of the integration (the deployment target, Xcode build settings, other dependencies), tell the developer and ask.

Several entries below are compile errors you get when you copy code from the SanarKit README. Where the README and the shipped `SanarKit.xcframework` disagree, these references follow the framework. If your own code came from the README, compare it with the entries under "Compile errors from the README examples".

## Add the package

### Xcode cannot resolve the package

Xcode shows a resolution error, or the package stays in a loading state.

1. Check the address: `https://github.com/MarenTech/SanarKit`.
2. Check that the machine can reach github.com. A proxy or a firewall is the usual cause.
3. Reset and resolve again. In Xcode: **File > Packages > Reset Package Caches**, then **File > Packages > Resolve Package Versions**. From the command line: `xcodebuild -resolvePackageDependencies -project <App>.xcodeproj` (or `-workspace <App>.xcworkspace -scheme <Scheme>`).
4. Build again.

### Xcode says the package requires a higher minimum platform version

`Package.swift` declares iOS 15 as the minimum platform. If the app target's deployment target is lower, Xcode refuses to link the package product. **Ask before you raise the deployment target.** 15.0 is the least the package declares. The framework itself is built for iOS 17.5, see the next entry.

### The linker warns that SanarKit was built for a newer iOS version

The build log shows a warning such as `building for iOS-simulator-15.0, but linking with dylib '@rpath/SanarKit.framework/SanarKit' which was built for newer version 17.5`. The first part names the app's deployment target, so it differs for you.

`SanarKit.xcframework` is built for iOS 17.5, although `Package.swift` declares iOS 15. Raising the deployment target to 17.5 removes the warning. How the framework behaves on iOS 15 to 17.4 has not been verified, and the real minimum is **to confirm** with the Sanar team. This is not an integration error. Do not change the target and do not hide the warning: report it and ask, as `ios-installation.md` describes.

### Xcode says the package needs a newer Swift tools version

`Package.swift` declares `swift-tools-version: 5.10`. An Xcode that includes an older Swift cannot read the manifest. The developer has to update Xcode. Which Xcode versions Sanar supports is **to confirm** (the framework was built with Xcode 16.4).

### No such module 'SanarKit'

The build cannot find the framework.

- Check that **SanarKit** is listed in the app target's **General** tab, under **Frameworks, Libraries, and Embedded Content**. If it is not, the package was added to the project but not to the target. Add the package product to the target.
- Check the spelling. The module is `SanarKit`, with a capital K, and the keyword is a lowercase `import`. The README prints `Import SanarKit`, which does not compile.
- Clean the build folder (**Product > Clean Build Folder**) and build again.
- If the project has a workspace, build the workspace scheme and not the project's.

### SanarKit is in the project twice

If the app already embeds a `SanarKit.framework` or `SanarKit.xcframework` by hand and the package was added too, two copies of the framework are in the app. Report it and ask which one to keep before you remove either.

## Build

### 'NavigationStack' is only available in iOS 16.0 or newer

The code uses `NavigationStack` and `navigationDestination(isPresented:)`, which need an iOS 16 deployment target. Do not raise the deployment target for this. Use `NavigationView` with `NavigationLink(destination:isActive:)` instead. Every view reference has this variant.

## Compile errors from the README examples

### Incorrect argument label in call, for clientData

The README calls `SKManager.connect(cid:bundleId:clientData:lang:)`. The framework declares the third label as `clientInfo`:

```swift
_ = try await SKManager.connect(cid: clientID, bundleId: bundleID, clientInfo: clientInfo)
```

Change `clientData:` to `clientInfo:`. The call also needs `try await`, see the next entry. Another README example uses `requestBody:`, which the framework does not have either. Xcode reports it as an extra argument together with a missing argument for `clientInfo`.

### Call can throw, but it is not marked with 'try'

`SKManager.connect` is `async` and it throws. A call without `try await`, or one made from code that is not asynchronous, fails with this error, or with "'async' call in a function that does not support concurrency" or "expression is 'async' but is not marked with 'await'". Call it from a `Task` or a `.task` modifier, and handle the error:

```swift
Task {
    do {
        _ = try await SKManager.connect(cid: clientID, bundleId: bundleID, clientInfo: clientInfo)
    } catch {
        // Do not log clientInfo. It holds personal data.
        print("Could not connect: \(error.localizedDescription)")
    }
}
```

### Missing argument for parameter 'isNavigationActive' in call

The README's `ConsultationView` example passes only `consultationData`. The framework's initializer also takes `isNavigationActive`, as the first parameter. Pass both. `ios-view-consultationview.md` has working code.

### Cannot find 'isBooking' in scope

The README's `DashboardView` example declares `isSKDashboard`, but its button sets `isBooking`. Set `isSKDashboard`, as `ios-view-dashboardview.md` does.

## Connect and session

### connect throws an error

Check these, in order:

1. `SKManager.setEnvironment` ran before `connect`, and the client ID is the one for that environment. Each environment has its own client ID. Do not read the client ID back into the chat to check it.
2. The client ID is not still the placeholder from the config file.
3. `bundleId` is the app's real bundle identifier. `Bundle.main.bundleIdentifier` returns it.
4. The device or simulator has network access.
5. `clientInfo` has every key from `ios-connect.md`, with the formats listed there (`dob` as `yyyy-mm-dd`, `document_type` as an `Int`, the others as strings).

Print `error.localizedDescription` while you debug. Never print `clientInfo` or the client ID. Which errors `connect` throws, and what each one means, is **to confirm**: the README does not list them. If everything above is right, ask the Sanar team, and give them the error text, the bundle identifier and the environment.

### The client ID is nil, or looks cut short

If the client ID is kept in `Sanar.xcconfig`, as `ios-connect.md` describes, check these. Do not print the value:

- **First check what reached the app.** A placeholder makes `SanarConfig.clientID` `nil` even when the key is in the built `Info.plist`, so a `nil` client ID alone does not say where the problem is. Read the built app's `Info.plist` as `ios-connect.md` describes under "Verify": the environment (`PlistBuddy -c "Print :SANAR_ENVIRONMENT"`) must print `development` or `production`, and the client ID key must be present. Never print the client ID key itself.
- **It is nil.** `Bundle.main.object(forInfoDictionaryKey: "SANAR_CLIENT_ID")` returns `nil` when `Info.plist` has no `SANAR_CLIENT_ID` key, or when `Sanar.xcconfig` is not applied to the build configuration being run. Check the target's **Info** tab, under **Configurations**. If a configuration already uses another config file, `Sanar.xcconfig` has to be included from it with `#include? "Sanar.xcconfig"`, because choosing it there would replace the existing file. If that file is the one CocoaPods generates under `Pods/`, the include is lost every time `pod install` runs: use an app-owned xcconfig that includes both, as `ios-connect.md` describes. Never edit anything under `Pods/`.
- **The key is in the project but the value is empty.** The app's Info.plist is generated (`GENERATE_INFOPLIST_FILE = YES`) and has no file, so custom keys may not have been carried into the built app. Ask before you add an `Info.plist` file.
- **It is the placeholder.** The config file still holds `<CLIENT_ID from config>`. `SanarConfig` treats a value that starts with `<` as missing. The developer has to fill in the real value. Check with `grep -c "CLIENT_ID from config" <path>/Sanar.xcconfig`, which prints only a count.
- **It is cut short.** An `.xcconfig` file reads two slashes in a row as the start of a comment. If the client ID contains two slashes, write each pair as slash, `$()`, slash. `$()` expands to nothing, so the app gets the original value.
- **A CI build or a fresh clone has empty keys.** `Sanar.xcconfig` is git-ignored, so a machine that cloned the repository does not have it. The optional include and the config setting are then empty, the build still succeeds, and the app never calls `connect`. CI must write the file from its secret store before it builds (without echoing the values into the build log), and a developer on a fresh clone copies `Sanar.xcconfig.example` and fills it in.
- **The environment does not match.** The Release configuration has to override `SANAR_ENVIRONMENT` and `SANAR_CLIENT_ID` with the production values, as in the config file in `ios-connect.md`. A configuration with another name (Staging, Beta) needs its own lines.

### After a user switch or a sign-out, the earlier member is still connected

Call `SKManager.disconnect()` before you connect another member. A `connect` that is still running when the user signs out or another member signs in can also finish late and leave the earlier member connected. The session object in `ios-connect.md` handles both: each sign-in or sign-out cancels the earlier work and waits for it, and a `connect` that returns after it was cancelled closes the session it opened. If the app has its own session code, check that it does the same. Whether `connect` can be called again without `disconnect` is **to confirm**.

### A Sanar view is blank, or closes straight away

What a Sanar view does when the session is missing or has expired is **to confirm**. Check that `connect` finished without an error, and that `SKManager.disconnect()` was not called since. If the view still does not open, ask the Sanar team.

## Permissions

### The app closes when a flow uses the camera or microphone

The Xcode console reports that the app attempted to access privacy-sensitive data without a usage description. iOS ends an app that uses the camera or the microphone without the matching key. Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` and rebuild, as `ios-installation.md` describes. If the target's Info.plist is generated, check that the strings reached the built app.

### The permission prompt does not appear again

iOS asks for each permission once. If the member denied it, the app has to send them to **Settings** > the app, where they can turn the camera or the microphone on. To see the prompt again on a test device, delete the app and install it again. The iOS Simulator has no camera, so try the flows that use the camera on a device.

## Show a view

### Setting the binding to true shows nothing

- Put `navigationDestination(isPresented:)` inside a `NavigationStack`, and `NavigationLink(destination:isActive:)` inside a `NavigationView`. A destination outside a navigation container does nothing.
- Pass the same `@State` binding to the destination and to the view, as the examples do: for example `$isSKDashboard` in both places.
- Connect first (`ios-connect.md`).
- Check that another `NavigationLink` or `navigationDestination` on the same screen does not use the same binding.

### The app crashes with "No ObservableObject of type SanarSession found"

The full message is `Fatal error: No ObservableObject of type SanarSession found. A View.environmentObject(_:) for SanarSession may be missing as an ancestor of this view.` A view reads `@EnvironmentObject private var session: SanarSession`, but nothing above it supplied the object. This happens in views shown in a **sheet, a popover, a full-screen cover or a `UIHostingController`**: they start a new view hierarchy and do not inherit the environment of the screen that presented them. Pass the object again where the new hierarchy starts, for example `.sheet(...) { Content().environmentObject(session) }`, or `UIHostingController(rootView: Content().environmentObject(session))`. Only the app's own views that read the session need it.

### Two navigation bars

The view was placed in a new `NavigationStack` or `NavigationView` inside a screen that was already in one. Remove the new container and attach only the destination to the screen that is already inside the app's container.

## Still stuck?

Ask the Sanar team. Say which SanarKit version the app uses (the tag in `Package.resolved`), which Xcode and iOS version the app builds for, and the exact error text. Never send the client ID in a message that others can read.
