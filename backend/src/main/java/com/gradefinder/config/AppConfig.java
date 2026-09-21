package com.gradefinder.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds all gradefinder.analysis.* and gradefinder.validation.* properties
 * from application.yml. Every algorithm threshold lives here — never hardcoded
 * in algorithm classes.
 */
@Configuration
@ConfigurationProperties(prefix = "gradefinder")
public class AppConfig {

    private final AnalysisConfig analysis = new AnalysisConfig();
    private final ValidationConfig validation = new ValidationConfig();

    public AnalysisConfig getAnalysis() { return analysis; }
    public ValidationConfig getValidation() { return validation; }

    public static class AnalysisConfig {
        private double descentTolerance = 3.0;
        private double minSignificantGain = 20.0;
        private double minSignificantGrade = 1.5;
        private int smoothingWindow = 5;
        private int renderPointThreshold = 2000;
        private double ascentTolerance = 3.0;

        public double getDescentTolerance() { return descentTolerance; }
        public void setDescentTolerance(double v) { this.descentTolerance = v; }

        public double getMinSignificantGain() { return minSignificantGain; }
        public void setMinSignificantGain(double v) { this.minSignificantGain = v; }

        public double getMinSignificantGrade() { return minSignificantGrade; }
        public void setMinSignificantGrade(double v) { this.minSignificantGrade = v; }

        public int getSmoothingWindow() { return smoothingWindow; }
        public void setSmoothingWindow(int v) { this.smoothingWindow = v; }

        public int getRenderPointThreshold() { return renderPointThreshold; }
        public void setRenderPointThreshold(int v) { this.renderPointThreshold = v; }

        public double getAscentTolerance() { return ascentTolerance; }
        public void setAscentTolerance(double v) { this.ascentTolerance = v; }
    }

    public static class ValidationConfig {
        private int maxPointCount = 50000;
        private long maxFileSizeBytes = 10485760L;
        private double minElevation = -500.0;
        private double maxElevation = 9000.0;
        private double minStepDistance = 0.5;

        public int getMaxPointCount() { return maxPointCount; }
        public void setMaxPointCount(int v) { this.maxPointCount = v; }

        public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
        public void setMaxFileSizeBytes(long v) { this.maxFileSizeBytes = v; }

        public double getMinElevation() { return minElevation; }
        public void setMinElevation(double v) { this.minElevation = v; }

        public double getMaxElevation() { return maxElevation; }
        public void setMaxElevation(double v) { this.maxElevation = v; }

        public double getMinStepDistance() { return minStepDistance; }
        public void setMinStepDistance(double v) { this.minStepDistance = v; }
    }
}
