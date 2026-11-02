# React Native: environment and connect

Choose the SanarKit environment, keep the client ID out of the source, connect the signed-in member with `SanarKit.connect`, and end the session with `SanarKit.disconnect`. Every Sanar component needs this session.

All the code below is TypeScript. If the app is JavaScript, use the same code without the types and with `.js` file names.

## Ask first

Ask the developer these questions. Do not guess the answers.

1. **Where does the client ID live?** Use the app's existing secret or environment mechanism if it has one. If it has none, create the config file below.
2. **How does the app tell its environments apart?** The default below uses debug builds for `development` and release builds for `production`. If the app has its own environments, use them.
3. **How do the signed-in user's fields map to the SDK's member fields?** See "Member details".
4. **Where is the signed-in user available in the code?** The session provider below must sit under whatever supplies it.

Never ask the developer to paste the client ID into the chat. If they paste it anyway, write it only into the git-ignored config file, and never repeat it in your output.

## Keep the client ID out of the source

The client ID is a per-client secret, and each environment has its own client ID. Never hardcode it in a source file that Git tracks. Never print it, log it, or read it back into the chat. Never print the contents of the config file.

### If the app already has a way to keep secrets

Use it. Common ones are a git-ignored `.env` file read by a library the app already uses, or a native build setting. Do not add a new library for this without asking. Check that the file or setting is ignored by Git, with the commands below. The client ID still ships inside the built app, because it is compiled into the bundle. That is how the SDK works, and it is not a reason to commit it.

### If the app has none: a git-ignored config file

In the steps below, `<path>` is the folder where the config file really lives, for example `src` (write `sanar.config.ts` alone only if the file sits in the folder you run the commands from). Use the real path in every command.

1. Create `<path>/sanar.config.ts` in the app's source folder (next to where the session provider will live). The values are placeholders that the developer fills in:

   ```ts
   // Do not commit this file. It is listed in .gitignore.
   // One client ID per environment, from the Sanar team. Fill both in locally.
   export const SANAR_CONFIG = {
     development: { clientId: '<CLIENT_ID from config>' },
     production: { clientId: '<CLIENT_ID from config>' },
   } as const;
   ```

2. Create `<path>/sanar.config.example.ts` with the same content. This one **is** committed, so a fresh clone knows what to create (`cp <path>/sanar.config.example.ts <path>/sanar.config.ts`).

3. Add the real file to `.gitignore`, at the root of the repository or of the app (check which `.gitignore` files exist). A name without a slash matches the file in any folder, and it does not match the example file:

   ```text
   # SanarKit client IDs (a secret)
   sanar.config.ts
   ```

4. Confirm that it is ignored and not tracked. Run the commands from the repository, with the real path:

   ```sh
   ls <path>/sanar.config.ts
   git check-ignore -v <path>/sanar.config.ts
   git ls-files <path>/sanar.config.ts
   git check-ignore -v <path>/sanar.config.example.ts
   ```

   - `ls` must print the path. If it does not, the path is wrong, and the two `git` checks below prove nothing, so fix the path first.
   - `git check-ignore -v` must print the `.gitignore` rule that matches. No output means the file is not ignored: fix the rule.
   - `git ls-files` must print nothing. An empty answer only counts when `ls` showed that the path is real. If it prints the file name, the file is already tracked: stop and tell the developer, and do not rewrite Git history or untrack files without asking.
   - The last command must print nothing, because the example file is meant to be committed.

5. Tell the developer to replace both placeholders. To check that they are still unfilled without printing the file, use `grep -c "CLIENT_ID from config" <path>/sanar.config.ts`, which prints only a count.

Leave the placeholders in place until the developer has filled them in. The app builds with them, but `connect` is refused or fails, `connected` stays false, and no Sanar component opens. Say that in the report.

Two things the developer should know. The file holds the client IDs of both environments, so both IDs end up in every build that includes it. That is acceptable, because the client ID ships inside the app anyway, but it should be a conscious choice. And because the file is git-ignored, a CI checkout does not have it: the CI job must create `<path>/sanar.config.ts` from its own secret store before it builds.

## Set the environment

`SanarKit.setEnvironment` chooses which Sanar environment the SDK talks to. Call it once, before `connect` and before any component renders. If it is never called, the SDK uses `production`.

```ts
import { SanarKit } from '@maren-sa/react-native-sanarkit';

SanarKit.setEnvironment('development'); // 'production' | 'development'
```

- Choose the environment and the client ID together, from the build configuration, so a build never pairs a production client ID with the development environment or the reverse. Never hardcode `development` in a way that ships in release builds. Tell the developer that release builds need `production` and a production client ID.
- In SDK 3.0.1 the SDK only checks for `production`. Any other value, including `'staging'` (which its type accepts), goes to the development host. Treat `staging` and `development` as the same environment, and do not use `'staging'` to reach a separate staging backend.
- `SKConsultation` also uses the environment to decide where it loads its hosted component from, so set it before you render any component.

## Connect

```ts
connect(cid: string, info: UserInfo, lang?: string): Promise<ConnectResult>;

type ConnectResult = { status: boolean; message: string };
```

| Parameter | Type | Description |
| --- | --- | --- |
| `cid` | `string` | The client ID for the current environment. Always read it from config. |
| `info` | `UserInfo` | The member's details. See "Member details". |
| `lang` | `string` | Optional. The language the SDK asks Sanar to use, sent as the `Accept-Language` header. The default is `'en'`. Which other codes are accepted is **to confirm**, so pass it only if the developer asks for it. |

The SDK also sends the platform (`ios` or `android`) and the app's bundle ID, which it reads from the device. When `connect` succeeds, the SDK keeps the session in memory and opens a real-time connection to Sanar. After a restart of the app, call `connect` again.

### Handle all three outcomes

| Outcome | What you get | What to do |
| --- | --- | --- |
| Success | `{ status: true, message }` | Mark the session as connected and enable the Sanar components |
| Refused | `{ status: false, message }`. The promise does **not** reject | Show or log `message`. Check the client ID, the environment and the member details |
| Failure | The promise rejects | Catch it. It is a network failure, an unreadable answer or a device error |

`SanarKit.connected` is `true` after a successful `connect`. It is a plain property and not React state, so reading it does not re-render a screen. Keep the app's own `connected` state for rendering, as in the provider below.

## Member details (`UserInfo`)

The package does not export a `UserInfo` type from its entry point, so declare one in the app. The SDK does not check the fields. It sends whatever you pass.

| Field | Type | What to send |
| --- | --- | --- |
| `mid` | `string` | The app's own ID for the member |
| `first_name` | `string` | First name |
| `last_name` | `string` | Last name |
| `dob` | `string` | Date of birth as `yyyy-mm-dd` |
| `gender` | `string` | Gender code, such as `'M'` or `'F'` |
| `nationality` | `string` | Nationality, such as `'SAUDI ARABIA'` |
| `document_id` | `string` | The ID document number |
| `document_type` | `number` | The type of ID document. What each value means is **to confirm** |
| `phone_code` | `string` | Country calling code without `+`, such as `'966'` |
| `phone_no` | `string` | Phone number without the country code |
| `maritalStatus` | `string` | `'0'` for unmarried, `'1'` for married |

Rules:

- **Ask which of the app's fields go into which of these.** Never invent personal data. If the app does not hold a field, ask the developer what to send.
- Send all eleven fields. Which fields Sanar's backend requires is **to confirm**.
- Do not log the member object. It holds personal data.

The shape, with **demo data** only. Do not copy these values into the app:

```ts
const demoMember = {
  mid: 'demo-member-001',
  first_name: 'Demo',
  last_name: 'User',
  dob: '1990-01-01',
  gender: 'M',
  nationality: 'SAUDI ARABIA',
  document_id: '1234567890',
  document_type: 1,
  phone_code: '966',
  phone_no: '500000000',
  maritalStatus: '0',
};
```

## The session provider

Connect once the user has signed in. Show a Sanar component only after `connect` has succeeded. Adapt the names and the location to the app, and follow its state-management style (this uses React context, which needs no library).

```tsx
// SanarSession.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { SanarKit } from '@maren-sa/react-native-sanarkit';
import { SANAR_CONFIG } from './sanar.config';

export type SanarUserInfo = {
  mid: string;
  first_name: string;
  last_name: string;
  dob: string; // yyyy-mm-dd
  gender: string; // 'M' or 'F'
  nationality: string;
  document_id: string;
  document_type: number;
  phone_code: string; // without +
  phone_no: string; // without the country code
  maritalStatus: string; // '0' or '1'
};

// Pair the environment and the client ID from the build: debug builds use development, release
// builds use production. Change this if the app has its own environments.
const environment = __DEV__ ? 'development' : 'production';
SanarKit.setEnvironment(environment);

// connect() writes into the SanarKit singleton when it resolves, so two connects must never overlap:
// a late answer for an earlier member would replace the session of the newer one. Every run of the
// provider's effect queues behind the previous one in this chain. It lives at module scope, like
// the singleton it protects, so a provider that unmounts and mounts again (a remount) or a second
// provider still waits for a connect that is running. A hot reload (Fast Refresh) re-runs this
// module and resets the queue, so it can overlap a connect that is running.
let connectQueue: Promise<void> = Promise.resolve();

type SanarSession = { connected: boolean; error: string | null };

const SanarSessionContext = createContext<SanarSession>({ connected: false, error: null });

export function useSanarSession(): SanarSession {
  return useContext(SanarSessionContext);
}

type ProviderProps = {
  // The signed-in member, or null when nobody is signed in.
  userInfo: SanarUserInfo | null;
  children: React.ReactNode;
};

export function SanarSessionProvider({ userInfo, children }: ProviderProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberId = userInfo?.mid;

  useEffect(() => {
    if (!userInfo) return undefined;
    const info: SanarUserInfo = userInfo;
    let active = true;

    connectQueue = connectQueue.then(async () => {
      if (!active) return; // signed out, or another member, while this was waiting: do not connect
      try {
        const { status, message } = await SanarKit.connect(SANAR_CONFIG[environment].clientId, info);
        if (!active) {
          // Signed out, or another member, while connect was running. A newer connect is still
          // queued behind this one, so closing this session cannot clear the newer one.
          SanarKit.disconnect();
          return;
        }
        if (status) {
          setError(null);
          setConnected(true);
        } else {
          // Sanar refused the request. message says why. The promise did not reject.
          setError(String(message));
        }
      } catch {
        // No network, or the answer could not be read.
        if (active) setError('Could not reach Sanar.');
      }
    });

    return () => {
      active = false;
      setConnected(false);
      setError(null);
      // Sign-out, or another member: end the session. Do not call this when a screen unmounts.
      SanarKit.disconnect();
    };
    // Reconnect only when the member changes, not when the object is rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return <SanarSessionContext.Provider value={{ connected, error }}>{children}</SanarSessionContext.Provider>;
}
```

The queue runs connects one at a time, so a `connect` that never settles blocks every later connect, because the SDK's request has no timeout: the member stays disconnected until the app restarts. If the app can hit that, tell the developer, and ask before you add a timeout of your own.

Map the app's user to `SanarUserInfo` in one place, after the developer has confirmed the mapping:

```ts
// toSanarUserInfo.ts
import type { SanarUserInfo } from './SanarSession';

export function toSanarUserInfo(user: AppUser): SanarUserInfo {
  return {
    mid: user.id, // replace every right-hand side with the app field the developer confirmed
    first_name: user.firstName,
    last_name: user.lastName,
    dob: user.birthDate, // yyyy-mm-dd
    gender: user.gender, // 'M' or 'F'
    nationality: user.nationality,
    document_id: user.nationalId,
    document_type: user.documentType, // a number. What each value means is to confirm: ask the developer
    phone_code: user.phoneCode,
    phone_no: user.phoneNumber,
    maritalStatus: user.maritalStatus, // '0' or '1'
  };
}
```

Mount the provider once, under the app's auth state and above its navigation:

```tsx
// App.tsx
export default function App() {
  const { user } = useAuth(); // the app's own signed-in user
  const userInfo = useMemo(() => (user ? toSanarUserInfo(user) : null), [user]);

  return (
    <SanarSessionProvider userInfo={userInfo}>
      <NavigationContainer>{/* the app's navigators */}</NavigationContainer>
    </SanarSessionProvider>
  );
}
```

Screens read the state with `const { connected } = useSanarSession();`.

## Disconnect

```ts
SanarKit.disconnect();
```

`disconnect` closes the real-time connection and clears the session. Call it when the user signs out. The provider above does it.

- Do not call it when a screen unmounts. It ends the session for every Sanar component.
- `connect` does not close an earlier session. Before you connect another member, call `SanarKit.disconnect()` first. The provider above does that when the member changes.
- If the app uses `SanarRTC`, its `enable` prop must follow the app's own `connected` flag. Setting `enable` to `false` calls `SanarKit.disconnect()` too.

## What the components do without a session

| Component | Without a session |
| --- | --- |
| `SKDashboard`, `SKService`, `SKAppointments`, `ITCBooking` | Log "Not connected to Sanar Sarvices!" (the typo is in the SDK) and call `onEndFlow` at once |
| `SanarRTC` | Does nothing and gives no error |
| `SKConsultation` | **To confirm** |

## Verify

- `<path>/sanar.config.ts` exists, is ignored and is untracked (the checks above, run with the real path), and `git diff` and `git status` show no client ID in any tracked or untracked file you added except the git-ignored one.
- The app builds and starts with the placeholders in place. `connect` is refused (`status: false`) or fails (the promise rejects, for example when the answer is not JSON). Either way `connected` stays false and the provider shows an error. This shows the provider reports a failed connect; the credentials need a real client ID to be checked.
- With a real client ID for the right environment, `connect` resolves `{ status: true }` and `connected` becomes `true`. Only the developer can check this. If you cannot, say that you did not verify it.
