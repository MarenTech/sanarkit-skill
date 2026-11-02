# gotoAppointmentListView

Opens the Sanar post-booking flow on top of the app: the member's upcoming and past appointments, the details of each appointment, and chat with the provider.

## Use when

- The developer wants a "My appointments" entry point in the app.
- The member should see all their upcoming and past appointments, open the details of one (time, date and provider), and chat with the provider from the appointment details.
- If the member should also book and reach the other Sanar services from the same place, use `gotoDashboardView` instead. To start a booking directly, use `gotoBookingView`.
- To open one specific consultation, for example from a notification, use `gotoConsultationView`.

## Prerequisites

- The `.aar`, the dependency and the manifest permissions are in the app (`android-installation.md`).
- The `SanarKit` instance exists, the environment is set, and `connect` has called `onSuccess` on that same instance (`android-connect.md`). Keep the entry point disabled until then.
- The instance was created with an **Activity**, and you call `gotoAppointmentListView()` on that instance. On a different instance, or after `disconnect`, the SDK shows a "Sanar Not Connected" toast and opens nothing.

`gotoAppointmentListView()` is a method of `SanarKit`. It takes the member to the post-booking flow, as a full screen on top of the app's own screen, where the SDK shows their appointments and lets them follow up with the provider. The app builds none of these screens. The call starts the screen and returns at once.

What the list shows when the member has no appointments is **to confirm**: the README does not say.

## Parameters

```kotlin
fun gotoAppointmentListView()
```

None. `gotoAppointmentListView()` takes no arguments and returns nothing (`Unit`).

## Add it to the app

Do not create a new screen unless the developer asks. Put the entry point on the screen they named (for example the home screen), follow the app's own layout, naming and button styles, and keep the change small. `sanar` is the `SanarSession` from `android-connect.md`, created in the Activity with `by lazy { SanarSession(this) }`. Use the app's own connected flag if it has one, but always call `gotoAppointmentListView()` on the instance that connected (`sanar.kit`).

The appointment list is a screen of its own that the SDK starts with `startActivity`. It is **not** a destination of the app's navigation graph, a tab or a Fragment, so do not add one for it.

### Activity (views)

The Activity that owns `sanar` shows the entry point. The button is the app's own (`R.id.open_sanar_appointments` here). It is disabled until `connect` succeeds:

```kotlin
package com.example.demo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class AppointmentsActivity : AppCompatActivity() { // use the app's own base class
    // Created on first use, on the main thread, after super.onCreate has run.
    private val sanar by lazy { SanarSession(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_appointments) // the app's own layout

        val openAppointments = findViewById<Button>(R.id.open_sanar_appointments)
        openAppointments.isEnabled = false // Enabled after connect succeeds.
        openAppointments.setOnClickListener { sanar.kit.gotoAppointmentListView() } // read sanar.kit now, not earlier

        sanar.addConnectionListener { connected -> openAppointments.isEnabled = connected }
        // Where the app knows the user has signed in. This one connects when the Activity opens.
        sanar.connect(sanarUserInfo(currentUser())) { connected ->
            // A failed connect does not change isConnected, so report it here (the app's own message).
            if (!connected) openAppointments.text = "Appointments are not available. Try again later."
        }
    }
}
```

`sanarUserInfo` and `currentUser()` are from `android-connect.md` (the mapping function and the app's own signed-in user). If the Activity already connects somewhere else, add only the lines for `openAppointments`.

### Fragment

Keep the session in the host Activity (the Activity implements `SanarHost`, see `android-connect.md`), so it survives moving between Fragments. The Fragment reaches it through the host and never creates its own `SanarKit`:

```kotlin
package com.example.demo

import android.os.Bundle
import android.view.View
import android.widget.Button
import androidx.fragment.app.Fragment

class AppointmentsFragment : Fragment(R.layout.fragment_appointments) { // the app's own layout
    // Read the session from onViewCreated onward.
    private val sanar: SanarSession
        get() = (requireActivity() as SanarHost).sanar

    private var openAppointments: Button? = null
    private val onConnectionChanged: (Boolean) -> Unit = { connected -> openAppointments?.isEnabled = connected }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val button = view.findViewById<Button>(R.id.open_sanar_appointments)
        openAppointments = button
        button.isEnabled = sanar.isConnected
        button.setOnClickListener { sanar.kit.gotoAppointmentListView() } // read sanar.kit now, not earlier
        sanar.addConnectionListener(onConnectionChanged)
    }

    override fun onDestroyView() {
        sanar.removeConnectionListener(onConnectionChanged) // removes only this Fragment's listener
        openAppointments = null // do not keep the destroyed view
        super.onDestroyView()
    }
}
```

Any number of screens can listen: each adds its own listener and removes it again. The session is a property of the host Activity, so the Fragment must not keep `sanar.kit` in a property of its own: `connect` and `disconnect` replace that instance.

### Navigation Component, tabs and bottom navigation

Add the button to the Fragment of the tab or destination the developer named, as above. The appointment list is a separate Activity, so it covers the app's bottom bar and toolbar while it is open. How the Back button behaves is **to confirm**: in the 2.1.1 code Back steps back through the pages inside the Sanar screen and, from the first page, closes it and returns the member to the app's Activity. This was read from the compiled code and was not run on a device.

### Jetpack Compose

The Activity keeps the `SanarSession` and passes a lambda and the connected flag down to the app's own composable. Do not create `SanarKit` inside a composable:

```kotlin
// Inside the Activity's setContent { }. AppointmentsScreen is the app's own composable.
AppointmentsScreen(
    isSanarConnected = isSanarConnected, // state that the Activity sets from a sanar.addConnectionListener { } callback
    onOpenSanar = { sanar.kit.gotoAppointmentListView() },
)
```

In the composable, show the button as enabled only when `isSanarConnected` is true. This snippet is illustrative and was not compiled.

## Verify

- `./gradlew assembleDebug` builds. A wrong import or a missing dependency shows up here (`android-troubleshooting.md`).
- With the client ID still the placeholder, `connect` is never called, the entry point stays disabled, and the app does not crash. That proves the wiring, not the appointment list.
- With a valid client ID for the environment, tapping the entry point opens the appointment list on top of the app, and Back eventually returns to the app's screen.
- If a "Sanar Not Connected" toast appears, the call ran on an instance that has no session. See `android-troubleshooting.md`.
- If you cannot run the app or connect (no emulator, no real client ID), say that you could not verify the appointment list itself.
