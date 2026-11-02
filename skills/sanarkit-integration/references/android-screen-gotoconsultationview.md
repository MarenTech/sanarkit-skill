# gotoConsultationView

Opens the Sanar consultation chat page for one appointment, on top of the app. Use it to take the member straight to a consultation, for example when the app is opened from the background or from a killed state by a notification that is linked to a Sanar appointment.

## Use when

- The app is opened from the background or from a killed state by a notification that is linked to a Sanar appointment (for example one that follows a Sanar webhook), and it should take the member straight to that consultation.
- The app already has the appointment ID (`aId`) and the doctor ID (`dId`) for that consultation.
- If the member should find their appointments themselves, use `gotoAppointmentListView` or `gotoDashboardView`: both include the consultations. They are what most apps need, so ask the developer before you choose this one.

## Prerequisites

- The `.aar`, the dependency and the manifest permissions are in the app (`android-installation.md`). The consultation page uses the camera and the microphone, so the app's manifest must declare `android.permission.CAMERA` and `android.permission.RECORD_AUDIO`. The consultation screen asks the member for both when it opens, and you write no request.
- The `SanarKit` instance exists, the environment is set, and `connect` has called `onSuccess` on that same instance (`android-connect.md`). The instance was created with an **Activity**, and you call `gotoConsultationView` on that instance. On a different instance, or after `disconnect`, the SDK shows a "Sanar Not Connected" toast and opens nothing.
- **Connect again after the app was killed.** The session is in memory, in the instance. When the app starts again from a killed state it has a new instance with no session, so connect before you open the consultation. That needs a signed-in user to build `UserInfo` from. If the user can be signed out when the notification arrives, the app has to restore or ask for the sign-in first. Ask the developer how the app handles this.
- **An appointment ID and a doctor ID.** Both are strings. **Ask the developer where they come from** (for example the payload of the notification, or the appointment the screen already shows), and never invent them. SanarKit does not receive or handle notifications, the app does. The README does not describe the notification or its payload, so how the IDs reach the app is **to confirm** with the Sanar team.
- If either ID is empty, the SDK shows an "Invalid appointment or doctor ID" toast and opens nothing.

`gotoConsultationView(aId, dId)` is a method of `SanarKit`. It takes the member straight to the consultation chat page for one appointment, as a full screen on top of the app's own screen, so they do not have to find it in the appointment list. The call starts the screen and returns at once.

Which other pages the consultation offers, and what the member sees when the appointment ID does not belong to them, are **to confirm**.

## Parameters

```kotlin
fun gotoConsultationView(aId: String, dId: String)
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `aId` | `String` | Yes | none | The unique ID of the appointment to open |
| `dId` | `String` | Yes | none | The unique ID of the doctor for that appointment |

The method returns nothing (`Unit`). Pass both by name, as the examples do, so the order cannot be mixed up. Pass the IDs exactly as Sanar gives them: the SDK puts them into the page address as they are and does not escape them, so do not build them from text a member typed, and whether an ID may contain characters that need escaping is **to confirm**.

## Add it to the app

Do not create a new screen unless the developer asks. `sanar` is the `SanarSession` from `android-connect.md`. Put the code where the app handles the notification, or where it already knows the appointment, follow the app's own naming, and keep the change small. The consultation is a screen of its own that the SDK starts with `startActivity`. It is **not** a destination of the app's navigation graph, a tab or a Fragment, so do not add one for it.

### From a button, for an appointment the screen already knows

In an Activity that owns `sanar` (its `SanarSession`), once `connect` has succeeded. `appointment` is the app's own object, and the IDs come from it:

```kotlin
consultationButton.isEnabled = false // Enabled from a sanar.addConnectionListener { } callback, as for the other screens.
consultationButton.setOnClickListener {
    sanar.kit.gotoConsultationView(aId = appointment.id, dId = appointment.doctorId)
}
```

In a Fragment, reach the session through the host Activity, as `android-connect.md` shows (`(requireActivity() as SanarHost).sanar`), and call the same method.

### From a notification

The member taps a notification of the app, and the app opens an Activity that connects and then opens the consultation. The extra names (`appointment_id` and `doctor_id`) are the app's own, chosen when it builds the notification, and do not belong to SanarKit. `sanarUserInfo` and `currentUser()` are from `android-connect.md`:

```kotlin
package com.example.demo

import android.content.Intent
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class NotificationActivity : AppCompatActivity() { // use the app's own base class
    // Created on first use, on the main thread, after super.onCreate has run.
    private val sanar by lazy { SanarSession(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply { text = "Opening your consultation..." })

        // The app may have been killed, so connect again before the consultation opens.
        sanar.connect(sanarUserInfo(currentUser())) { connected ->
            if (connected) openConsultation(intent) else finish()
        }
    }

    // The Activity is already open and the member taps another notification.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (sanar.isConnected) openConsultation(intent)
    }

    private fun openConsultation(intent: Intent) {
        val appointmentId = intent.getStringExtra(EXTRA_APPOINTMENT_ID).orEmpty()
        val doctorId = intent.getStringExtra(EXTRA_DOCTOR_ID).orEmpty()
        // An empty ID would only make the SDK show a toast. Decide what the app does instead.
        if (appointmentId.isEmpty() || doctorId.isEmpty()) return
        sanar.kit.gotoConsultationView(aId = appointmentId, dId = doctorId)
    }

    companion object {
        // Names the app chooses for the extras of its own notification Intent.
        const val EXTRA_APPOINTMENT_ID = "appointment_id"
        const val EXTRA_DOCTOR_ID = "doctor_id"
    }
}
```

- **This Activity is only a stand-in.** After the consultation, Back returns to it and shows the placeholder text. Ask the developer what the member should see (usually the app's home screen) and route there instead.
- **`onNewIntent` runs only if the Activity is reused.** That is general Android behavior and not specific to Sanar: the Activity must be declared with `android:launchMode="singleTop"` or `singleTask` in the manifest, or be started with `Intent.FLAG_ACTIVITY_SINGLE_TOP`. Otherwise Android creates a new instance for each notification, which runs `onCreate` and connects again. Do not change the launch mode unasked.
- The Activity must be declared in the manifest, and the notification's `PendingIntent` must start it with the two extras. That is the app's own notification code. If the app has none, ask the developer, because SanarKit does not send notifications.
- To open a consultation from a link or button with fixed IDs, use placeholders only while you write code: `sanar.kit.gotoConsultationView(aId = "<appointment ID>", dId = "<doctor ID>")`. Never ship invented IDs.

### Jetpack Compose

The same rules apply: the Activity owns the `SanarSession`, and a composable receives a lambda, for example `onOpenConsultation = { sanar.kit.gotoConsultationView(aId = appointment.id, dId = appointment.doctorId) }`. Do not create `SanarKit` inside a composable.

## Verify

- `./gradlew assembleDebug` builds, and the merged manifest declares `CAMERA` and `RECORD_AUDIO` (`android-installation.md` shows the check).
- With the client ID still the placeholder, `connect` is never called, `onResult` gets `false`, and nothing opens. That proves the wiring, not the consultation.
- With a valid client ID and a real appointment ID and doctor ID from the Sanar team, the notification (or the button) opens the consultation page. The camera and microphone requests appear when it opens. If the app is killed first, the consultation still opens after the new connect.
- An "Invalid appointment or doctor ID" toast means an ID is empty. A "Sanar Not Connected" toast means the call ran on an instance without a session. See `android-troubleshooting.md`.
- If you cannot run the app, connect, or get real IDs, say that you could not verify the consultation itself.
