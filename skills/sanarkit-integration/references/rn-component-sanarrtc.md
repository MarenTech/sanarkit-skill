# SanarRTC

Real-time video consultations between members and doctors, including the incoming-call ringer. Render it once at the app root.

`SanarRTC` is the **default export** of the package, so import it without braces. It is the real-time video module in `@maren-sa/react-native-sanarkit`, and no separate package install is needed. It renders nothing until a doctor starts a call. Then it shows a full-screen ringer with the doctor's name and photo and Accept and Decline buttons, and after the member accepts, it shows "Connecting" and then the call. The call is a video call or an audio-only call, as the doctor started it. The member can minimize a video call to a small window, drag it to any corner of the screen, and tap to expand it. If an accepted call cannot be connected, the member sees a "Call could not be connected" screen with a Close button, and the app is told through `onError` (SDK 3.1.0 and later).

## Use when

- Members should be able to take video calls from doctors, from any screen in the app.
- The developer wants Sanar's ringer and call screens instead of building their own.
- The developer needs to know when a call starts, ends, is declined or fails, to update the app's own screens (use `onCallStatusChange` and `onError`).
- Members do not start calls with `SanarRTC`. A doctor starts the call, and `SanarRTC` receives it.

## Prerequisites

- The SDK is installed, and `react-native-agora` is installed (`npx sanarkit-setup`, or the manual steps on pnpm, installs it and removes the old `sanar-rtc`).
- The camera and microphone permissions are added, and on iOS the `Podfile` calls `setup_permissions` with `'Camera'` and `'Microphone'`. The native apps were rebuilt. When the ringer appears, the SDK asks for the microphone permission (and Bluetooth on Android 12 and later, which never blocks a call). The camera permission is asked for when the member turns the camera on in the call controls.
- **Connect first, and enable from the result.** Set `enable` to `true` only after `SanarKit.connect` has succeeded. `SanarRTC` attaches its listeners at the moment `enable` becomes `true`, and only if a session exists then. With no session, nothing is attached and no calls arrive. The SDK logs a warning, and `SanarKit.diagnose()` reports it, but no callback runs.
- **Mount it once, at the app root,** after the app's content (for example after the navigation container), not inside a screen. Its ringer and call view draw above the rest of the app, so they stay available on every screen and across navigation. See "Placement" below for what goes wrong elsewhere.
- **`enable={false}` ends the Sanar session.** When `enable` is `false`, `SanarRTC` calls `SanarKit.disconnect()`. That closes the real-time connection and clears the session for every Sanar component. It also happens when `SanarRTC` mounts with `enable` left `false`, which is the default. So tie `enable` to the app's own `connected` flag. Never leave `enable` unset or `false` while members use `SKDashboard` or any other component. If it was turned off, call `connect` again before opening them.
- **Callbacks.** In SDK 3.1.0 every callback is optional, and a callback that throws is caught and reported. Still pass `onCallStatusChange` and `onError`, so the app hears about calls and failures. Pass `onViewModeChange` only if the app uses it. If the developer keeps SDK 3.0.1 or earlier, always pass both `onCallStatusChange` and `onViewModeChange`, even if they only log: on React 19 (React Native 0.78 and later) those versions do not get their default callbacks.
- The app has a `connected` flag from the connect step (`useSanarSession()` from the session provider in `rn-connect.md`, or the app's own).

## Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `enable` | `boolean` | No | `false` | Turns the SanarRTC module on or off. Tie it to the app's `connected` flag. `false` calls `SanarKit.disconnect()` |
| `onCallStatusChange` | `function` | No | none | Called when the call status changes. Receives one of `CALL_INITIATED`, `CALL_ACCEPTED`, `CALL_REJECTED`, `CALL_END_USER`, `CALL_END_PROVIDER` or `CALL_FAILED`, or `'disconnect'` when the socket disconnects. Optional from 3.1.0, but pass it |
| `isFullscreen` | `boolean` | No | `false` | Set to `true` to expand a minimized call view to fullscreen. Setting `false` has no effect: the member minimizes the call with the call controls |
| `onViewModeChange` | `function` | No | none | Called when the call view changes size. Receives the mode, `'fullscreen'` or `'minimized'`. Optional from 3.1.0 |
| `onError` | `function` | No | none | Since 3.1.0. Called when an accepted call fails, with `{ stage, code?, message }`. See "Call failures" below. Pass it |

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
          case 'CALL_END_USER': // the member ended the call; keep the session, do not disconnect here
          case 'CALL_END_PROVIDER': // the doctor ended the call; keep the session, do not disconnect here
          case 'CALL_FAILED': // an accepted call could not be connected, or dropped; onError has the details
          case 'disconnect': // the connection to Sanar closed; not an error, so log it and show the member nothing
            break; // update the app's own state here if the developer asked for it
        }
      }}
      onError={(error: { stage: string; code?: number; message: string }) => {
        // Report it the way the app reports its other errors (its logger or crash reporter).
        console.warn('Sanar call failed:', error.stage, error.code, error.message);
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

### Placement

All call state lives inside `SanarRTC`, and its call screen fills the area `SanarRTC` is rendered in. Each of these placements loses the call, shows it twice or crops it, and SDK 3.1.0 logs a warning for each one it can detect:

- **Inside a screen, a conditional branch or a component that remounts.** An unmount during a call loses the call screen.
- **More than one `SanarRTC`.** Every instance rings for the same call, and they share one call engine.
- **`enable` set before `connect` resolves, or set to `false` during a call.** To reconnect, set `enable` to `false` first (this closes the SanarKit connection), call `connect`, then set `enable` to `true` once it resolves with `status: true`. On SDK 3.1.5 and later, calling `connect` again while `enable` stays `true` also works: `SanarRTC` moves to the new connection and the old one is closed, so setting `enable` to `false` first is not required. On 3.1.4 and earlier it left `SanarRTC` listening on the old connection, so new calls did not ring, and the `enable` round trip is required.
- **Inside a container that does not fill the screen** (a padded view, a card, a screen below a header or above a tab bar). The call screen is cropped or offset. `SanarRTC` measures its area when it mounts and logs a `[SanarKit][Layout]` warning with the measured size and position.

The call screen draws above its siblings (`zIndex` 999 and, on Android, `elevation` 999). The SDK cannot detect a view drawn on top of it from elsewhere in the tree, such as the app's own `Modal` or a native overlay. If the developer reports that a call is hidden behind something, look at what the app renders after or above `SanarRTC`.

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
| `CALL_FAILED` | Since 3.1.0. An accepted call could not be connected, or its connection failed during the call. The member sees the failure screen, and `onError` receives the details |
| `'disconnect'` | Not a call status, and not an error: do not show members an error for it. The real-time connection to Sanar closed, so calls cannot arrive until it is open again. The app closes it with `SanarKit.disconnect()` or with `enable={false}` (then it stays closed), or the network dropped (then it reconnects by itself). Seen right after `CALL_END_USER` or `CALL_END_PROVIDER`, suspect that the app ended the session when the call ended, and confirm it from the logs and the code: see "An error, or `'disconnect'`, right after a call ends" in the troubleshooting reference |

## Call failures (`onError`)

Since 3.1.0. `onError` receives `{ stage, code?, message }` when an accepted call fails. The member sees "Call could not be connected" (or "Call disconnected" if it drops during the call) with a Close button, the SDK tries to end the call for the doctor, and `onCallStatusChange` receives `CALL_FAILED`. The app does not need its own failure screen.

| `stage` | Meaning |
| --- | --- |
| `payload` | The incoming call is missing its provider ID, token or room name |
| `engine_init` | The call engine (Agora) could not be started. `code` is the Agora error code when there is one |
| `join` | Agora rejected the join request. `code` is the Agora error code when there is one |
| `connection` | Agora reported a failed connection, before or during the call, for example an invalid or expired token. `code` is Agora's reason |
| `timeout` | The call did not connect within 30 seconds of accepting. The `message` says which side: "Could not join the call within 30 seconds" (the member's device did not reach the call servers, which a company proxy, a VPN or a firewall on its network can cause), or "Joined the call, but the doctor did not join within 30 seconds" |
| `callback` | One of the app's own `SanarRTC` callbacks threw. The SDK catches it and the call continues, with no `CALL_FAILED` |

The types `SanarRTCError` and `SanarRTCErrorStage` are in `@maren-sa/react-native-sanarkit/lib/Types`. They are not exported from the package root, so the example above writes the shape inline. A `payload`, `join` or `connection` failure usually comes from the call Sanar sent, not from the app: report the stage, code and message to the developer for the Sanar team.

## SDK logs and diagnostics

Since 3.1.0. Use these while integrating, and offer them to the developer for production evidence. Do not add a logger or a diagnostics screen unasked.

- **`SanarKit.setDebug(__DEV__)`**, called once at startup next to `setEnvironment`, prints the SDK's debug logs to the console. Warnings and errors are printed without it. The lines start with `[SanarKit][RTC]` (call lifecycle and placement warnings), `[SanarKit][Agora]`, `[SanarKit][Socket]` (the messaging connection, with the reason when it closes), `[SanarKit][SDK]` (for example `Disconnected from SanarKit` when `SanarKit.disconnect()` runs), `[SanarKit][Permissions]`, `[SanarKit][Layout]` and `[SanarKit][Diagnose]`.
- **`SanarKit.setLogger(fn)`** receives every log entry, `{ level, tag, message, data?, timestamp }`, whatever `setDebug` is set to, so the app can forward them to its crash reporter. Pass `null` to remove it. The SDK leaves the call token, the session token and the Agora app ID out of its entries. Messages from Agora and from the app's own callbacks are passed on as they are.
- **`await SanarKit.diagnose()`** checks the running app without prompting for anything: the session, the messaging socket, that `SanarRTC` is mounted once, is listening and covers the screen, and the permission status. It logs each finding and returns `{ ok, errors, warnings, checks: [{ id, status, message, fix? }], timestamp }`. With `setDebug(true)` called before `SanarRTC` is enabled, it runs by itself about 3 seconds after `SanarRTC` is first enabled.

Neither the logs nor `diagnose()` can check the call token or the developer's backend. A call that fails for those reasons reports it through `onError`.

## The call view and `isFullscreen`

While a video call is connected, the member can minimize it with the chat button in the call controls. An audio call has no chat button. `onViewModeChange` tells the app which mode the call view is in. It also runs once when `SanarRTC` mounts, with `'fullscreen'`, before any call.

- Setting `isFullscreen` to `true` expands a minimized call. If the call is not minimized, nothing happens.
- Setting `isFullscreen` to `false` has no effect. It does not minimize the call.
- The SDK only reacts when the value changes. If it is already `true` and the member minimizes the call, setting it to `true` again does nothing. Set it to `false`, then `true`.

## Video-call lifecycle

- **App in the foreground, with a Sanar session:** SanarKit handles the whole incoming-call experience. The ringer appears, and when the member accepts, the video call connects. No webhook, backend notification or own call screen is needed.
- **App in the background or closed:** `SanarRTC` cannot ring while the app is suspended or closed. Alerting the member is an optional extra that needs a webhook on the developer's backend and the app's own push notification setup. That is outside this integration, so tell the developer if they ask. The SDK keeps the session in memory only, so when the app starts from a notification it must call `connect` again before `enable` becomes `true`.
- **App opened from a call notification (SDK 3.1.5 and later):** no app code is needed. A call the Sanar connection delivers before `SanarRTC` is listening (a cold start, or `connect` running again when the app returns to the foreground) is held for up to 60 seconds and rings once `SanarRTC` is enabled and listening. A held call is dropped when the member signs out (`disconnect`), when it was received for another user than the one now connected, or when the doctor ends it. **Do not add a notification handler that calls `SanarKit.handleIncomingCall`.** That method is an optional hand-off for a future option: its payload needs the recipient's `uid`, and it rings only for that connected user. Leave it unused unless the Sanar team asks for it. A call sent only while the app was suspended is not received, and whether the Sanar service sends a still-ringing call again after the app reconnects is outside the SDK.

## Verify

- The app builds on both platforms, with the permissions and the Podfile setup in place, and the native apps were rebuilt.
- `SanarRTC` appears once in the tree, at the root, and its `enable` is the app's `connected` flag and not a constant.
- `onCallStatusChange` and `onError` are passed, and `CALL_FAILED` is handled or deliberately ignored.
- `npx sanarkit-setup --doctor` reports `SanarRTC` rendered once, and no error. With `SanarKit.setDebug(true)`, the console shows no `[SanarKit][RTC]` or `[SanarKit][Layout]` warning after `enable` becomes `true`.
- With a valid client ID, after `connect` succeeds `enable` becomes `true`. A call started by a doctor shows the ringer. Only a doctor can start a call, so you will normally not be able to test this yourself. Say so, and say that you did not verify the ringer or the call.
- After a call ends, the session stays: nothing calls `SanarKit.disconnect()` or sets `enable` to `false`, and the app shows no error.
- After sign-out, `SanarKit.disconnect()` has run and `enable` is `false`.
