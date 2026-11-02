# ConsultationView

Deep-links the member straight to the Sanar consultation page for one appointment. Use it when a Sanar callback notification brings the app back from the background or from a killed state.

## Use when

- A Sanar callback notification arrives while the app is in the background or has been killed, and the app should take the member straight to the consultation when it comes back to the foreground.
- The app already has the doctor's ID (`dId`) and the appointment ID (`aId`) for that consultation.
- If the member should start a consultation from the appointment list or the dashboard, those flows open it for them. Use `DashboardView` or `BookingListView` instead.

## Prerequisites

- The Swift Package and the camera and microphone strings are in the app (`ios-installation.md`). A consultation can use the camera and the microphone.
- `SKManager.setEnvironment` was called and `SKManager.connect` has finished without throwing (`ios-connect.md`). When the app starts again from a killed state, connect again first. Whether a session from before the app was killed is still available is **to confirm**, so connecting first is the safe order. What the view shows without a session is also **to confirm**.
- **A doctor ID and an appointment ID.** Both are strings. **Ask the developer where they come from** (for example the payload of the Sanar notification, or the appointment the screen already shows), and never invent them. The README does not describe the notification or its payload, so where the app gets them from a notification is **to confirm**.
- The view is shown from a navigation container. Pick the example below by the app's **deployment target** (read it as `ios-installation.md` says): iOS 16 or later can use `NavigationStack`, iOS 15 uses `NavigationView`. If the app already has a navigation container, keep its type. **Do not raise the deployment target for this.** The minimum iOS version SanarKit supports is itself to confirm.

`ConsultationView` is a SwiftUI view that opens the consultation for one appointment. Unlike the other views, the app usually does not decide to show it from a button: it shows it when Sanar notifies the member.

## Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `isNavigationActive` | `Binding<Bool>` | Yes | none | Binding that controls navigation to `ConsultationView`, as for the other views. Keep a `Bool` in `@State` (or derive it, as below), set it to `true` to open the consultation, and pass the binding here |
| `consultationData` | `[String: Any]` | Yes | none | The consultation to open, as a dictionary with two `String` keys: `dId` (the doctor's ID) and `aId` (the appointment ID) |

The initializer is `init(isNavigationActive: Binding<Bool>, consultationData: [String: Any])`. Both arguments are required, in this order.

`consultationData` takes these two keys:

- `dId` (`String`): the unique identifier of the doctor.
- `aId` (`String`): the appointment ID of the consultation.

Whether it accepts other keys is **to confirm**. Send only these two.

## Add it to the app

Do not create a new screen unless the developer asks. Put the code where the app handles the Sanar notification or where it already knows the appointment, follow the app's own naming, and keep the change small. The examples write `SanarKit.ConsultationView` so the name cannot clash with a view of the same name in the app. `SanarSession` is the object from `ios-connect.md`; use the app's own connected flag if it has one.

### SwiftUI with `NavigationStack` (iOS 16 and later)

This opens the consultation from a button, for an appointment that the screen already knows. Keep a `Bool` in state, and pass the binding and the two IDs:

```swift
import SwiftUI
import SanarKit

struct ConsultationButton: View {
    let doctorId: String
    let appointmentId: String

    @EnvironmentObject private var session: SanarSession
    @State private var isConsultation = false

    var body: some View {
        NavigationStack {
            Button {
                isConsultation = true
            } label: {
                Text("Start Consultation")
            }
            .disabled(!session.isConnected)
            .navigationDestination(isPresented: $isConsultation) {
                SanarKit.ConsultationView(
                    isNavigationActive: $isConsultation,
                    consultationData: ["dId": doctorId, "aId": appointmentId]
                )
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

struct ConsultationButton: View {
    let doctorId: String
    let appointmentId: String

    @EnvironmentObject private var session: SanarSession
    @State private var isConsultation = false

    var body: some View {
        NavigationView {
            NavigationLink(
                destination: SanarKit.ConsultationView(
                    isNavigationActive: $isConsultation,
                    consultationData: ["dId": doctorId, "aId": appointmentId]
                ),
                isActive: $isConsultation
            ) {
                Text("Start Consultation")
            }
            .disabled(!session.isConnected)
        }
        .navigationViewStyle(.stack)
    }
}
```

### Open it from a notification

To deep-link, keep the two IDs somewhere the root view can read, and show `ConsultationView` when they are set and the session is connected. The app's notification code (for example `userNotificationCenter(_:didReceive:withCompletionHandler:)`) calls `openConsultation` with the IDs it read from the notification. Because the view waits for `session.isConnected`, a notification that starts the app from a killed state opens the consultation after `connect` has finished:

```swift
import SwiftUI
import SanarKit

final class ConsultationRouter: ObservableObject {
    @Published var consultationData: [String: Any]?

    func openConsultation(doctorId: String, appointmentId: String) {
        consultationData = ["dId": doctorId, "aId": appointmentId]
    }
}

struct RootView: View {
    // Provide one ConsultationRouter and the SanarSession with .environmentObject(...) at the app root.
    @EnvironmentObject private var router: ConsultationRouter
    @EnvironmentObject private var session: SanarSession

    var body: some View {
        NavigationStack {
            Text("Home") // the app's own first screen
                .navigationDestination(isPresented: isConsultationShown) {
                    SanarKit.ConsultationView(
                        isNavigationActive: isConsultationShown,
                        consultationData: router.consultationData ?? [:]
                    )
                }
        }
    }

    // True while the router holds consultation data and the session is connected.
    // Setting it to false clears the data.
    private var isConsultationShown: Binding<Bool> {
        Binding(
            get: { router.consultationData != nil && session.isConnected },
            set: { isShown in
                if !isShown { router.consultationData = nil }
            }
        )
    }
}
```

If the app's root is already a `NavigationStack` (choose by the container the app already uses, not only by the deployment target), add only the `.navigationDestination(isPresented:)` modifier to a view inside it. **Do not nest a second `NavigationStack`.** If the app's container is a `NavigationView` (always the case on an iOS 15 target), use a `NavigationLink` with an empty label inside it in place of the modifier, because `navigationDestination(isPresented:)` only works inside a `NavigationStack`:

```swift
NavigationLink(
    destination: SanarKit.ConsultationView(
        isNavigationActive: isConsultationShown,
        consultationData: router.consultationData ?? [:]
    ),
    isActive: isConsultationShown
) {
    EmptyView()
}
```

### From UIKit

If the app is built with UIKit, host the SwiftUI view in a `UIHostingController` and push it onto the navigation controller. Call `openConsultation(doctorId:appointmentId:)` from the notification code once the app is in the foreground and `connect` has finished. The binding is a plain SwiftUI `Binding`. It pops the screen if the view ever sets it to `false`, and it does nothing when the member goes back with the back button.

```swift
import SwiftUI
import UIKit
import SanarKit

final class ConsultationViewController: UIViewController {
    private weak var sanarHost: UIViewController?

    func openConsultation(doctorId: String, appointmentId: String) {
        let isActive = Binding<Bool>(
            get: { [weak self] in self?.sanarHost != nil },
            set: { [weak self] newValue in
                guard !newValue, let host = self?.sanarHost else { return }
                if self?.navigationController?.topViewController === host {
                    self?.navigationController?.popViewController(animated: true)
                }
            }
        )

        let host = UIHostingController(
            rootView: SanarKit.ConsultationView(
                isNavigationActive: isActive,
                consultationData: ["dId": doctorId, "aId": appointmentId]
            )
        )
        sanarHost = host
        navigationController?.pushViewController(host, animated: true)
    }
}
```

This code type-checks against the framework, but the README and the developer docs show a UIKit example for `DashboardView` only, so how `ConsultationView` behaves inside a UIKit navigation controller is **to confirm**. Tell the developer, and **ask the Sanar team before you ship a UIKit integration**.

## Verify

- The app builds for the iOS Simulator with the app's scheme (`xcodebuild ... -destination 'generic/platform=iOS Simulator' build`). A missing `isNavigationActive` or a wrong navigation API for the deployment target shows up here.
- Both IDs are strings and come from the developer's source, not from the code you wrote. No ID is a made-up value in the app.
- With the client ID still the placeholder, `connect` is never called and the consultation never opens. That shows the entry point waits for the session; the consultation needs a real client ID.
- With a valid client ID and a real appointment, opening the consultation shows the Sanar consultation page, and going back returns to the app. A real notification flow (background and killed states) needs a real Sanar notification: only the developer can test it. If you cannot, say that you could not verify it.
