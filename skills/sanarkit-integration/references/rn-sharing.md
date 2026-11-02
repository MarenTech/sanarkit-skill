# React Native: sharing a link

Share a link from the app's own screens with `shareUrl`, and know how SanarKit screens ask the SDK to open the share sheet. `shareUrl` was added in SDK 3.0.0.

Use this file only when the developer wants to share a link from their own screens. SanarKit's own screens share links without any code from you.

## What it does

`shareUrl` opens the native share sheet, on iOS and on Android, with a link in it. It shares a link. It does not download a file or attach one. A member who wants to share a report, for example, shares the address of that report.

It is a named export of the package. It does not need a Sanar session, so it works on any screen, even before `connect`.

## Share a link from the app

```tsx
import { Alert, Button } from 'react-native';
import { shareUrl } from '@maren-sa/react-native-sanarkit';

export default function ShareReportButton() {
  async function onPress() {
    try {
      const result = await shareUrl({
        url: 'https://example.com/report', // required
        message: 'Your report', // optional
        title: 'Report', // optional
      });
      console.log('Share sheet result:', result.action);
    } catch (error) {
      const { code } = error as { code?: string };
      if (code === 'INVALID_INPUT') {
        Alert.alert('There is no link to share.');
      } else {
        Alert.alert('The share sheet could not open.');
      }
    }
  }

  return <Button title="Share report" onPress={onPress} />;
}
```

Put the button where the developer asked, and use the app's own button, text and alert components. The link in the example is a placeholder. Take the real link from the data the screen already has, and never invent one.

## Parameters

`shareUrl` takes one object:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | The link to share. It must be a non-empty string. Spaces around it are removed |
| `message` | `string` | No | Text to share with the link |
| `title` | `string` | No | A title for the share sheet |

On iOS the link goes in the native URL field of the share sheet, and the message goes alongside it. On Android the link is added to the end of the message, on its own line, because the Android share sheet has no separate link field.

## Result and errors

`shareUrl` returns a promise. It resolves with React Native's own share result, which says whether the member shared the link or closed the share sheet. It rejects with an `Error` that has a `code`:

| `code` | When |
| --- | --- |
| `INVALID_INPUT` | `url` is missing, is not a string, or is empty after trimming. The message is "A valid URL is required" |
| `SHARE_FAILED` | The native share sheet failed and gave no code of its own. If the native error has a code, `shareUrl` passes that code on |

Always wrap `shareUrl` in `try`/`catch`, or add `.catch`, so a failure is not an unhandled promise rejection.

## Sharing from Sanar screens

No code is needed for this. When a page inside `SKDashboard`, `SKService`, `SKAppointments` or `ITCBooking` wants to share a link, such as a report, it sends the app a message, and the SDK calls `shareUrl` with the message's `url` and uses its `filename` as the `title`.

- Only these four components handle share messages. `SKConsultation` and `SanarRTC` do not.
- If sharing fails, the SDK logs `SanarKit: unable to share URL` with an error code and carries on. It does not crash and does not call `onEndFlow`.

## Verify

- The app builds, and the share button opens the system share sheet on a device or simulator. A simulator may offer few share targets, so say what you could and could not check.
- A call with an empty `url` rejects with `INVALID_INPUT` and the app shows its fallback message.
- You do not need a Sanar client ID or a connected session for this check.
