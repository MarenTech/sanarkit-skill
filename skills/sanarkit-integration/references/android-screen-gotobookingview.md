# gotoBookingView

Opens the Sanar booking flow on top of the app. The SDK shows the booking screens and completes the booking, so the app builds no booking interface of its own.

## Use when

- The developer wants a "Book a service" entry point in the app, and nothing else from Sanar on that screen.
- The developer wants booking without designing any interface: the SDK supplies it.
- If the member should also see appointments, calls and the other Sanar services from one place, use `gotoDashboardView` instead, and tell the developer that the dashboard already includes booking. To show existing appointments, use `gotoAppointmentListView`.
- `gotoBookingView()` has no service type or other parameter. Which services and steps the booking flow offers is **to confirm**: the README says only that the SDK handles "the complete booking process".

## Prerequisites

- The `.aar`, the dependency and the manifest permissions are in the app (`android-installation.md`).
- The `SanarKit` instance exists, the environment is set, and `connect` has called `onSuccess` on that same instance (`android-connect.md`). Keep the entry point disabled until then.
- The instance was created with an **Activity**, and you call `gotoBookingView()` on that instance. On a different instance, or after `disconnect`, the SDK shows a "Sanar Not Connected" toast and opens nothing.

`gotoBookingView()` is a method of `SanarKit`. It takes the member straight to the Sanar booking flow, as a full screen on top of the app's own screen. The SDK shows the booking screens, handles what the member does there, and talks to Sanar to complete a booking. The call starts the screen and returns at once.

The booking screens are not documented beyond that sentence, so do not describe them to the developer as if you had seen them.

## Parameters

```kotlin
fun gotoBookingView()
```

None. `gotoBookingView()` takes no arguments and returns nothing (`Unit`).

## Add it to the app

Do not create a new screen unless the developer asks. Put the entry point on the screen they named (for example the home screen), follow the app's own layout, naming and button styles, and keep the change small. `sanar` is the `SanarSession` from `android-connect.md`, created in the Activity with `by lazy { SanarSession(this) }`. Use the app's own connected flag if it has one, but always call `gotoBookingView()` on the instance that connected (`sanar.kit`).

The booking flow is a screen of its own that the SDK starts with `startActivity`. It is **not** a destination of the app's navigation graph, a tab or a Fragment, so do not add one for it.

### Activity (views)

The Activity that owns `sanar` shows the entry point. The button is the app's own (`R.id.book_sanar_service` here). It is disabled until `connect` succeeds:

```kotlin
package com.example.demo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class BookActivity : AppCompatActivity() { // use the app's own base class
    // Created on first use, on the main thread, after super.onCreate has run.
    private val sanar by lazy { SanarSession(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_book) // the app's own layout

        val bookService = findViewById<Button>(R.id.book_sanar_service)
        bookService.isEnabled = false // Enabled after connect succeeds.
        bookService.setOnClickListener { sanar.kit.gotoBookingView() } // read sanar.kit now, not earlier

        sanar.addConnectionListener { connected -> bookService.isEnabled = connected }
        // Where the app knows the user has signed in. This one connects when the Activity opens.
        sanar.connect(sanarUserInfo(currentUser())) { connected ->
            // A failed connect does not change isConnected, so report it here (the app's own message).
            if (!connected) bookService.text = "Booking is not available. Try again later."
        }
    }
}
```

`sanarUserInfo` and `currentUser()` are from `android-connect.md` (the mapping function and the app's own signed-in user). If the Activity already connects somewhere else, add only the lines for `bookService`.

### Fragment

Keep the session in the host Activity (the Activity implements `SanarHost`, see `android-connect.md`), so it survives moving between Fragments. The Fragment reaches it through the host and never creates its own `SanarKit`:

```kotlin
package com.example.demo

import android.os.Bundle
import android.view.View
import android.widget.Button
import androidx.fragment.app.Fragment

class BookFragment : Fragment(R.layout.fragment_book) { // the app's own layout
    // Read the session from onViewCreated onward.
    private val sanar: SanarSession
        get() = (requireActivity() as SanarHost).sanar

    private var bookService: Button? = null
    private val onConnectionChanged: (Boolean) -> Unit = { connected -> bookService?.isEnabled = connected }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val button = view.findViewById<Button>(R.id.book_sanar_service)
        bookService = button
        button.isEnabled = sanar.isConnected
        button.setOnClickListener { sanar.kit.gotoBookingView() } // read sanar.kit now, not earlier
        sanar.addConnectionListener(onConnectionChanged)
    }

    override fun onDestroyView() {
        sanar.removeConnectionListener(onConnectionChanged) // removes only this Fragment's listener
        bookService = null // do not keep the destroyed view
        super.onDestroyView()
    }
}
```

Any number of screens can listen: each adds its own listener and removes it again. The session is a property of the host Activity, so the Fragment must not keep `sanar.kit` in a property of its own: `connect` and `disconnect` replace that instance.

### Navigation Component, tabs and bottom navigation

Add the button to the Fragment of the tab or destination the developer named, as above. The booking flow is a separate Activity, so it covers the app's bottom bar and toolbar while it is open. How the Back button behaves is **to confirm**: in the 2.1.1 code Back steps back through the pages inside the Sanar screen and, from the first page, closes it and returns the member to the app's Activity. This was read from the compiled code and was not run on a device.

### Jetpack Compose

The Activity keeps the `SanarSession` and passes a lambda and the connected flag down to the app's own composable. Do not create `SanarKit` inside a composable:

```kotlin
// Inside the Activity's setContent { }. BookScreen is the app's own composable.
BookScreen(
    isSanarConnected = isSanarConnected, // state that the Activity sets from a sanar.addConnectionListener { } callback
    onOpenSanar = { sanar.kit.gotoBookingView() },
)
```

In the composable, show the button as enabled only when `isSanarConnected` is true. This snippet is illustrative and was not compiled.

## Verify

- `./gradlew assembleDebug` builds. A wrong import or a missing dependency shows up here (`android-troubleshooting.md`).
- With the client ID still the placeholder, `connect` is never called, the entry point stays disabled, and the app does not crash. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID for the environment, tapping the entry point opens the booking flow on top of the app, and Back eventually returns to the app's screen.
- If a "Sanar Not Connected" toast appears, the call ran on an instance that has no session. See `android-troubleshooting.md`.
- If you cannot run the app or connect (no emulator, no real client ID), say that you could not verify the booking flow itself.
