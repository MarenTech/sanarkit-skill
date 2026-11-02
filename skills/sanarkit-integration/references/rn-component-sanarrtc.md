# SanarRTC

Real-time video consultations between members and doctors, including the incoming-call ringer. Render it once at the app root.

`SanarRTC` is the **default export** of the package, so import it without braces. It is the real-time video module in `@maren-sa/react-native-sanarkit`, and no separate package install is needed. It renders nothing until a doctor starts a call. Then it shows a full-screen ringer with the doctor's name and Accept and Decline buttons, and after the member accepts, it opens the video call. The member can minimize the call to a small window, drag it to either side of the screen, and tap to expand it.

## Use when

- Members should be able to take video calls from doctors, from any screen in the app.
- The developer wants Sanar's ringer and call screens instead of building their own.
- The developer needs to know when a call starts, ends or is declined, to update the app's own screens (use `onCallStatusChange`).
- Members do not start calls with `SanarRTC`. A doctor starts the call, and `SanarRTC` receives it.

## Prerequisites

- The SDK is installed, and `react-native-agora` is installed (`npx sanarkit-setup`, or the manual steps on pnpm, installs it and removes the old `sanar-rtc`).
- The camera and microphone permissions are added, and on iOS the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`. The native apps were rebuilt. When the ringer appears, the SDK checks for camera and microphone permission, and Bluetooth permission on Android, and asks for any that are missing.
- **Connect first, and enable from the result.** Set `enable` to `true` only after `SanarKit.connect` has succeeded. `SanarRTC` attaches its listeners at the moment `enable` becomes `true`, and only if a session exists then. With no session, nothing is attached, no calls arrive, and there is no error.
- **Mount it once, at the app root,** next to the navigation container, not inside a screen. Its ringer and call view draw above the rest of the app, so they stay available on every screen and across navigation.
- **`enable={false}` ends the Sanar session.** When `enable` is `false`, `SanarRTC` calls `SanarKit.disconnect()`. That closes the real-time connection and clears the session for every Sanar component. It also happens when `SanarRTC` mounts with `enable` left `false`, which is the default. So tie `enable` to the app's own `connected` flag. Never leave `enable` unset or `false` while members use `SKDashboard` or any other component. If it was turned off, call `connect` again before opening them.
- **Always pass both `onCallStatusChange` and `onViewModeChange`, even if they only log.** The SDK sets their defaults with `defaultProps`, which React 19 ignores (React Native 0.78 and later use React 19), and the SDK calls `onViewModeChange` as soon as `SanarRTC` mounts. What happens on those versions when a callback is left out is to confirm.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | No | `false` | Turns the SanarRTC module on or off. Tie it to the app's `connected` flag. `false` calls `SanarKit.disconnect()` |
| `onCallStatusChange` | `function` | No | none | Called when the call status changes. Receives one of `CALL_INITIATED`, `CALL_ACCEPTED`, `CALL_REJECTED`, `CALL_END_USER` or `CALL_END_PROVIDER`, or `'disconnect'` when the socket disconnects. Always pass it: the SDK sets its default with `defaultProps`, which React 19 (React Native 0.78 and later) ignores, so what happens when it is omitted is to confirm |
| `isFullscreen` | `boolean` | No | `false` | Set to `true` to expand a minimized call view to fullscreen. Setting `false` has no effect (to confirm whether minimizing from the host app is intended) |
| `onViewModeChange` | `function` | No | none | Called when the call view changes size. Receives the mode, `'fullscreen'` or `'minimized'`. Always pass it: the SDK sets its default with `defaultProps`, which React 19 (React Native 0.78 and later) ignores, so what happens when it is omitted is to confirm |

## Add it to the app

```tsx
import SanarRTC from '@maren-sa/react-native-sanarkit';
import type { RTCViewStatus } from '@maren-sa/react-native-sanarkit';
```

`RTCViewStatus` is a TypeScript type only. It does not exist at runtime, so import it with `import type`, and never use it as a value. The call status values are plain strings, so compare them with string literals.

### One component, mounted at the root

Create a small component that reads the connected flag, and mount it once, inside the session provider and next to the navigation container.

```tsx
// SanarCalls.tsx
import SanarRTC from '@maren-sa/react-native-sanarkit';
import type { RTCViewStatus } from '@maren-sa/react-native-sanarkit';
import { useSanarSession } from './SanarSession'; // adjust the path

type SanarCallsProps = {
  // Only for a "Return to call" button (see below). Leave both props out otherwise.
  expandCall?: boolean;
  onMinimized?: () => void;
};

export default function SanarCalls({ expandCall = false, onMinimized }: SanarCallsProps) {
  const { connected } = useSanarSession();

  return (
    <SanarRTC
      enable={connected}
      isFullscreen={expandCall}
      onViewModeChange={(mode: RTCViewStatus) => {
        if (mode === 'minimized') onMinimized?.();
      }}
      onCallStatusChange={(status: string) => {
        switch (status) {
          case 'CALL_INITIATED': // a doctor is calling
          case 'CALL_ACCEPTED': // the member accepted
          case 'CALL_REJECTED': // the member declined
          case 'CALL_END_USER': // the member ended the call
          case 'CALL_END_PROVIDER': // the doctor ended the call
          case 'disconnect': // the connection to Sanar closed
            break; // update the app's own state here if the developer asked for it
        }
      }}
    />
  );
}
```

Mount it at the root:

```tsx
// App.tsx
<SanarSessionProvider userInfo={userInfo}>
  <NavigationContainer>{/* the app's navigators */}</NavigationContainer>
  <SanarCalls />
</SanarSessionProvider>
```

For other navigation setups (React Navigation stack or tabs, or none), the rule is the same: one `SanarRTC`, at the root, outside every screen and navigator. Do not place it in a stack screen or a tab.

### Return to call (optional)

Only add this if the developer asks for it. It lets the app expand a call that the member minimized. The flag lives where both the button and the root can reach it. This version keeps it in the root component, so the button must be reachable from there (pass the setter down, or use the app's own state or context):

```tsx
// App.tsx
const [expandCall, setExpandCall] = useState(false);

<SanarSessionProvider userInfo={userInfo}>
  <NavigationContainer>{/* the app's navigators, with the button below somewhere inside */}</NavigationContainer>
  {/* Reset the flag when the member minimizes the call, so that setting it to true again expands it. */}
  <SanarCalls expandCall={expandCall} onMinimized={() => setExpandCall(false)} />
</SanarSessionProvider>

// the button, wherever the member should find it
<Button title="Return to call" onPress={() => setExpandCall(true)} />
```

## Call status values

`onCallStatusChange` receives one of these strings. Handle the ones the developer needs and ignore the rest.

| Value | When it fires |
| --- | --- |
| `CALL_INITIATED` | A doctor started a call and it reached the member's device. The ringer is showing |
| `CALL_ACCEPTED` | The member tapped Accept. The call is connecting |
| `CALL_REJECTED` | The member tapped Decline on the ringer |
| `CALL_END_USER` | The member ended the call |
| `CALL_END_PROVIDER` | The doctor's side ended the call |
| `'disconnect'` | The real-time connection to Sanar closed. Setting `enable` to `false` closes it, so this can fire after `SanarRTC` is turned off |

## The call view and `isFullscreen`

While a call is connected, the member can minimize it with the chat button in the call controls. `onViewModeChange` tells the app which mode the call view is in. It also runs once when `SanarRTC` mounts, with `'fullscreen'`, before any call.

- Setting `isFullscreen` to `true` expands a minimized call. If the call is not minimized, nothing happens.
- Setting `isFullscreen` to `false` has no effect. It does not minimize the call.
- The SDK only reacts when the value changes. If it is already `true` and the member minimizes the call, setting it to `true` again does nothing. Set it to `false`, then `true`.

## Video-call lifecycle

- **App in the foreground, with a Sanar session:** SanarKit handles the whole incoming-call experience. The ringer appears, and when the member accepts, the video call connects. No webhook, backend notification or own call screen is needed.
- **App in the background or closed:** `SanarRTC` cannot ring. Alerting the member is an optional extra that needs a webhook on the developer's backend and the app's own push notification setup. That is outside this integration, so tell the developer if they ask. The SDK keeps the session in memory only, so when the app starts from a notification it must call `connect` again before `enable` becomes `true`.

## Verify

- The app builds on both platforms, with the permissions and the Podfile setup in place, and the native apps were rebuilt.
- `SanarRTC` appears once in the tree, at the root, and its `enable` is the app's `connected` flag and not a constant.
- Both callbacks are passed.
- With a valid client ID, after `connect` succeeds `enable` becomes `true`. A call started by a doctor shows the ringer. Only a doctor can start a call, so you will normally not be able to test this yourself. Say so, and say that you did not verify the ringer or the call.
- After sign-out, `SanarKit.disconnect()` has run and `enable` is `false`.
