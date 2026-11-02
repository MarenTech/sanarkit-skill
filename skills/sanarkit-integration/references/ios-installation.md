# iOS installation

Add the SanarKit Swift Package to an iOS app, add the camera and microphone usage strings, and check the minimum iOS version. This file covers: checks before you install, the minimum iOS version (to confirm), adding the package, the permission strings and how to verify.

This is the native iOS SDK, a separate product from the React Native SDK. Everything here follows the SanarKit README dated 2025-09-02 (newest tag in the repository at the time: 2.1.1), reviewed against the shipped `SanarKit.xcframework`. If the installed package disagrees with this file, trust the installed package and tell the developer.

## Check these before you install

1. **App folder and project type.** Find the `.xcodeproj`, the `.xcworkspace` or the `Package.swift` of the app. If several apps or targets match, list them and ask which one to integrate. Run every command below from the app's folder. Also look for a `project.yml` (XcodeGen) or a `Project.swift` (Tuist): then the `.xcodeproj` is generated and you edit that file instead.
2. **Is SanarKit already there?**

   ```sh
   grep -rl "MarenTech/SanarKit" --include=Package.resolved --include=Package.swift --include=project.pbxproj .
   find . \( -name "SanarKit.xcframework" -o -name "SanarKit.framework" \) -not -path "*/DerivedData/*" -not -path "*/.build/*" -not -path "*/Pods/*"
   ```

   If it is already a Swift Package, compare its version with 2.1.1 and follow the older-version rule in `SKILL.md`. If a `SanarKit.framework` or `SanarKit.xcframework` is embedded by hand, **report it and ask before you add the package**. Two copies of the framework conflict.
3. **Deployment target.** Read it, because it decides the next section and which navigation API you can use:

   ```sh
   xcodebuild -project <App>.xcodeproj -scheme <Scheme> -showBuildSettings | grep IPHONEOS_DEPLOYMENT_TARGET
   ```

   Use `-workspace <App>.xcworkspace` instead of `-project` for a workspace. `xcodebuild -list` shows the schemes. The value can differ per target and per configuration: read the app target's.
4. **Xcode.** Run `xcodebuild -version`. The package's `Package.swift` declares `swift-tools-version: 5.10`, so Xcode has to include Swift 5.10 or later. The shipped framework was built with Xcode 16.4 (Swift 6.1.2). The minimum Xcode version is **to confirm**. If Xcode is older than 16.4 or cannot import the framework, tell the developer and ask the Sanar team which versions they support.
5. **A client ID** from the Sanar team, to connect a member. You do not need it to install.

## Minimum iOS version (to confirm)

Two facts disagree, and the Sanar team has not settled which one is the real minimum:

- `Package.swift` declares iOS 15 (`.iOS(.v15)`). This is what Xcode checks when you add the package.
- The shipped `SanarKit.xcframework` is built for iOS 17.5. Both slices (iOS devices, arm64; iOS Simulator, arm64 and x86_64) have a minimum OS version of 17.5.

How the framework behaves on iOS 15 to 17.4 has not been verified. Treat iOS 17.5 as the safe minimum.

**Ask before changing the deployment target.** It changes which devices can install the app, so it is the developer's decision, not yours. Read the target (check 3 above), tell the developer which case applies, and ask:

| App's deployment target | What happens | What to do |
| --- | --- | --- |
| 17.5 or higher | Nothing to change | Go on |
| 15.0 to 17.4 | The package links. The linker warns that SanarKit "was built for newer version 17.5", with your target in the first half of the message. Behavior on this range is unverified | Do not change the target. Tell the developer about the warning. Ask whether to keep the target and accept the warning, or raise it to 17.5. Say that shipping below 17.5 is to confirm with the Sanar team. Do not hide the warning |
| Below 15.0 | Xcode refuses to link the package product, because the package declares iOS 15 | Ask before raising it. Say that 15.0 is only what the package declares and that 17.5 is the safe minimum |

Leave the target alone if the developer says no, and report the warning. The target also decides the SwiftUI navigation API in the view references: iOS 16 and later can use `NavigationStack`. Below 16 use the `NavigationView` variant instead of raising the target.

## Add the package

The package address is:

```text
https://github.com/MarenTech/SanarKit
```

The package product is `SanarKit` and the module name is `SanarKit`. Pick the case that matches the project.

### An Xcode project (`.xcodeproj` or `.xcworkspace`)

Xcode has no command-line tool that adds a package dependency to an `.xcodeproj`. Default to asking the developer to do these steps in Xcode, and wait:

1. Select the project in the Project navigator, open the **Package Dependencies** tab, and click **+** (or choose **File > Add Package Dependencies...**).
2. Paste the package address into the search field, select the **SanarKit** package, and click **Add Package**. Keep the dependency rule Xcode proposes (**Up to Next Major Version** from the newest tag). Do not copy a version from a screenshot.
3. Under **Add to Target**, choose the app target and click **Add Package** again.
4. Check that **SanarKit** appears in the **Package Dependencies** list, and under the app target's **General** tab in **Frameworks, Libraries, and Embedded Content**.

If the project is generated (XcodeGen or Tuist), add the package address and the `SanarKit` product to the app target in that tool's own file, in its own syntax, and regenerate with the command the developer normally uses. Look at how the file declares its other packages and follow that.

Do not hand-edit `project.pbxproj` to add the package unless the developer asks you to. It is easy to corrupt, and a wrong edit can make Xcode refuse to open the project.

Then resolve and check:

```sh
xcodebuild -resolvePackageDependencies -project <App>.xcodeproj
```

(`-workspace <App>.xcworkspace -scheme <Scheme>` for a workspace.) The output must list `SanarKit: https://github.com/MarenTech/SanarKit @ <version>`. The version is also recorded in `Package.resolved`, inside the `.xcodeproj` or `.xcworkspace` (under `project.xcworkspace/xcshareddata/swiftpm/`).

### An app built from a `Package.swift`

Add the dependency and the product. Check the newest tag first (`git ls-remote --tags https://github.com/MarenTech/SanarKit`) and use it instead of 2.1.1 if there is a newer one:

```swift
// In the app package's Package.swift
dependencies: [
    .package(url: "https://github.com/MarenTech/SanarKit", from: "2.1.1"),
],
targets: [
    .target(
        name: "<AppTarget>",
        dependencies: [.product(name: "SanarKit", package: "SanarKit")]
    ),
]
```

This resolves and builds against the repository (checked with the 2.1.1 tag). SanarKit's own `Package.swift` declares iOS 15. Leave the app package's `platforms` as the developer has it. If the build complains about the platform, that is a deployment-target change: follow the rule above and ask.

Resolve with `xcodebuild -resolvePackageDependencies -scheme <Scheme>` from the package folder.

## Add the permission strings

SanarKit's flows can use the camera and the microphone. iOS only lets an app use them if the app explains why. Add both keys with wording that suits the app:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access lets you take part in video consultations.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access lets you take part in video consultations.</string>
```

These are the only two keys the SanarKit README lists. In Xcode's **Info** tab they show as *Privacy - Camera Usage Description* and *Privacy - Microphone Usage Description*.

- **Merge, do not duplicate.** Read the app's `Info.plist` first. If a key exists, leave it alone and ask before you replace its text: the app may already use the camera for something else.
- **Wording is the app's.** The text is shown to the member in the permission prompt. Ask the developer for their wording and language. If they have none, use the text above.
- **Find where the keys live.** If the app target has an `Info.plist` file (`INFOPLIST_FILE` in its build settings), add the keys there. If it has none and `GENERATE_INFOPLIST_FILE = YES`, Xcode generates the plist, and the same two strings go in the target's build settings as `INFOPLIST_KEY_NSCameraUsageDescription` and `INFOPLIST_KEY_NSMicrophoneUsageDescription` (or in the target's **Info** tab). This is how Xcode generates plists, not something from the Sanar docs: confirm the strings in the built app after the build.
- **Rebuild.** iOS asks the member the first time a flow uses the camera or microphone. If a key is missing, iOS ends the app at that moment.

## Import the framework

In any Swift file that uses SanarKit:

```swift
import SanarKit
```

The module name is `SanarKit`, with a capital K and a lowercase `import`. Swift is case-sensitive.

## Verify

- `xcodebuild -resolvePackageDependencies` lists SanarKit (see above).
- The app builds with the import in place. Use the app's own scheme and the iOS Simulator, which the framework supports:

  ```sh
  xcodebuild -project <App>.xcodeproj -scheme <Scheme> -destination 'generic/platform=iOS Simulator' build
  ```

  If this fails only after your change, read `ios-troubleshooting.md` before you change anything else.
- A linker warning about "built for newer version 17.5" is expected below a 17.5 target. It is not an integration error. Report it.
- `git diff` shows only what the integration needs: the package reference (`project.pbxproj` or `Package.swift`, plus `Package.resolved`) and the permission strings.
- If you could not run `xcodebuild` (no Xcode, no simulator runtime), say exactly what you could not verify.
