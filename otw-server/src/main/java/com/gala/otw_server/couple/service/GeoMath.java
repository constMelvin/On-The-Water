package com.gala.otw_server.couple.service;

/** Plain great-circle maths for the Halfway Checker. */
public final class GeoMath {

    private static final double EARTH_KM = 6371.0088;

    private GeoMath() {}

    /** Straight-line (great-circle) distance in kilometres. */
    public static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dp = p2 - p1;
        double dl = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    /** The point halfway along the great circle between two places: {lat, lng}. */
    public static double[] midpoint(double lat1, double lng1, double lat2, double lng2) {
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double l1 = Math.toRadians(lng1);
        double dl = Math.toRadians(lng2 - lng1);
        double bx = Math.cos(p2) * Math.cos(dl);
        double by = Math.cos(p2) * Math.sin(dl);
        double pm = Math.atan2(Math.sin(p1) + Math.sin(p2), Math.sqrt((Math.cos(p1) + bx) * (Math.cos(p1) + bx) + by * by));
        double lm = l1 + Math.atan2(by, Math.cos(p1) + bx);
        double lngOut = ((Math.toDegrees(lm) + 540) % 360) - 180;
        return new double[]{Math.toDegrees(pm), lngOut};
    }

    /** Rounds to 2 decimals (display distance). */
    public static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
