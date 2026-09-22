import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';

interface PurposefulLoadingProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const STEPS = [
  { id: 1, label: 'Reading your route', timeMs: 450 },
  { id: 2, label: 'Mapping the elevation', timeMs: 900 },
  { id: 3, label: 'Finding the real climb', timeMs: 1350 },
  { id: 4, label: 'Building the terrain', timeMs: 1800 },
];

export const PurposefulLoading: React.FC<PurposefulLoadingProps> = ({
  onComplete,
  minDurationMs = 1800,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  useEffect(() => {
    const t1 = setTimeout(() => setCurrentStep(2), 450);
    const t2 = setTimeout(() => setCurrentStep(3), 900);
    const t3 = setTimeout(() => setCurrentStep(4), 1350);
    const tFinal = setTimeout(() => {
      if (onComplete) onComplete();
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tFinal);
    };
  }, [minDurationMs, onComplete]);

  return (
    <div className="purposeful-loading" role="status" aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
        <BrandLogo size={40} animated={true} showWordmark={false} />
      </div>

      {STEPS.map((step) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <div
            key={step.id}
            className={`loading-step-row ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="step-indicator">
              {isCompleted && (
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--color-background)',
                  }}
                />
              )}
            </div>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PurposefulLoading;
