import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';

/// An original emblem for the demo: three overlapping tri-tone discs
/// enclosed in a rounded "card" shape. This is a custom design, not a
/// reproduction of any company's trademarked logo. Swap in your own
/// licensed brand asset before showing this to real users.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 64, this.showWordmark = true});

  final double size;
  final bool showWordmark;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomPaint(
          size: Size(size * 3.8, size),
          painter: _DiscPainter(),
        ),
        if (showWordmark) ...[
          const SizedBox(height: 16),
          Text(
            'LetterBoxd',
            style: GoogleFonts.archivo(
              color: AppColors.textPrimary,
              fontSize: size * 0.42,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              height: 1.0,
            ),
          ),
        ],
      ],
    );
  }
}

class _DiscPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Three evenly spaced, non-overlapping discs.
    final r = size.height / 2;
    final overlap = r * 0.35; // how much adjacent discs overlap
    final step = r * 2 - overlap; // distance between centers
    final cy = size.height / 2;
    final cx = size.width / 2;
    final centers = [
      Offset(cx - step, cy),
      Offset(cx, cy),
      Offset(cx + step, cy),
    ];
    final colors = [
      AppColors.accentOrange,
      AppColors.accentGreen,
      AppColors.accentBlue,
    ];
    final paint = Paint()..style = PaintingStyle.fill;
    for (var i = 0; i < 3; i++) {
      paint.color = colors[i];
      canvas.drawCircle(centers[i], r, paint);
    }

    // Paint the overlap (intersection) of each adjacent pair white.
    final white = Paint()
      ..style = PaintingStyle.fill
      ..color = Colors.white;
    for (var i = 0; i < centers.length - 1; i++) {
      final a = Path()..addOval(Rect.fromCircle(center: centers[i], radius: r));
      final b =
          Path()..addOval(Rect.fromCircle(center: centers[i + 1], radius: r));
      final lens = Path.combine(PathOperation.intersect, a, b);
      canvas.drawPath(lens, white);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
