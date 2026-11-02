# SanarKit integration skill

An [Agent Skill](https://agentskills.io/specification) that lets an AI coding agent add the SanarKit SDK to your app and put a Sanar component on screen. It covers three separate SDKs: React Native, iOS and Android.

The skill is one folder, `skills/sanarkit-integration/`:

- `SKILL.md` holds the workflow and the rules the agent follows.
- `references/` holds the exact steps, code and API tables for each SDK. The agent reads only the files for your SDK, and only when it needs them.

## What the agent does

- Works out whether your app is React Native, iOS or Android, and asks if it cannot tell (for example in a monorepo with several apps).
- Checks whether SanarKit is already installed. If the installed version is older than the version the skill covers, it asks before upgrading.
- Installs the SDK and adds the camera and microphone permissions.
- Calls `setEnvironment` and `connect`, with the client ID read from your app's own git-ignored config, and adds the component you choose to your navigation.
- Builds the app, fixes errors the integration caused, and reports the files it changed and the values you still have to fill in.

What it will not do: hardcode, commit or print your client ID, change code the integration does not need, upgrade your framework or dependencies without asking, or make up member details.

## Install

This skill works with agents that support the Agent Skills format (`SKILL.md`). Check your agent's documentation for how it loads skills.

1. Get the repository:

   ```sh
   git clone https://github.com/MarenTech/sanarkit-skill.git
   ```

2. Copy the whole `skills/sanarkit-integration/` folder into your agent's skills folder. Copy the folder, not only `SKILL.md`: the files in `references/` hold the steps the agent follows. The folder name must stay `sanarkit-integration`.

3. Restart or reload your agent, or ask for the skill by name in your prompt.

## Example prompts

Full dashboard:

> Use the sanarkit-integration skill to integrate SanarKit into this app and show the dashboard on the home screen.

A single service, in a React Native app:

> Use the sanarkit-integration skill to add a Lab tests button to the home screen that opens the Laboratory service with SKService.

Video calls, in a React Native app:

> Use the sanarkit-integration skill to add Sanar video calls with SanarRTC to this app, so members can receive and answer calls from any screen.

An iOS or Android app:

> Use the sanarkit-integration skill to add the SanarKit dashboard to the home screen of this app.

Keep your client ID out of the chat. The agent asks where your config lives, and leaves a placeholder in a git-ignored file for you to fill in.

## SDK versions covered

| SDK | Version the references were written against |
| --- | --- |
| React Native | `@maren-sa/react-native-sanarkit` 3.0.1, for React Native 0.71 to 0.81 (0.68 to 0.70 use SanarKit 2.1.x). It targets React Native's legacy architecture |
| iOS | The SanarKit Swift Package, tag 2.1.1 (iOS 17.5 or later, Xcode 16.4 or later) |
| Android | The SanarKit `.aar`, version 2.1.1 |

The Web SDK is not covered. When an SDK releases a new version, update its references together with the developer docs.

## Validate the skill

```sh
npm install
npm test
```

The tests need Node.js 21 or newer: the `test` script passes a glob pattern to `node --test`.

The tests check the Agent Skills format (the name matches the folder, the description length, `SKILL.md` under 500 lines), that every reference link resolves and references do not link to each other, that the references cover exactly the components in the developer portal's SDK inventory, and that no client ID is written into the repo.

The coverage tests read the portal's SDK inventory, a JSON file named `sdk-inventory.json` in the portal's `src/data/` folder. Set the `SANARKIT_INVENTORY` environment variable to its path to point the tests at your copy. If the inventory file is not found, the two coverage tests (components and props) are skipped with a message, and the other tests still run.
