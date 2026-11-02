# SKConsultation

Chat-based teleconsultation between a member and a doctor for one appointment. Use it for every consultation. Never use `SKChat`, and never call `setIsChatEnabled`.

`SKConsultation` is different from the other components. Its screen is not inside the SanarKit package. When it renders, it loads Sanar's hosted consultation component at runtime and passes its props through to that component.

## Use when

- The app already has the appointment ID and the doctor's ID, and the developer wants to open the chat for that appointment from the app's own screen.
- The developer wants to open a consultation from the app's own appointment list instead of going through `SKAppointments`.
- Not for instant consultations. `ITCBooking` opens the consultation chat itself after a booking, so do not render `SKConsultation` for that flow.

## Prerequisites

- The SDK, its peers and the permissions are installed, and the native apps were rebuilt.
- **Set the environment before the component renders.** The hosted component is chosen from the SDK environment when `SKConsultation` renders: `production` uses the production host, and every other environment uses the development host. Call `SanarKit.setEnvironment` before any render, then `connect`.
- **The device needs network access to Sanar.** The SDK downloads the hosted component when `SKConsultation` renders. The hosts to allow are to confirm.
- **`appointmentId` and `empId` are required.** Ask the developer where the app gets them (a list of appointments, a route parameter, its own backend). Never invent them. Where they come from, and which REST API fields they match, is to confirm with the Sanar team.
- **Open it only after `connect` has succeeded.** What `SKConsultation` does without a session is to confirm, because the SDK package has no session check for it. Do not rely on `onEndFlow` being called.
- **`onEndFlow` must set `enable` back to `false`**, so the consultation can be opened again.
- What the member sees when the hosted component cannot be downloaded, for example when the device is offline, is to confirm. Tell the developer.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | Yes | none | Shows the consultation module when `true` |
| `appointmentId` | `string` | Yes | none | Unique ID of the appointment |
| `empId` | `string` | Yes | none | ID of the consulting doctor |
| `onEndFlow` | `function` | Yes | none | Called when the consultation module is closed |
| `navigationOption` | `boolean` | No | none | To confirm. `SKConsultation` loads a hosted component at runtime, so its props are owned outside the SDK package. `navigationOption` is not on the current docs site, and the SDK package does not read it. Do not rely on it, and do not pass it unless the Sanar team confirms what it does |

Because the hosted component owns these props, they can change without a new SDK release. The package's own type declaration for it is `props: any`, so it lists none of them. If the props here and the behaviour you see differ, tell the developer and ask the Sanar team.

## How it loads

Every other SanarKit component ships its code in the package and only loads a Sanar-hosted web page. `SKConsultation` also loads its own code:

1. When it renders, it builds the address of the hosted component from the current SDK environment.
2. It downloads that component and runs it inside the app.
3. It passes every prop it was given to that component.

## Add it to the app

```tsx
import { SKConsultation } from '@maren-sa/react-native-sanarkit';
```

### A button on a screen that has the IDs

```tsx
import { useState } from 'react';
import { Button, View } from 'react-native';
import { SKConsultation } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

type ConsultationButtonProps = {
  appointmentId: string; // from the app's own appointment data, as the developer confirmed
  doctorId: string;
};

export default function ConsultationButton({ appointmentId, doctorId }: ConsultationButtonProps) {
  const { connected } = useSanarSession();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Button title="Open consultation" disabled={!connected} onPress={() => setOpen(true)} />

      {/* Fills this view while it is open. */}
      <SKConsultation
        enable={open}
        appointmentId={appointmentId}
        empId={doctorId}
        onEndFlow={() => setOpen(false)}
      />
    </View>
  );
}
```

The parent view must fill the screen (`flex: 1`), because the component fills the view it is placed in.

### React Navigation: its own screen in a stack

Pass the two IDs as route parameters. The screen mounts the component with `enable` already `true`, and `onEndFlow` goes back.

```tsx
// SanarConsultationScreen.tsx
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SKConsultation } from '@maren-sa/react-native-sanarkit';

export default function SanarConsultationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { appointmentId, empId } = route.params as { appointmentId: string; empId: string };

  return (
    <View style={{ flex: 1 }}>
      <SKConsultation
        enable={true}
        appointmentId={appointmentId}
        empId={empId}
        onEndFlow={() => navigation.goBack()}
      />
    </View>
  );
}
```

```tsx
<Stack.Screen name="SanarConsultation" component={SanarConsultationScreen} options={{ headerShown: false }} />

// open it, only when connected is true, with the IDs the app holds
navigation.navigate('SanarConsultation', { appointmentId, empId });
```

If the app types its navigation, add `SanarConsultation: { appointmentId: string; empId: string }` to its param list.

### React Navigation: tabs

- **Inside a tab screen:** use the button pattern above. The consultation fills the screen area, and the tab bar stays visible.
- **Full screen over the tabs:** register `SanarConsultationScreen` in the root stack that contains the tab navigator, and navigate to it from the tab or from a list screen. Ask the developer which they want.

## Verify

- The app builds on the platforms it targets.
- With the client ID missing or still the placeholder, `connect` is refused or fails, `connected` stays false, and the entry point stays disabled. That shows the entry point waits for the session; the full flow needs a real client ID.
- With a valid client ID, a real appointment ID and a real doctor ID, the consultation chat opens. If the chat does not load, check the environment was set before render and that the device is online, then say that what it shows on failure is to confirm.
- Closing the consultation calls `onEndFlow`, and it can be opened again.
- Never use `SKChat` and do not call `setIsChatEnabled`. Search the code you wrote for both names, and tell the developer if you find them in code you did not write.
- If you cannot connect or have no real IDs, say that you could not verify the consultation itself.
