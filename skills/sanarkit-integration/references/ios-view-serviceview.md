# ServiceView

Opens the Sanar booking flow inside the app. The SDK handles the whole booking process with its own screens, so the app builds no booking screens. Kept for backward compatibility: `DashboardView` is recommended for new integrations.

## Use when

- The developer wants a button that goes straight to Sanar booking, with no screens to build.
- The app already ships `ServiceView` and should keep it.
- For a new integration, or when the developer wants everything Sanar offers in one place, use `DashboardView` instead.

## Prerequisites

- The Swift Package and the camera and microphone strings are in the app (`ios-installation.md`).
- `SKManager.setEnvironment` was called and `SKManager.connect` has finished without throwing (`ios-connect.md`). Keep the entry point disabled until then, for example with `session.isConnected`. What the view shows without a session is **to confirm**.
- The view is shown from a navigation container. Pick the example below by the app's **deployment target** (read it as `ios-installation.md` says): iOS 16 or later can use `NavigationStack`, iOS 15 uses `NavigationView`. If the app already has a navigation container, keep its type. **Do not raise the deployment target for this.** The minimum iOS version SanarKit supports is itself to confirm.

`ServiceView` is a SwiftUI view. The app shows it from one of its own screens with a `Bool` binding, and the SDK supplies the screens from there.

## Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `isNavigationActive` | `Binding<Bool>` | Yes | none | Binding that controls navigation to `ServiceView`. Keep a `Bool` in `@State`, set it to `true` to open the booking flow, and pass `$flag` here |

The binding is the only parameter: `init(isNavigationActive: Binding<Bool>)`.

## Add it to the app

Do not create a new screen unless the developer asks. Put the entry point on the screen they named, follow the app's own naming and button styles, and keep the change small. The examples write `SanarKit.ServiceView` so the name cannot clash with a view of the same name in the app. `SanarSession` is the object from `ios-connect.md`; use the app's own connected flag if it has one.

### SwiftUI with `NavigationStack` (iOS 16 and later)

Keep a `Bool` in state. Set it to `true` when the member taps the entry point, and pass the binding to `ServiceView` as the destination:

```swift
import SwiftUI
import SanarKit

struct BookServiceView: View {
    @EnvironmentObject private var session: SanarSession
    @State private var isService = false

    var body: some View {
        NavigationStack {
            Button {
                isService = true
            } label: {
                Text("Book Service")
            }
            .disabled(!session.isConnected)
            .navigationDestination(isPresented: $isService) {
                SanarKit.ServiceView(isNavigationActive: $isService)
            }
        }
    }
}
```

`NavigationStack` and `navigationDestination(isPresented:)` need an iOS 16 deployment target. Without the target, the build fails with "'NavigationStack' is only available in iOS 16.0 or newer".

### SwiftUI with `NavigationView` (iOS 15 deployment target)

Below iOS 16, use `NavigationView` and `NavigationLink(destination:isActive:)`. The link is deprecated from iOS 16. This variant is type-checked against the framework at an iOS 15 target, and has not been run on an iOS 15 device:

```swift
import SwiftUI
import SanarKit

struct BookServiceView: View {
    @EnvironmentObject private var session: SanarSession
    @State private var isService = false

    var body: some View {
        NavigationView {
            NavigationLink(
                destination: SanarKit.ServiceView(isNavigationActive: $isService),
                isActive: $isService
            ) {
                Text("Book Service")
            }
            .disabled(!session.isConnected)
        }
        .navigationViewStyle(.stack)
    }
}
```

### The screen is already inside a navigation container

Most apps already have a `NavigationStack` or `NavigationView`. **Do not add a second one**: a nested container can show two navigation bars or break the back navigation. Add only the `Bool` and the destination to the screen that is already inside it. **Choose by the container type the app already uses**, not only by the deployment target: an app on iOS 17 that still uses `NavigationView` keeps `NavigationView` and `NavigationLink`, because `navigationDestination(isPresented:)` only works inside a `NavigationStack`:

```swift
// The app uses NavigationStack (needs an iOS 16 deployment target): on the entry point's view
.navigationDestination(isPresented: $isService) {
    SanarKit.ServiceView(isNavigationActive: $isService)
}

// The app uses NavigationView (the only choice on an iOS 15 target): in place of the entry point
NavigationLink(
    destination: SanarKit.ServiceView(isNavigationActive: $isService),
    isActive: $isService
) {
    Text("Book Service") // the entry point's own label
}
```

For a tab bar, put the entry point on a tab's screen and give that tab a navigation container (its existing one, or wrap its root screen in one). Whether the view covers the tab bar is **to confirm**: check it on the simulator and tell the developer.

### From UIKit

If the app is built with UIKit, host the SwiftUI view in a `UIHostingController` and push it onto the navigation controller. The binding is a plain SwiftUI `Binding`. It pops the screen if the view ever sets it to `false`, and it does nothing when the member goes back with the back button.

```swift
import SwiftUI
import UIKit
import SanarKit

final class BookServiceViewController: UIViewController {
    private weak var sanarHost: UIViewController?

    @objc private func openSanar() {
        let isActive = Binding<Bool>(
            get: { [weak self] in self?.sanarHost != nil },
            set: { [weak self] newValue in
                guard !newValue, let host = self?.sanarHost else { return }
                if self?.navigationController?.topViewController === host {
                    self?.navigationController?.popViewController(animated: true)
                }
            }
        )

        let host = UIHostingController(rootView: SanarKit.ServiceView(isNavigationActive: isActive))
        sanarHost = host
        navigationController?.pushViewController(host, animated: true)
    }
}
```

Call `openSanar()` from the app's own button after `connect` has succeeded. This code type-checks against the framework, but the README and the developer docs show a UIKit example for `DashboardView` only, so how `ServiceView` behaves inside a UIKit navigation controller (whether it shows its own navigation bar, whether it ever sets the binding to `false`) is **to confirm**. Tell the developer, and **ask the Sanar team before you ship a UIKit integration**.

## Verify

- The app builds for the iOS Simulator with the app's scheme (`xcodebuild ... -destination 'generic/platform=iOS Simulator' build`). A wrong navigation API for the deployment target shows up here.
- With the client ID still the placeholder, `connect` is never called, the entry point stays disabled, and the app does not crash. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID for the environment, tapping the entry point opens the Sanar booking flow, and going back returns to the app's screen. The flag is `false` again, so the next tap opens it again.
- If you cannot run the app or connect (no simulator, no real client ID), say that you could not verify the flow itself.
