# ITCBooking

Instant teleconsultation booking with a built-in interface. It is part of the SanarKit package, so there is nothing extra to install.

## Use when

- The developer wants members to book an instant teleconsultation from the app, with Sanar's booking screens.
- The member should get the consultation chat straight after booking, without extra code.
- For everything in one place, use `SKDashboard`.

## Prerequisites

- The SDK, its peers and the permissions are installed, and the native apps were rebuilt.
- `SanarKit.setEnvironment` was called before `connect`, and `SanarKit.connect` has succeeded. The consultation chat that follows a booking is loaded for the environment that was set. Keep the component closed until `connect` has succeeded. Without a session the SDK logs "Not connected to Sanar Sarvices!" and calls `onEndFlow` at once, and nothing is shown.
- `onEndFlow` must set `enable` back to `false`. The component only looks at `enable` when its value changes, so without that the booking page cannot be opened a second time.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

`ITCBooking` loads a Sanar-hosted booking page into a WebView. After the member has booked, the page can start the consultation chat, and `ITCBooking` then opens `SKConsultation` itself, over the booking page. Do not render `SKConsultation` for this flow. Closing that chat returns the member to the booking page and does not call `onEndFlow`.

While `enable` is `true`, the component fills the view it is placed in. While it is `false`, it renders nothing.

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | Yes | none | Shows the booking module when `true` |
| `onEndFlow` | `function` | Yes | none | Called when the user leaves the booking module and returns home. Also called if there is no active SanarKit session |
| `navigationOption` | `boolean` | No | `false` | Shows the in-page navigation bar when `true`. When omitted or `false`, the SDK loads the booking page with navigation hidden (`nav=0`) |

`navigationOption` defaults to `false`, so leaving it out hides the navigation bar. Ask the developer whether they want Sanar's bar. If yes, pass `navigationOption={true}`.

## Add it to the app

```tsx
import { ITCBooking } from '@maren-sa/react-native-sanarkit';
```

### A button on an existing screen

Render the component as the last child of the screen's root view, which must fill the screen (`flex: 1`).

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { ITCBooking } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

export default function HomeScreen() {
  const { connected } = useSanarSession();
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* the screen's own content */}
      <Button title="Instant consultation" disabled={!connected} onPress={() => setBookingOpen(true)} />

      {/* Fills this view while it is open. */}
      <ITCBooking
        enable={bookingOpen}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => setBookingOpen(false)}
      />
    </View>
  );
}
```

Use the app's own button and text components and its naming.

### React Navigation: its own screen in a stack

```tsx
// SanarBookingScreen.tsx
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ITCBooking } from '@maren-sa/react-native-sanarkit';

export default function SanarBookingScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <ITCBooking
        enable={true}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => navigation.goBack()}
      />
    </View>
  );
}
```

```tsx
<Stack.Screen name="SanarBooking" component={SanarBookingScreen} options={{ headerShown: false }} />

// open it, only when connected is true
navigation.navigate('SanarBooking');
```

If the app types its navigation, add `SanarBooking: undefined` to its param list.

### React Navigation: tabs

- **Inside a tab screen:** use the button pattern above in that tab's screen. The booking page fills the screen area, and the tab bar stays visible.
- **Full screen over the tabs:** register `SanarBookingScreen` in the root stack that contains the tab navigator, and navigate to it from the tab. Ask the developer which they want.

## Verify

- The app builds on the platforms it targets.
- With the client ID missing or still the placeholder, `connect` is refused or fails, `connected` stays false, and the entry point stays disabled. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID, tapping the entry point shows the instant consultation booking page, with its navigation bar only when `navigationOption={true}`.
- After a booking, the consultation chat opens over the booking page. Closing it returns to the booking page. Leaving the booking page calls `onEndFlow`, and it can be opened again.
- Doctor-initiated video calls are handled by `SanarRTC`, a separate component. If the developer wants members to receive them, offer it.
- If you cannot connect, say that you could not verify the booking itself.
