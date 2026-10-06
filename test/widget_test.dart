import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:letterboxd_launcher/login_screen.dart';

void main() {
  testWidgets('login screen shows fields, buttons, and settings gear',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

    expect(find.text('Username or email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('SIGN IN'), findsOneWidget);
    expect(find.text('CREATE AN ACCOUNT'), findsOneWidget);
    expect(find.byIcon(Icons.settings), findsOneWidget);
  });
}
