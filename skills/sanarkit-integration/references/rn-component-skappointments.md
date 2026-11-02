# SKAppointments

Appointment scheduling and management, rendered inside the app. It loads a Sanar-hosted appointments page into a WebView.

## Use when

- The developer wants a "My appointments" entry in the app, for example in a profile screen or a tab.
- The dashboard is shown elsewhere, or not at all, and members still need to manage their appointments.
- For everything in one place, use `SKDashboard`. To open the consultation of one appointment from the app's own list, use `SKConsultation`.

## Prerequisites

- The SDK, its peers and the permissions are installed, and the native apps were rebuilt.
- `SanarKit.setEnvironment` was called and `SanarKit.connect` has succeeded. Keep the component closed until it has. Without a session the SDK logs "Not connected to Sanar Sarvices!" and calls `onEndFlow` at once, and nothing is shown.
- `onEndFlow` must set `enable` back to `false`. The component only looks at `enable` when its value changes, so without that the page cannot be opened a second time.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

While `enable` is `true`, the component fills the view it is placed in. While it is `false`, it renders nothing.

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | Yes | none | Shows the appointments module when `true` |
| `onEndFlow` | `function` | Yes | none | Called when the user leaves the appointments module and returns home. Also called if there is no active SanarKit session |
| `navigationOption` | `boolean` | No | `false` | Shows the in-page navigation bar when `true`. When omitted or `false`, the SDK loads the appointments page with navigation hidden (`nav=0`) |

`navigationOption` defaults to `false`, so leaving it out hides the navigation bar. Ask the developer whether they want Sanar's bar. If yes, pass `navigationOption={true}`.

## Add it to the app

```tsx
import { SKAppointments } from '@maren-sa/react-native-sanarkit';
```

### A button on an existing screen

Render the component as the last child of the screen's root view, which must fill the screen (`flex: 1`).

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { SKAppointments } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

export default function ProfileScreen() {
  const { connected } = useSanarSession();
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* the screen's own content */}
      <Button title="My appointments" disabled={!connected} onPress={() => setAppointmentsOpen(true)} />

      {/* Fills this view while it is open. */}
      <SKAppointments
        enable={appointmentsOpen}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => setAppointmentsOpen(false)}
      />
    </View>
  );
}
```

Use the app's own button and text components and its naming.

### React Navigation: its own screen in a stack

```tsx
// SanarAppointmentsScreen.tsx
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SKAppointments } from '@maren-sa/react-native-sanarkit';

export default function SanarAppointmentsScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <SKAppointments
        enable={true}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => navigation.goBack()}
      />
    </View>
  );
}
```

```tsx
<Stack.Screen name="SanarAppointments" component={SanarAppointmentsScreen} options={{ headerShown: false }} />

// open it, only when connected is true
navigation.navigate('SanarAppointments');
```

If the app types its navigation, add `SanarAppointments: undefined` to its param list.

### React Navigation: tabs

- **Inside a tab screen:** use the button pattern above in that tab's screen. The appointments page fills the screen area, and the tab bar stays visible.
- **Full screen over the tabs:** register `SanarAppointmentsScreen` in the root stack that contains the tab navigator, and navigate to it from the tab. Ask the developer which they want.

## Verify

- The app builds on the platforms it targets.
- With the client ID missing or still the placeholder, `connect` is refused or fails, `connected` stays false, and the entry point stays disabled. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID, tapping the entry point shows the member's appointments page, with its navigation bar only when `navigationOption={true}`.
- Leaving the page calls `onEndFlow`, the page closes, and it can be opened again.
- If you cannot connect, say that you could not verify the page itself.
