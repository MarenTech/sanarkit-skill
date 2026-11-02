# SKService

Opens a single Sanar service, such as lab tests or a nurse visit, without the full dashboard. Available since SDK 2.5.3.

## Use when

- The developer wants a "Lab tests" or "Nurse visit" button that goes straight to that service.
- Members should not go through the full dashboard.
- The developer wants several entry points, one for each service.
- For everything in one place, use `SKDashboard` instead.

## Prerequisites

- The SDK, its peers and the permissions are installed, and the native apps were rebuilt.
- `SanarKit.connect` has succeeded. Keep the component closed until it has. If there is no session, or the session has no service with the `type` you pass, the SDK logs a warning ("Not connected to Sanar Sarvices!" or "Service not found!") and calls `onEndFlow` at once.
- **Ask the developer which service to open.** Do not guess the service type. Which services are enabled for their client ID is to confirm with the Sanar team.
- `type` is read when `enable` becomes `true`. Changing it while the service is open does nothing. To open another service, close this one first.
- `onEndFlow` must set `enable` back to `false`, or the service cannot be opened a second time.

While `enable` is `true`, `SKService` fills the view it is placed in. While it is `false`, it renders nothing.

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | Yes | none | Shows the service when `true` |
| `type` | `SERVICE_TYPE` | Yes | none | The service to open. Pass a `SERVICE_TYPE` value, for example `SERVICE_TYPE.Laboratory` (`'ST04'`). If the active session has no matching service, `onEndFlow` is called |
| `onEndFlow` | `function` | Yes | none | Called when the user leaves the service and returns home. Also called if there is no active SanarKit session or the service is not found |

`SKService` has no `navigationOption`. It never reads that prop, so passing it changes nothing. Do not pass it.

## Service types

Pass a `SERVICE_TYPE` member as `type`. The values are plain strings, so `'ST04'` and `SERVICE_TYPE.Laboratory` are the same. Use the member, so a typo is caught when the app builds.

| Service | Value | ID |
| --- | --- | --- |
| Telemedicine | `SERVICE_TYPE.Telemedicine` | `ST11` |
| Laboratory | `SERVICE_TYPE.Laboratory` | `ST04` |
| Nurse Visit | `SERVICE_TYPE.NurseVisit` | `ST03` |
| Home Visit Doctor | `SERVICE_TYPE.HomeVisitDoctor` | `ST01` |
| Physiotherapist | `SERVICE_TYPE.Physiotherapist` | `ST02` |
| Radiology | `SERVICE_TYPE.Radiology` | `ST031` |
| Kids Vaccination | `SERVICE_TYPE.KidsVaccination` | `ST043` |
| Chronic Disease Management | `SERVICE_TYPE.CDM` | `HP11` |
| Medical File | `SERVICE_TYPE.MedicalFile` | `HP12` |

`SERVICE_TYPE.MedicalFile` was added in SDK 3.0.0. Check the installed package's `lib/Types.d.ts` if the installed version is older.

## Add it to the app

```tsx
import { SKService, SERVICE_TYPE } from '@maren-sa/react-native-sanarkit';
```

### A button on an existing screen

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { SKService, SERVICE_TYPE } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

export default function LabTestsScreen() {
  const { connected } = useSanarSession();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Button title="Lab tests" disabled={!connected} onPress={() => setOpen(true)} />

      {/* Fills this view while it is open. Use the service the developer chose. */}
      <SKService enable={open} type={SERVICE_TYPE.Laboratory} onEndFlow={() => setOpen(false)} />
    </View>
  );
}
```

### Several services from one screen

Keep the chosen service in state and render `SKService` only while one is chosen. The component then mounts with `enable` already `true`, and each new choice starts from a fresh mount, which avoids the "old service" problem.

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { SKService, SERVICE_TYPE } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

export default function ServicesScreen() {
  const { connected } = useSanarSession();
  const [selected, setSelected] = useState<SERVICE_TYPE | null>(null);

  return (
    <View style={{ flex: 1 }}>
      {/* one button per service the developer asked for, enabled only when connected */}
      <Button title="Lab tests" disabled={!connected} onPress={() => setSelected(SERVICE_TYPE.Laboratory)} />

      {/* Fills this view while a service is chosen. */}
      {connected && selected !== null && (
        <SKService enable={true} type={selected} onEndFlow={() => setSelected(null)} />
      )}
    </View>
  );
}
```

### React Navigation: its own screen in a stack

Pass the service type as a route parameter. The screen mounts the component with `enable` already `true`, and `onEndFlow` goes back.

```tsx
// SanarServiceScreen.tsx
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SKService, SERVICE_TYPE } from '@maren-sa/react-native-sanarkit';

export default function SanarServiceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { type } = route.params as { type: SERVICE_TYPE };

  return (
    <View style={{ flex: 1 }}>
      <SKService enable={true} type={type} onEndFlow={() => navigation.goBack()} />
    </View>
  );
}
```

```tsx
<Stack.Screen name="SanarService" component={SanarServiceScreen} options={{ headerShown: false }} />

// open it, only when connected is true
navigation.navigate('SanarService', { type: SERVICE_TYPE.Laboratory });
```

If the app types its navigation, add `SanarService: { type: SERVICE_TYPE }` to its param list.

### React Navigation: tabs

- **Inside a tab screen:** use the button pattern above in that tab's screen. The service fills the screen area, and the tab bar stays visible.
- **Full screen over the tabs:** register `SanarServiceScreen` in the root stack that contains the tab navigator, and navigate to it from the tab. Ask the developer which they want.

## Verify

- The app builds on the platforms it targets, and TypeScript accepts `type` (the value is a `SERVICE_TYPE` member).
- With the client ID missing or still the placeholder, `connect` is refused or fails, `connected` stays false, and the entry point stays disabled. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID, tapping the entry point opens that one service, not the dashboard. If it closes at once with "Service not found!", the service is not in the member's session: tell the developer it may not be enabled for their client ID.
- Leaving the service calls `onEndFlow`, and it can be opened again.
- If you cannot connect, say that you could not verify the service itself.
