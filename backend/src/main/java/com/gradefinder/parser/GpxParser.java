package com.gradefinder.parser;

import com.gradefinder.exception.InvalidGpxException;
import com.gradefinder.model.RoutePoint;
import org.w3c.dom.*;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Hardened GPX parser that extracts track points from the first &lt;trk&gt; element.
 * <p>
 * Security: disables external entity resolution, DOCTYPE processing, and
 * external general/parameter entities to prevent XXE injection. This is
 * verified by an explicit test using a malicious XXE payload.
 * <p>
 * Concatenates all &lt;trkseg&gt; segments within the first &lt;trk&gt; in
 * document order. If multiple &lt;trk&gt; elements exist, a warning is added.
 */
public class GpxParser {

    /**
     * Parse a GPX input stream into a list of RoutePoints.
     *
     * @param inputStream the GPX file content
     * @return result containing parsed points and any warnings
     * @throws InvalidGpxException if the file is malformed, contains XXE, or
     *         has no track points
     */
    public ParseResult parse(InputStream inputStream) {
        List<String> warnings = new ArrayList<>();

        Document doc = parseXmlSecurely(inputStream);

        // Find all <trk> elements
        NodeList tracks = doc.getElementsByTagName("trk");
        if (tracks.getLength() == 0) {
            throw new InvalidGpxException("INVALID_GPX",
                    "No <trk> element found in the GPX file.");
        }

        if (tracks.getLength() > 1) {
            warnings.add("Multiple tracks found; only the first was analyzed.");
        }

        Element firstTrack = (Element) tracks.item(0);

        // Extract route name if present
        String routeName = null;
        NodeList nameNodes = firstTrack.getElementsByTagName("name");
        if (nameNodes.getLength() > 0) {
            routeName = nameNodes.item(0).getTextContent().trim();
        }

        // Concatenate all <trkseg> segments within the first track
        NodeList segments = firstTrack.getElementsByTagName("trkseg");
        List<RoutePoint> points = new ArrayList<>();

        for (int s = 0; s < segments.getLength(); s++) {
            Element segment = (Element) segments.item(s);
            NodeList trkpts = segment.getElementsByTagName("trkpt");

            for (int p = 0; p < trkpts.getLength(); p++) {
                Element trkpt = (Element) trkpts.item(p);
                RoutePoint point = parseTrkpt(trkpt);
                if (point != null) {
                    points.add(point);
                }
            }
        }

        if (points.isEmpty()) {
            throw new InvalidGpxException("INVALID_GPX",
                    "No track points found in the GPX file.");
        }

        return new ParseResult(points, routeName, warnings);
    }

    /**
     * Parse an individual &lt;trkpt&gt; element.
     * Returns null if the point has invalid lat/lon attributes (these are
     * dropped with a warning logged, not propagated as errors).
     */
    private RoutePoint parseTrkpt(Element trkpt) {
        String latStr = trkpt.getAttribute("lat");
        String lonStr = trkpt.getAttribute("lon");

        if (latStr.isEmpty() || lonStr.isEmpty()) {
            return null; // drop points without coordinates
        }

        double lat, lon;
        try {
            lat = Double.parseDouble(latStr);
            lon = Double.parseDouble(lonStr);
        } catch (NumberFormatException e) {
            return null; // drop points with unparseable coordinates
        }

        // Elevation: nullable
        Double elevation = null;
        NodeList eleNodes = trkpt.getElementsByTagName("ele");
        if (eleNodes.getLength() > 0) {
            String eleText = eleNodes.item(0).getTextContent().trim();
            if (!eleText.isEmpty()) {
                try {
                    elevation = Double.parseDouble(eleText);
                } catch (NumberFormatException e) {
                    // Unparseable elevation treated as missing — will be interpolated
                    elevation = null;
                }
            }
        }

        // Timestamp: nullable, stored as raw string
        String timestamp = null;
        NodeList timeNodes = trkpt.getElementsByTagName("time");
        if (timeNodes.getLength() > 0) {
            String timeText = timeNodes.item(0).getTextContent().trim();
            if (!timeText.isEmpty()) {
                timestamp = timeText;
            }
        }

        return new RoutePoint(lat, lon, elevation, timestamp);
    }

    /**
     * Parse XML with all XXE-prevention measures enabled.
     * This is the security-critical method — the features set here are mandatory.
     */
    private Document parseXmlSecurely(InputStream inputStream) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

            // --- XXE Prevention (OWASP recommendations) ---
            // Disallow DOCTYPE declarations entirely — this blocks all entity attacks
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);

            // Secure processing mode — additional XML parser hardening
            factory.setFeature("http://javax.xml.XMLConstants/feature/secure-processing", true);

            // Disable external general entities
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);

            // Disable external parameter entities
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);

            // Disable external DTDs
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);

            // Prevent XInclude processing
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(inputStream);

        } catch (ParserConfigurationException e) {
            throw new InvalidGpxException("INVALID_GPX",
                    "XML parser configuration error.", e);
        } catch (SAXException e) {
            throw new InvalidGpxException("INVALID_GPX",
                    "Invalid or malformed XML in the GPX file: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new InvalidGpxException("INVALID_GPX",
                    "Unable to read the GPX file.", e);
        }
    }

    /**
     * Encapsulates the parse result: points, optional route name, and any warnings.
     */
    public static class ParseResult {
        private final List<RoutePoint> points;
        private final String routeName;
        private final List<String> warnings;

        public ParseResult(List<RoutePoint> points, String routeName, List<String> warnings) {
            this.points = points;
            this.routeName = routeName;
            this.warnings = warnings;
        }

        public List<RoutePoint> getPoints() { return points; }
        public String getRouteName() { return routeName; }
        public List<String> getWarnings() { return warnings; }
    }
}
