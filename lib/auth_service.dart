import 'dart:convert';
import 'package:http/http.dart' as http;

/// Result of a login attempt.
class AuthResult {
  const AuthResult({required this.ok, required this.message, this.statusCode});
  final bool ok;
  final String message;
  final int? statusCode;
}

/// Posts credentials to a backend endpoint supplied at build/run time via
/// `--dart-define=LOGIN_ENDPOINT=https://your-backend.example/login`.
///
/// This is the standard "app posts to its own backend" pattern. Point it at
/// a backend you control (e.g. a local mock server for the demo). It does not
/// talk to any third party by default; if unset, it runs in local mock mode.
class AuthService {
  AuthService({String? endpoint})
      : endpoint = endpoint ??
            const String.fromEnvironment('LOGIN_ENDPOINT', defaultValue: '');

  final String endpoint;

  bool get isMockMode => endpoint.isEmpty;

  Future<AuthResult> signIn({
    required String username,
    required String password,
  }) async {
    if (isMockMode) {
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (username.isEmpty || password.isEmpty) {
        return const AuthResult(ok: false, message: 'Enter a username and password.');
      }
      return AuthResult(
        ok: true,
        message: 'Mock sign-in OK for "$username" (no endpoint configured).',
      );
    }

    try {
      final resp = await http
          .post(
            Uri.parse(endpoint),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'username': username, 'password': password}),
          )
          .timeout(const Duration(seconds: 15));

      final ok = resp.statusCode >= 200 && resp.statusCode < 300;
      return AuthResult(
        ok: ok,
        statusCode: resp.statusCode,
        message: ok
            ? 'Signed in (HTTP ${resp.statusCode}).'
            : 'Sign-in failed (HTTP ${resp.statusCode}).',
      );
    } catch (e) {
      return AuthResult(ok: false, message: 'Network error: $e');
    }
  }
}
