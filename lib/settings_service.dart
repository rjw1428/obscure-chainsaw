import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists app settings locally via SharedPreferences.
///
/// The login endpoint defaults to the compile-time `LOGIN_ENDPOINT`
/// (set with `--dart-define`) the first time the app runs, and can then be
/// overridden at runtime from the settings screen. The stored value wins
/// once set.
class SettingsService extends ChangeNotifier {
  SettingsService._();
  static final SettingsService instance = SettingsService._();

  static const _kEndpointKey = 'login_endpoint';
  static const _compileTimeDefault =
      String.fromEnvironment('LOGIN_ENDPOINT', defaultValue: '');

  SharedPreferences? _prefs;
  String _endpoint = _compileTimeDefault;

  /// Current endpoint the login form should post to. Empty means mock mode.
  String get endpoint => _endpoint;

  /// Must be called once at startup before reading [endpoint].
  Future<void> load() async {
    _prefs = await SharedPreferences.getInstance();
    _endpoint = _prefs?.getString(_kEndpointKey) ?? _compileTimeDefault;
    notifyListeners();
  }

  /// Update and persist the endpoint. Takes effect immediately for callers
  /// that read [endpoint] at submit time.
  Future<void> setEndpoint(String value) async {
    _endpoint = value.trim();
    notifyListeners();
    await _prefs?.setString(_kEndpointKey, _endpoint);
  }
}
