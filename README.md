# TV Launcher — login UI POC

A small Flutter app that demonstrates a smart-TV sign-in screen: username +
password fields, a **Sign In** and a **Create an account** button, a dark
cinematic theme, and an original tri-tone emblem. On submit it POSTs the
credentials to a backend endpoint you supply, or runs in local mock mode if
none is set.

## One-time scaffold

The Dart source (`lib/`, `pubspec.yaml`) is already here. Generate the
platform folders and fetch packages:

```bash
flutter create . --platforms web,ios,android   # keeps existing lib/ and pubspec
flutter pub get
```

## Run

Local mock mode (no network, good for showing the UI):

```bash
flutter run -d chrome
```

Posting to your own backend:

```bash
flutter run -d chrome --dart-define=LOGIN_ENDPOINT=https://your-backend.example/login
```

The app sends `{"username": "...", "password": "..."}` as JSON and treats any
2xx response as success. Point `LOGIN_ENDPOINT` at a backend you control — for
the demo, a tiny local server works well.

## Notes

- **Branding:** the colors are a generic dark palette and the emblem in
  `lib/widgets/brand_logo.dart` is an original design, not any company's
  trademarked logo. Drop in your own licensed brand asset before showing this
  to real users.
- **Auth pattern:** for a production TV integration you'd typically use a
  device-code / OAuth flow (the TV shows a code, the user approves on their
  phone) rather than typing a password on the TV. This POC uses a direct form
  for simplicity.
