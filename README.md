# SanarKit integration skill

An [Agent Skill](https://agentskills.io/specification) that lets an AI coding agent add the SanarKit SDK to your app and put a Sanar component on screen. It can also check an integration you already have, report what is wrong with the fix, and move a misplaced component to where it works. It covers three separate SDKs: React Native, iOS and Android.

The skill is one folder, `skills/sanarkit-integration/`:

- `SKILL.md` holds the workflow and the rules the agent follows.
- `references/` holds the exact steps, code and API tables for each SDK. The agent reads only the files for your SDK, and only when it needs them.

## What the agent does

- Works out whether your app is React Native, iOS or Android, and asks if it cannot tell (for example in a monorepo with several apps).
- Checks whether SanarKit is already installed. If the installed version is older than the version the skill covers, it asks before upgrading.
- Installs the SDK and adds the camera and microphone permissions.
- Calls `setEnvironment` and `connect`, with the client ID read from your app's own git-ignored config, and adds the component you choose to your navigation.
- On React Native, runs SanarKit's read-only project check (`npx sanarkit-setup --doctor`, from SDK 3.1.0) and fixes what the integration caused.
- Builds the app, fixes errors the integration caused, and reports the files it changed and the values you still have to fill in.

### Check an existing integration

Ask the agent to diagnose your SanarKit setup. It changes nothing until you have seen its report.

- On React Native it runs the read-only `npx sanarkit-setup --doctor` (SDK 3.1.0 and later), which checks versions, peer dependencies, the iOS and Android permission setup and where `SanarRTC` is rendered.
- It reviews your code for what that command cannot see: when `connect` runs, where `SanarRTC` is rendered and what its `enable` is tied to, how each component is opened and closed, and where the client ID lives.
- If you agree, it checks the running app with `SanarKit.diagnose()` and the SDK's `[SanarKit]` console logs, and removes its temporary code afterwards.
- On iOS and Android, which have no doctor command, it checks the same areas from the SDK's references.
- It reports each finding with its evidence and fix, what passed, and what it could not check, such as a real incoming call. Then it asks which findings to fix.

### Fix a misplaced component

On React Native, `SanarRTC` must be rendered once, at the app root, after your app's content, with `enable` tied to your connected flag. If it is inside a screen, rendered twice, rendered conditionally, or inside a padded or safe-area view, the agent tells you what it will move and where, waits for your yes, makes the smallest change, and checks the result with the doctor.

What it will not do: hardcode, commit or print your client ID, change code the integration does not need, upgrade your framework or dependencies without asking, or make up member details.

## Install

This skill works with agents that support the Agent Skills format (`SKILL.md`).

### With npx (recommended)

Run this from the root of your app:

```sh
npx skills add MarenTech/sanarkit-skill
```

The command downloads this repository and asks which of your coding agents to install the skill for. It then puts the whole `sanarkit-integration` folder, with `SKILL.md` and `references/`, into that agent's skills folder inside your project. It needs Node.js 22.20 or later.

| Option | What it does |
| --- | --- |
| `-g` | Installs for your user account (every project) instead of this project only |
| `-a <agent>` | Installs for the agent you name, for example `-a claude-code`, and does not ask |
| `-y` | Skips the confirmation prompts |
| `--list` | Shows the skills in this repository and installs nothing |

For example, without any prompt:

```sh
npx skills add MarenTech/sanarkit-skill --skill sanarkit-integration -a claude-code -y
```

To get a newer version later, run `npx skills update`. `npx skills list` shows what is installed and where.

[`skills`](https://github.com/vercel-labs/skills) is an open-source command-line tool for Agent Skills. Sanar does not make it. It collects anonymous usage data, which you can turn off with `DISABLE_TELEMETRY=1`.

### By hand

Use this if you cannot run `npx`, or if the command does not know your agent. Check your agent's documentation for where it loads skills from.

1. Get the repository:

   ```sh
   git clone https://github.com/MarenTech/sanarkit-skill.git
   ```

2. Copy the whole `skills/sanarkit-integration/` folder into your agent's skills folder. Copy the folder, not only `SKILL.md`: the files in `references/` hold the steps the agent follows. The folder name must stay `sanarkit-integration`.

### After you install

Restart or reload your agent, or ask for the skill by name in your prompt.

## Example prompts

Full dashboard:

> Use the sanarkit-integration skill to integrate SanarKit into this app and show the dashboard on the home screen.

A single service, in a React Native app:

> Use the sanarkit-integration skill to add a Lab tests button to the home screen that opens the Laboratory service with SKService.

Video calls, in a React Native app:

> Use the sanarkit-integration skill to add Sanar video calls with SanarRTC to this app, so members can receive and answer calls from any screen.

Check a setup you already have:

> Use the sanarkit-integration skill to diagnose the SanarKit setup in this app. Do not change anything yet. Report what is wrong and how to fix it.

Debug a problem:

> Use the sanarkit-integration skill to find out why the incoming-call ringer shows but no call screen appears after the member accepts.

Fix a misplaced component:

> Use the sanarkit-integration skill to check where SanarRTC is rendered in this app and move it to the recommended place.

An iOS or Android app:

> Use the sanarkit-integration skill to add the SanarKit dashboard to the home screen of this app.

Keep your client ID out of the chat. The agent asks where your config lives, and leaves a placeholder in a git-ignored file for you to fill in.

## SDK versions covered

| SDK | Version the references were written against |
| --- | --- |
| React Native | `@maren-sa/react-native-sanarkit` 3.1.0, for React Native 0.71 to 0.81 (0.68 to 0.70 use SanarKit 2.1.x). It targets React Native's legacy architecture |
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
