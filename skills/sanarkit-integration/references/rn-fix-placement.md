# Fix a misplaced SanarRTC or Sanar component (React Native)

Use this when a diagnosis, the doctor, an SDK warning or the developer says that `SanarRTC` or another Sanar component is in the wrong place, and the developer asked you to fix it.

The developer console has the same rules as a page for people, with a review checklist: [Place the components](https://developer.sanar.sa/docs/react-native/component-placement#review-checklist). Give the developer that link when they want to review the placement themselves or share it with their team. Act on the rules in this file: you do not need to open the page.

## The recommended layout

One `SanarRTC`, at the app root, after the app's content, always mounted, with `enable` tied to the connected flag:

```tsx
// App.tsx (the root component)
<SanarSessionProvider userInfo={userInfo}>     {/* or wherever the app keeps its connected flag */}
  <NavigationContainer>{/* the app's navigators */}</NavigationContainer>
  <SanarCalls />                               {/* the one SanarRTC, with enable={connected} */}
</SanarSessionProvider>
```

Why each part matters:

- **At the root, outside every screen and navigator.** All call state lives inside `SanarRTC`. If its parent unmounts during a call, the call screen is lost.
- **After the app's content.** The call screen then draws above it.
- **In a parent that fills the window.** The call screen fills the area `SanarRTC` is rendered in.
- **Once.** Every mounted `SanarRTC` rings for the same call.
- **Always mounted, switched with `enable`.** `enable` becomes `true` only after `connect` resolved with `status: true`.

## Before you change anything

1. Find every usage, and the root:

   ```sh
   grep -rnE "<SanarRTC|SanarRTC from|SanarKit\.(connect|disconnect)\(" \
     --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
     --exclude-dir=node_modules --exclude-dir=ios --exclude-dir=android .
   ```

   The root is the component registered in `index.js` (`AppRegistry.registerComponent`), or `app/_layout.tsx` in an Expo Router app.

2. Read where the connected flag lives (the state that turns `true` after `connect` succeeds). `SanarRTC` at the root needs it there. If it lives in a screen, it has to move up: see case 1.
3. Tell the developer what you will move, from where to where, and what else changes (for example a flag that moves into a context). Moving `SanarRTC` changes the root of the app, so wait for a yes.
4. Keep the props and callbacks as they are, and do not touch code the move does not need. Two changes are part of the move, so name them in step 3 and make them:
   - `enable` becomes the connected flag, when it was a constant or was set before `connect` succeeded.
   - `connect` and its flag move up, when a screen owned them. Keep the arguments `connect` is called with, the config file the client ID comes from and the environment exactly as the app has them. Change only where the call lives and that its result sets the flag. Remove a `SanarKit.disconnect()` that ran when that screen unmounted, and say so.
5. Everything else you notice (a missing `onError`, the environment, the member mapping, a component that never closes) is a separate finding. Offer it, and change it only on a yes. List what you did not fix in your report.

## SanarRTC cases

### 1. Rendered inside a screen, a tab or a navigator

Before:

```tsx
// screens/HomeScreen.tsx
return (
  <View style={{ flex: 1 }}>
    <HomeContent />
    <SanarRTC enable={connected} onCallStatusChange={onStatus} />
  </View>
);
```

After: remove it from the screen and render it once at the root, after the navigation container.

```tsx
// App.tsx
<NavigationContainer ref={navigationRef}>{/* navigators */}</NavigationContainer>
<SanarCalls />
```

- **The connected flag.** If the screen owned it, move it to where the root can read it: the app's own store or context if it has one, otherwise a small context that holds the flag and runs the app's existing `connect` call. The session provider in the connect reference is the full version of that. It expects a mapped member object and a per-environment config, so when the app has neither, keep the app's own values and take only the flag, the awaited `connect` with its `status` check, and the `catch`. Keep one source of truth, and let the screen read the same flag.
- **Callbacks that navigate.** `useNavigation` does not work outside the navigation container. Use a navigation ref (`createNavigationContainerRef()` passed to `NavigationContainer`'s `ref`) and call `navigationRef.navigate(...)` after checking `navigationRef.isReady()`. In TypeScript, give the ref the app's param list (`createNavigationContainerRef<RootStackParamList>()`) if the app has one.
- **Callbacks that set screen state.** Move that state up with the flag, or keep the handler in the root and pass the result down.

### 2. Rendered more than once

Keep the one at the root (add it if none is there) and delete the others. If the copies had different callbacks, do not drop any behaviour silently: list what each one did, merge it into the single root handler, and ask the developer when two of them conflict.

### 3. Rendered conditionally

Before:

```tsx
{connected && <SanarRTC enable onCallStatusChange={onStatus} />}
{isLoggedIn ? <AppStack /> : <AuthStack />}   // with SanarRTC inside AppStack
```

After: always render it, and let `enable` do the switching.

```tsx
<SanarRTC enable={connected} onCallStatusChange={onStatus} onError={onError} />
```

A `SanarRTC` that mounts and unmounts with a condition loses the call when the condition flips, and a constant `enable` is `true` before `connect` has succeeded.

If the condition was a business rule and not the connected state (for example calls only for some members), do not drop it silently and do not put it into `enable` yourself: `enable={false}` ends the session for every Sanar component. Tell the developer that the rule is gone after the move, and ask how they want it kept.

### 4. Inside a view that does not fill the window

A padded view, a safe-area view, a `ScrollView`, a `KeyboardAvoidingView`, a card, or anything below a header or above a tab bar. A safe-area view can shrink or offset the area enough to crop the call screen. The SDK measures the area when `SanarRTC` mounts and logs the `[SanarKit][Layout]` warning when it starts more than 64 points below the top of the window, or covers less than 95% of its height or less than its full width.

Before:

```tsx
<SafeAreaView style={{ flex: 1 }}>
  <NavigationContainer>{/* navigators */}</NavigationContainer>
  <SanarRTC enable={connected} />
</SafeAreaView>
```

After: make it a sibling of that view, inside a parent that fills the window.

```tsx
<View style={{ flex: 1 }}>
  <SafeAreaView style={{ flex: 1 }}>
    <NavigationContainer>{/* navigators */}</NavigationContainer>
  </SafeAreaView>
  <SanarRTC enable={connected} />
</View>
```

Providers that render no view of their own (context providers, `SafeAreaProvider`) and a `GestureHandlerRootView` with `flex: 1` are fine as parents. If the root returns a fragment, `SanarRTC` can be the last child of the fragment.

### 5. Rendered before the app's content

Move it after the content, as the last child at the root. Nothing else changes.

### 6. Expo Router

The root is `app/_layout.tsx`. Render `SanarRTC` after the root navigator, not in a route file or a nested layout:

```tsx
// app/_layout.tsx
export default function RootLayout() {
  return (
    <SanarSessionProvider userInfo={userInfo}>
      <Stack />
      <SanarCalls />
    </SanarSessionProvider>
  );
}
```

### 7. `enable` is wrong

- **A constant `true`, or set before `connect`:** tie it to the connected flag.
- **Left out or `false` while other Sanar components are in use:** `enable={false}` calls `SanarKit.disconnect()` and ends the session for all of them. Tie it to the connected flag.
- **`connect` runs again while `enable` stays `true`** (for example on a user switch or when the app returns to the foreground): on SDK 3.1.5 and later this is safe, because `SanarRTC` moves to the new connection, so leave it. On 3.1.4 and earlier, set the flag to `false`, call `connect`, and set it to `true` once it resolves with `status: true`. For a different member, still call `SanarKit.disconnect()` first.

### 8. Hidden behind the app's own view

The call screen draws above its siblings. It cannot draw above a React Native `Modal` or a native overlay, because those sit in their own layer above the app. The SDK cannot detect this, and moving `SanarRTC` does not fix it. Tell the developer which view covers the call, and offer to close it when a call arrives: `onCallStatusChange` receives `CALL_INITIATED` when the ringer shows. Ask before you add that, because it changes the app's own behaviour.

## The other components

`SKDashboard`, `SKService`, `SKAppointments`, `SKConsultation` and `ITCBooking` belong in a screen, unlike `SanarRTC`. They cover the view they are rendered in.

| Problem | Fix |
| --- | --- |
| The component fills only part of the screen | Render it directly in the screen's root view (`flex: 1`), not in a `ScrollView`, a card or a padded container |
| It opens once and never again | Set `enable` back to `false` in `onEndFlow` |
| It closes at once | It opened before `connect` succeeded. Open it only when the connected flag is `true` |
| The session ends when the screen closes | Remove `SanarKit.disconnect()` from the screen's unmount. It belongs at sign-out |
| `SKService` shows the old service after `type` changed | Close it first (`enable` to `false`), then open the next one |

## Verify the fix

1. `npx sanarkit-setup --doctor` (SDK 3.1.0 and later) prints "SanarRTC is rendered once" with the file and line that render it, and no Placement warning. Two things the doctor does that affect where you put the code:
   - On SDK 3.1.0 it counts every line that contains `<SanarRTC` in a file that imports it, comments included, so a comment can be reported as a second usage. SDK 3.1.1 ignores comments. If the app stays on 3.1.0, do not write `<SanarRTC` in a comment in that file.
   - It warns for any file under a folder named `screens`, `pages` or `views`. Put a wrapper such as `SanarCalls` outside those folders.
2. The app type-checks and builds. A move at the root does not need a native rebuild. If you cannot type-check or build here, say so, and name the lines you could not compile.
3. If the app can run: with `SanarKit.setDebug(true)`, there is no `[SanarKit][Layout]` or `[SanarKit][RTC]` warning after `enable` becomes `true`, and `SanarKit.diagnose()` reports `sanar_rtc_mounted`, `sanar_rtc_listening` and `sanar_rtc_layout` as `ok`. Remove any temporary debug code afterwards.
4. Report what moved (file and line, before and after), what else changed and why, and what you could not verify. Only a doctor can start a call, so say that the ringer and the call were not tested unless the developer tested them.

Leave the changes uncommitted.
