# gotoDashboardView

Opens the unified Sanar dashboard on top of the app: teleconsultation, home visits, the appointment list and chat or calls with providers, from one entry point. It is the recommended first screen, because it gives the member everything Sanar offers.

## Use when

- The developer wants one entry point to everything Sanar offers, with the least code.
- This is the first Sanar integration in the app.
- Teleconsultation and calls with the provider are inside the dashboard. They are not a separate Android component, so tell the developer that and ask what they want.
- Use `gotoBookingView` or `gotoAppointmentListView` instead only if the developer asks for one flow, or if the app already ships it.

## Prerequisites

- The `.aar`, the dependency and the manifest permissions are in the app (`android-installation.md`).
- The `SanarKit` instance exists, the environment is set, and `connect` has called `onSuccess` on that same instance (`android-connect.md`). Keep the entry point disabled until then.
- The instance was created with an **Activity**, and you call `gotoDashboardView()` on that instance. On a different instance, or after `disconnect`, the SDK shows a "Sanar Not Connected" toast and opens nothing.

`gotoDashboardView()` is a method of `SanarKit`. It opens the dashboard as a full screen on top of the app's own screen, with a pre-built Sanar interface. The app writes none of the dashboard's screens. The call starts the screen and returns at once.

What the dashboard looks like and which actions it offers is **to confirm**: the README lists the included services and gives no screenshots.

## Parameters

```kotlin
fun gotoDashboardView()
```

None. `gotoDashboardView()` takes no arguments and returns nothing (`Unit`).

## Add it to the app

Do not create a new screen unless the developer asks. Put the entry point on the screen they named (for example the home screen), follow the app's own layout, naming and button styles, and keep the change small. `sanar` is the `SanarSession` from `android-connect.md`, created in the Activity with `by lazy { SanarSession(this) }`. Use the app's own connected flag if it has one, but always call `gotoDashboardView()` on the instance that connected (`sanar.kit`).

The dashboard is a screen of its own that the SDK starts with `startActivity`. It is **not** a destination of the app's navigation graph, a tab or a Fragment, so do not add one for it.

### Activity (views)

The Activity that owns `sanar` shows the entry point. The button is the app's own (`R.id.open_sanar_dashboard` here). It is disabled until `connect` succeeds:

```kotlin
package com.example.demo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() { // use the app's own base class
    // Created on first use, on the main thread, after super.onCreate has run.
    private val sanar by lazy { SanarSession(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home) // the app's own layout

        val openDashboard = findViewById<Button>(R.id.open_sanar_dashboard)
        openDashboard.isEnabled = false // Enabled after connect succeeds.
        openDashboard.setOnClickListener { sanar.kit.gotoDashboardView() } // read sanar.kit now, not earlier

        sanar.addConnectionListener { connected -> openDashboard.isEnabled = connected }
        // Where the app knows the user has signed in. This one connects when the Activity opens.
        sanar.connect(sanarUserInfo(currentUser())) { connected ->
            // A failed connect does not change isConnected, so report it here (the app's own message).
            if (!connected) openDashboard.text = "Sanar is not available. Try again later."
        }
    }
}
```

`sanarUserInfo` and `currentUser()` are from `android-connect.md` (the mapping function and the app's own signed-in user). If the Activity already connects somewhere else, add only the lines for `openDashboard`.

### Fragment

Keep the session in the host Activity (the Activity implements `SanarHost`, see `android-connect.md`), so it survives moving between Fragments. The Fragment reaches it through the host and never creates its own `SanarKit`:

```kotlin
package com.example.demo

import android.os.Bundle
import android.view.View
import android.widget.Button
import androidx.fragment.app.Fragment

class HomeFragment : Fragment(R.layout.fragment_home) { // the app's own layout
    // Read the session from onViewCreated onward.
    private val sanar: SanarSession
        get() = (requireActivity() as SanarHost).sanar

    private var openDashboard: Button? = null
    private val onConnectionChanged: (Boolean) -> Unit = { connected -> openDashboard?.isEnabled = connected }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val button = view.findViewById<Button>(R.id.open_sanar_dashboard)
        openDashboard = button
        button.isEnabled = sanar.isConnected
        button.setOnClickListener { sanar.kit.gotoDashboardView() } // read sanar.kit now, not earlier
        sanar.addConnectionListener(onConnectionChanged)
    }

    override fun onDestroyView() {
        sanar.removeConnectionListener(onConnectionChanged) // removes only this Fragment's listener
        openDashboard = null // do not keep the destroyed view
        super.onDestroyView()
    }
}
```

Any number of screens can listen: each adds its own listener and removes it again. The session is a property of the host Activity, so the Fragment must not keep `sanar.kit` in a property of its own: `connect` and `disconnect` replace that instance.

### Navigation Component, tabs and bottom navigation

Add the button to the Fragment of the tab or destination the developer named, as above. The dashboard is a separate Activity, so it covers the app's bottom bar and toolbar while it is open. How the Back button behaves is **to confirm**: in the 2.1.1 code Back steps back through the pages inside the Sanar screen and, from the first page, closes it and returns the member to the app's Activity. This was read from the compiled code and was not run on a device.

### Jetpack Compose

The Activity keeps the `SanarSession` and passes a lambda and the connected flag down to the app's own composable. Do not create `SanarKit` inside a composable:

```kotlin
// Inside the Activity's setContent { }. HomeScreen is the app's own composable.
HomeScreen(
    isSanarConnected = isSanarConnected, // state that the Activity sets from a sanar.addConnectionListener { } callback
    onOpenSanar = { sanar.kit.gotoDashboardView() },
)
```

In the composable, show the button as enabled only when `isSanarConnected` is true. This snippet is illustrative and was not compiled.

## Verify

- `./gradlew assembleDebug` builds. A wrong import or a missing dependency shows up here (`android-troubleshooting.md`).
- With the client ID still the placeholder, `connect` is never called, the entry point stays disabled, and the app does not crash. That proves the wiring, not the dashboard.
- With a valid client ID for the environment, tapping the entry point opens the dashboard on top of the app, and Back eventually returns to the app's screen.
- If a "Sanar Not Connected" toast appears, the call ran on an instance that has no session. See `android-troubleshooting.md`.
- If you cannot run the app or connect (no emulator, no real client ID), say that you could not verify the dashboard itself.
