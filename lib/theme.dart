import 'package:flutter/material.dart';

/// Dark, cinematic palette inspired by movie-log apps.
/// Colors only — the mark in [BrandLogo] is an original design.
class AppColors {
  static const Color background = Color(0xFF14181C);
  static const Color surface = Color(0xFF1C2228);
  static const Color surfaceHigh = Color(0xFF2C3440);
  static const Color border = Color(0xFF3A4450);
  static const Color textPrimary = Color(0xFFF4F6F8);
  static const Color textMuted = Color(0xFF99AABB);

  // Tri-tone accents.
  static const Color accentGreen = Color(0xFF00E054);
  static const Color accentBlue = Color(0xFF40BCF4);
  static const Color accentOrange = Color(0xFFFF8000);
}

ThemeData buildAppTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: base.colorScheme.copyWith(
      primary: AppColors.accentGreen,
      secondary: AppColors.accentBlue,
      surface: AppColors.surface,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceHigh,
      hintStyle: const TextStyle(color: AppColors.textMuted),
      labelStyle: const TextStyle(color: AppColors.textMuted),
      floatingLabelStyle: const TextStyle(
        color: AppColors.accentGreen,
        fontWeight: FontWeight.w600,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppColors.accentGreen, width: 2),
      ),
    ),
  );
}
