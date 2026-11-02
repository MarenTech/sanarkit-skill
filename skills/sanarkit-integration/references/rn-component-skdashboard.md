# SKDashboard

Shows the unified Sanar dashboard, with all services in one place, inside the app. It is the recommended first component, because it gives the member one entry point to everything Sanar offers.

## Use when

- The developer wants one entry point to all Sanar services and the least code.
- This is the first Sanar integration in the app.
- For one service only, use `SKService`. For the member's appointments only, use `SKAppointments`.

## Prerequisites

- The SDK, its peers and the permissions are installed, and the native apps were rebuilt.
- `SanarKit.setEnvironment` was called and `SanarKit.connect` has succeeded. Keep the component closed (`enable` false) until it has. Without a session the SDK logs "Not connected to Sanar Sarvices!" and calls `onEndFlow` at once, and nothing is shown.
- `onEndFlow` must set `enable` back to `false`. The component only looks at `enable` when its value changes, so without that the dashboard cannot be opened a second time.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

`SKDashboard` loads a Sanar-hosted dashboard page into a WebView. While `enable` is `true`, it fills the view it is placed in (it is absolutely positioned inside its parent). While `enable` is `false`, it renders nothing.

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | Yes | none | Shows the dashboard when `true` |
| `onEndFlow` | `function` | Yes | none | Called when the user leaves the dashboard and returns home. Also called if there is no active SanarKit session |
| `navigationOption` | `boolean` | No | `false` | Shows the in-page navigation bar when `true`. When omitted or `false`, the SDK loads the dashboard with navigation hidden (`nav=0`) |

`navigationOption` defaults to `false`, so leaving it out hides the navigation bar. Ask the developer whether they want Sanar's bar. If yes, pass `navigationOption={true}`.

## Add it to the app

```tsx
import { SKDashboard } from '@maren-sa/react-native-sanarkit';
```

### A button on an existing screen

Keep an `enable` flag in state, set it when the member taps the entry point, and clear it in `onEndFlow`. Render `SKDashboard` as the last child of the screen's root view, which must fill the screen (`flex: 1`).

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { SKDashboard } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

export default function HomeScreen() {
  const { connected } = useSanarSession();
  const [dashboardOpen, setDashboardOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* the screen's own content */}
      <Button title="Open Sanar" disabled={!connected} onPress={() => setDashboardOpen(true)} />

      {/* Fills this view while it is open. */}
      <SKDashboard
        enable={dashboardOpen}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => setDashboardOpen(false)}
      />
    </View>
  );
}
```

Use the app's own button and text components and its naming. Place the entry point where the developer asked.

### React Navigation: its own screen in a stack

Use this when the dashboard should be full screen. The screen mounts the component with `enable` already `true`, and `onEndFlow` goes back.

```tsx
// SanarDashboardScreen.tsx
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SKDashboard } from '@maren-sa/react-native-sanarkit';

export default function SanarDashboardScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <SKDashboard
        enable={true}
        navigationOption={true} // ask the developer: leave this out to hide Sanar's navigation bar
        onEndFlow={() => navigation.goBack()}
      />
    </View>
  );
}
```

Register it in the stack without a header, and open it from a button that is enabled only when `connected` is true:

```tsx
<Stack.Screen name="SanarDashboard" component={SanarDashboardScreen} options={{ headerShown: false }} />

// in the screen that opens it
<Button title="Open Sanar" disabled={!connected} onPress={() => navigation.navigate('SanarDashboard')} />
```

If the app types its navigation, add `SanarDashboard: undefined` to its param list.

### React Navigation: tabs

- **Inside a tab screen:** use the button pattern above in that tab's screen. The dashboard fills the screen area, and the tab bar stays visible below it.
- **Full screen over the tabs:** register `SanarDashboardScreen` in the root stack that contains the tab navigator, with `headerShown: false`, and call `navigation.navigate('SanarDashboard')` from the tab. Ask the developer which they want.

## Verify

- The app builds on the platforms it targets.
- With the client ID missing or still the placeholder, `connect` is refused or fails, `connected` stays false, and the entry point stays disabled. That shows the entry point waits for the session; the dashboard needs a real client ID.
- With a valid client ID for the environment, tapping the entry point makes the dashboard fill the view. With `navigationOption={true}` the navigation bar shows, and without it the bar is hidden.
- Leaving the dashboard calls `onEndFlow`, the dashboard closes, and the screen opens it again on the next tap.
- The console does not show "Not connected to Sanar Sarvices!". If it does, the component was enabled before `connect` succeeded.
- If you cannot connect (no real client ID), say that you could not verify the dashboard itself.
