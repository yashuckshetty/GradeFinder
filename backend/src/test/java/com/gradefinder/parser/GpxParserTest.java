package com.gradefinder.parser;

import com.gradefinder.exception.InvalidGpxException;
import com.gradefinder.model.RoutePoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link GpxParser}.
 *
 * Coverage:
 *  1. Happy path — well-formed single-track GPX with elevation and timestamps
 *  2. Multiple tracks — only first used, warning surfaced
 *  3. Missing elevation — null preserved (interpolation is ElevationPreprocessor's job)
 *  4. Missing timestamp — null preserved (no crash)
 *  5. No &lt;trk&gt; element — InvalidGpxException("INVALID_GPX")
 *  6. No track points — InvalidGpxException("INVALID_GPX")
 *  7. Invalid lat/lon attributes — points silently dropped
 *  8. Multiple &lt;trkseg&gt; within one track — concatenated in order
 *  9. XXE malicious payload — must throw InvalidGpxException, NOT resolve the entity
 * 10. Route name extraction from &lt;name&gt; child of &lt;trk&gt;
 */
@DisplayName("GpxParser")
class GpxParserTest {

    private GpxParser parser;

    @BeforeEach
    void setUp() {
        parser = new GpxParser();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private InputStream gpx(String body) {
        String full = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<gpx version=\"1.1\" xmlns=\"http://www.topografix.com/GPX/1/1\">"
                + body
                + "</gpx>";
        return new ByteArrayInputStream(full.getBytes(StandardCharsets.UTF_8));
    }

    private InputStream rawStream(String xml) {
        return new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));
    }

    private String trkpt(double lat, double lon, double ele) {
        return "<trkpt lat=\"" + lat + "\" lon=\"" + lon + "\">"
                + "<ele>" + ele + "</ele>"
                + "</trkpt>";
    }

    // ── Test 1: Happy path ───────────────────────────────────────────────────

    @Test
    @DisplayName("Parses well-formed GPX with elevation and timestamps")
    void happyPath_parsesAllFields() {
        InputStream is = gpx(
                "<trk><name>Test Route</name><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>550.0</ele><time>2024-07-01T09:00:00Z</time></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>560.5</ele><time>2024-07-01T09:01:00Z</time></trkpt>"
                + "</trkseg></trk>");

        GpxParser.ParseResult result = parser.parse(is);

        List<RoutePoint> points = result.getPoints();
        assertEquals(2, points.size(), "Expected 2 parsed points");

        RoutePoint p0 = points.get(0);
        assertEquals(47.0, p0.getLat(), 1e-9);
        assertEquals(8.0, p0.getLon(), 1e-9);
        assertEquals(550.0, p0.getElevation(), 1e-9);
        assertEquals("2024-07-01T09:00:00Z", p0.getTimestamp());

        RoutePoint p1 = points.get(1);
        assertEquals(47.001, p1.getLat(), 1e-9);
        assertEquals(560.5, p1.getElevation(), 1e-9);
        assertNotNull(p1.getTimestamp());

        assertEquals("Test Route", result.getRouteName());
        assertTrue(result.getWarnings().isEmpty(), "Expected no warnings");
    }

    // ── Test 2: Multiple tracks ──────────────────────────────────────────────

    @Test
    @DisplayName("Multiple <trk> elements: only first used, warning emitted")
    void multipleTracks_onlyFirstUsed() {
        InputStream is = gpx(
                "<trk><name>Track One</name><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>500</ele></trkpt>"
                + "</trkseg></trk>"
                + "<trk><trkseg>"
                + "<trkpt lat=\"48.0\" lon=\"9.0\"><ele>600</ele></trkpt>"
                + "</trkseg></trk>");

        GpxParser.ParseResult result = parser.parse(is);

        assertEquals(1, result.getPoints().size());
        assertEquals(47.0, result.getPoints().get(0).getLat(), 1e-9);
        assertEquals("Track One", result.getRouteName());
        assertTrue(result.getWarnings().stream()
                .anyMatch(w -> w.contains("Multiple tracks")),
                "Expected a 'Multiple tracks' warning");
    }

    // ── Test 3: Missing elevation ────────────────────────────────────────────

    @Test
    @DisplayName("Track points without <ele> have null elevation (not zero)")
    void missingElevation_nullPreserved() {
        InputStream is = gpx(
                "<trk><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>560</ele></trkpt>"
                + "</trkseg></trk>");

        List<RoutePoint> points = parser.parse(is).getPoints();
        assertEquals(2, points.size());
        assertNull(points.get(0).getElevation(),
                "Expected null elevation for point with no <ele>");
        assertNotNull(points.get(1).getElevation());
    }

    // ── Test 4: Missing timestamp ────────────────────────────────────────────

    @Test
    @DisplayName("Track points without <time> have null timestamp (no crash)")
    void missingTimestamp_nullPreserved() {
        InputStream is = gpx(
                "<trk><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>500</ele></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>505</ele></trkpt>"
                + "</trkseg></trk>");

        List<RoutePoint> points = parser.parse(is).getPoints();
        assertNull(points.get(0).getTimestamp());
    }

    // ── Test 5: No <trk> element ─────────────────────────────────────────────

    @Test
    @DisplayName("GPX with no <trk> throws InvalidGpxException")
    void noTrack_throwsInvalidGpx() {
        InputStream is = gpx("<wpt lat=\"47.0\" lon=\"8.0\"></wpt>");

        InvalidGpxException ex = assertThrows(InvalidGpxException.class,
                () -> parser.parse(is));
        assertEquals("INVALID_GPX", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("trk"),
                "Error message should mention the missing <trk> element");
    }

    // ── Test 6: No track points ──────────────────────────────────────────────

    @Test
    @DisplayName("GPX with <trk> but no <trkpt> throws InvalidGpxException")
    void noTrackPoints_throwsInvalidGpx() {
        InputStream is = gpx("<trk><trkseg></trkseg></trk>");

        InvalidGpxException ex = assertThrows(InvalidGpxException.class,
                () -> parser.parse(is));
        assertEquals("INVALID_GPX", ex.getErrorCode());
    }

    // ── Test 7: Invalid lat/lon attributes ───────────────────────────────────

    @Test
    @DisplayName("Track points with missing or unparseable lat/lon are silently dropped")
    void invalidLatLon_droppedSilently() {
        InputStream is = gpx(
                "<trk><trkseg>"
                + "<trkpt lat=\"not-a-number\" lon=\"8.0\"><ele>500</ele></trkpt>" // bad lat
                + "<trkpt lat=\"\" lon=\"8.0\"><ele>510</ele></trkpt>"              // empty lat
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>520</ele></trkpt>"          // valid
                + "</trkseg></trk>");

        List<RoutePoint> points = parser.parse(is).getPoints();
        // Only the valid point should survive
        assertEquals(1, points.size());
        assertEquals(47.0, points.get(0).getLat(), 1e-9);
    }

    // ── Test 8: Multiple trkseg concatenation ────────────────────────────────

    @Test
    @DisplayName("Multiple <trkseg> within one <trk> are concatenated in order")
    void multipleSegments_concatenated() {
        InputStream is = gpx(
                "<trk><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>500</ele></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>510</ele></trkpt>"
                + "</trkseg><trkseg>"
                + "<trkpt lat=\"47.002\" lon=\"8.002\"><ele>520</ele></trkpt>"
                + "<trkpt lat=\"47.003\" lon=\"8.003\"><ele>530</ele></trkpt>"
                + "</trkseg></trk>");

        List<RoutePoint> points = parser.parse(is).getPoints();
        assertEquals(4, points.size(), "Both segments should be concatenated");
        assertEquals(500.0, points.get(0).getElevation(), 1e-9);
        assertEquals(530.0, points.get(3).getElevation(), 1e-9);
    }

    // ── Test 9: XXE injection — THE SECURITY-CRITICAL TEST ───────────────────

    /**
     * A crafted XXE payload that would, if the parser were vulnerable, cause it
     * to read a local file (or make a network request) and embed its content.
     *
     * <p>The DOCTYPE declares an entity &file; pointing at /etc/passwd (Linux) or
     * a Windows equivalent. A vulnerable parser would expand it; a hardened parser
     * with disallow-doctype-decl=true must throw before any entity expansion occurs.
     *
     * <p>The test verifies that:
     * <ol>
     *   <li>An {@link InvalidGpxException} is thrown (not a silent success or
     *       an unrelated exception type).</li>
     *   <li>The exception message does NOT contain any file content — confirming
     *       the entity was never resolved.</li>
     * </ol>
     */
    @Test
    @DisplayName("XXE malicious payload is rejected with InvalidGpxException (no entity resolution)")
    void xxePayload_isRejectedSecurely() {
        // Crafted malicious GPX with an XXE DOCTYPE declaration.
        // The entity &xxe; would resolve to the content of /etc/passwd if the
        // parser were misconfigured. With disallow-doctype-decl=true, the parser
        // must throw a SAXParseException when it encounters the DOCTYPE line.
        String maliciousXml =
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + "<!DOCTYPE gpx ["
                + "  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">"
                + "]>"
                + "<gpx version=\"1.1\" xmlns=\"http://www.topografix.com/GPX/1/1\">"
                + "  <trk><trkseg>"
                + "    <trkpt lat=\"47.0\" lon=\"8.0\"><ele>&xxe;</ele></trkpt>"
                + "  </trkseg></trk>"
                + "</gpx>";

        InputStream is = rawStream(maliciousXml);

        // Must throw — cannot succeed or throw any other exception type
        InvalidGpxException ex = assertThrows(
                InvalidGpxException.class,
                () -> parser.parse(is),
                "A DOCTYPE-containing GPX must be rejected with InvalidGpxException");

        assertEquals("INVALID_GPX", ex.getErrorCode(),
                "Error code must be INVALID_GPX");

        // Confirm the exception message does not contain file content.
        // If it did, the entity was resolved — which is the vulnerability.
        String msg = ex.getMessage();
        assertFalse(msg.contains("root:"),
                "Exception message must NOT contain /etc/passwd content (entity was NOT resolved)");
        assertFalse(msg.contains("/bin/bash"),
                "Exception message must NOT contain shell paths from /etc/passwd");

        System.out.println("[XXE Test] Parser correctly rejected DOCTYPE. Exception: " + msg);
    }

    // ── Test 10: Route name extraction ───────────────────────────────────────

    @Test
    @DisplayName("Route name is extracted from <name> child of <trk>")
    void routeName_extractedCorrectly() {
        InputStream is = gpx(
                "<trk><name>My Alpine Route</name><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>500</ele></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>510</ele></trkpt>"
                + "</trkseg></trk>");

        GpxParser.ParseResult result = parser.parse(is);
        assertEquals("My Alpine Route", result.getRouteName());
    }

    @Test
    @DisplayName("Route name is null when no <name> element present")
    void routeName_nullWhenAbsent() {
        InputStream is = gpx(
                "<trk><trkseg>"
                + "<trkpt lat=\"47.0\" lon=\"8.0\"><ele>500</ele></trkpt>"
                + "<trkpt lat=\"47.001\" lon=\"8.001\"><ele>510</ele></trkpt>"
                + "</trkseg></trk>");

        GpxParser.ParseResult result = parser.parse(is);
        assertNull(result.getRouteName());
    }
}
