# DashboardView

Shows the unified Sanar dashboard inside the app: teleconsultation, home visits, appointment management and chat or calls with doctors, from one entry point. It is the recommended first view, because it gives the member one entry point to everything Sanar offers.

## Use when

- The developer wants one entry point to everything Sanar offers with the least code.
- This is the first Sanar integration in the app.
- It replaces `ServiceView`, `InstantConsultationView` and `BookingListView`, which remain for backward compatibility. Use one of those only if the developer asks for it, or if the app already ships it.

## Prerequisites

- The Swift Package and the camera and microphone strings are in the app (`ios-installation.md`).
- `SKManager.setEnvironment` was called and `SKManager.connect` has finished without throwing (`ios-connect.md`). Keep the entry point disabled until then, for example with `session.isConnected`. What the view shows without a session is **to confirm**.
- The view is shown from a navigation container. Pick the example below by the app's **deployment target** (read it as `ios-installation.md` says): iOS 16 or later can use `NavigationStack`, iOS 15 uses `NavigationView`. If the app already has a navigation container, keep its type. **Do not raise the deployment target for this.** The minimum iOS version SanarKit supports is itself to confirm.

`DashboardView` is a SwiftUI view. The app shows it from one of its own screens with a `Bool` binding, and the SDK supplies the screens from there.

## Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `isNavigationActive` | `Binding<Bool>` | Yes | none | Binding that controls navigation to `DashboardView`. Keep a `Bool` in `@State`, set it to `true` to open the dashboard, and pass `$flag` here. Whether the view sets it back to `false` itself when the member leaves is to confirm |

The binding is the only parameter: `init(isNavigationActive: Binding<Bool>)`.

## Add it to the app

Do not create a new screen unless the developer asks. Put the entry point on the screen they named (for example the home screen), follow the app's own naming and button styles, and keep the change small. The examples write `SanarKit.DashboardView` so the name cannot clash with a view of the same name in the app. `SanarSession` is the object from `ios-connect.md`; use the app's own connected flag if it has one.

### SwiftUI with `NavigationStack` (iOS 16 and later)

Keep a `Bool` in state. Set it to `true` when the member taps the entry point, and pass the binding to `DashboardView` as the destination:

```swift
import SwiftUI
import SanarKit

struct HomeView: View {
    @EnvironmentObject private var session: SanarSession
    @State private var isSKDashboard = false

    var body: some View {
        NavigationStack {
            Button {
                isSKDashboard = true
            } label: {
                Text("Sanar Services")
            }
            .disabled(!session.isConnected)
            .navigationDestination(isPresented: $isSKDashboard) {
                SanarKit.DashboardView(isNavigationActive: $isSKDashboard)
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

struct HomeView: View {
    @EnvironmentObject private var session: SanarSession
    @State private var isSKDashboard = false

    var body: some View {
        NavigationView {
            NavigationLink(
                destination: SanarKit.DashboardView(isNavigationActive: $isSKDashboard),
                isActive: $isSKDashboard
            ) {
                Text("Sanar Services")
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
.navigationDestination(isPresented: $isSKDashboard) {
    SanarKit.DashboardView(isNavigationActive: $isSKDashboard)
}

// The app uses NavigationView (the only choice on an iOS 15 target): in place of the entry point
NavigationLink(
    destination: SanarKit.DashboardView(isNavigationActive: $isSKDashboard),
    isActive: $isSKDashboard
) {
    Text("Sanar Services") // the entry point's own label
}
```

### Tabs

Put the entry point on a tab's screen. Each tab that pushes the dashboard needs a navigation container: use the tab's existing `NavigationStack` or `NavigationView`, or wrap its root screen in one. Whether the dashboard covers the tab bar is **to confirm**: check it on the simulator and tell the developer.

### From UIKit

If the app is built with UIKit, host the SwiftUI view in a `UIHostingController` and push it onto the navigation controller. The binding below is a plain SwiftUI `Binding`. It pops the screen if the view ever sets it to `false`, and it does nothing when the member goes back with the back button.

```swift
import SwiftUI
import UIKit
import SanarKit

final class HomeViewController: UIViewController {
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

        let host = UIHostingController(rootView: SanarKit.DashboardView(isNavigationActive: isActive))
        sanarHost = host
        navigationController?.pushViewController(host, animated: true)
    }
}
```

Call `openSanar()` from the app's own button or menu action, after `connect` has succeeded. This example uses only the documented `DashboardView(isNavigationActive:)` initializer. The README shows SwiftUI only, so how the dashboard behaves inside a UIKit navigation controller (whether it shows its own navigation bar, whether it ever sets the binding to `false`) is **to confirm**. Tell the developer, and **ask the Sanar team before you ship a UIKit integration**.

## Verify

- The app builds for the iOS Simulator with the app's scheme (`xcodebuild ... -destination 'generic/platform=iOS Simulator' build`). A wrong navigation API for the deployment target shows up here.
- With the client ID still the placeholder, `connect` is never called, the entry point stays disabled, and the app does not crash. That shows the entry point waits for the session; the dashboard needs a real client ID.
- With a valid client ID for the environment, tapping the entry point opens the dashboard, and going back returns to the app's screen. The flag is `false` again, so the next tap opens it again.
- If you cannot run the app or connect (no simulator, no real client ID), say that you could not verify the dashboard itself.
