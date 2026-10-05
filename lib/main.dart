import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'theme.dart';

void main() => runApp(const LauncherApp());

class LauncherApp extends StatelessWidget {
  const LauncherApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LetterBoxd',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const LoginScreen(),
    );
  }
}
