/**
 * ============================================================================
 * FILE: frontend/src/components/AutomotiveSeatAssemblyStation.tsx
 * ============================================================================
 * Backward-compatibility proxy for the universal DiscreteAssemblyStation.
 * Provides drop-in compatibility for existing routes, tests, and imports.
 * ============================================================================
 */

import DiscreteAssemblyStation, {
  DiscreteAssemblyProps,
  AutomotiveSeatAssemblyProps
} from './DiscreteAssemblyStation';

export type { DiscreteAssemblyProps, AutomotiveSeatAssemblyProps };
export default DiscreteAssemblyStation;
